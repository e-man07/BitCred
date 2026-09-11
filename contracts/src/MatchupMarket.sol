// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MatchupMarket
/// @notice Parimutuel BTC-vs-ETH matchup betting, settled entirely from DreamDEX
///         Event Contract resolutions. BTC wins if the BTC Event Contract
///         resolves UP and the ETH one does not; ETH wins on the reverse; if
///         both resolve the same direction, the window is a draw and everyone
///         is refunded their exact stake.
/// @dev Design notes (deliberate simplifications over a literal 1:1 spec read):
///      - `windowId` IS the DreamDEX window's shared expiry timestamp (unix
///        seconds). BTC and ETH Event Contract windows share a clock on
///        DreamDEX, so the expiry is already a natural, collision-free,
///        auditable key — no separate counter needed.
///      - `openWindow` / `settle` are restricted to `owner`/`resolver` (an
///        off-chain keeper), not fully permissionless — an attacker could
///        otherwise front-run a real window with garbage DreamDEX market ids
///        and grief the game. `pick` and `claim` remain open to anyone.
///      - Dust from integer-division truncation on a decisive settlement is
///        left unclaimed in the contract rather than routed to the "last"
///        claimer — simpler, and the amounts are negligible.
contract MatchupMarket {
    enum Side {
        BTC,
        ETH
    }

    enum Status {
        OPEN, // accepting picks / awaiting settlement
        SETTLED, // decisive: one side won
        DRAW // refund path: same-direction resolution, one-sided pot, empty window, or stuck-resolver timeout
    }

    struct Window {
        uint256 id; // == expiresAt, the shared DreamDEX window close
        uint64 opensAt;
        uint64 locksAt; // picks close (expiresAt - LOCK_BUFFER)
        uint64 expiresAt; // DreamDEX window close
        Status status;
        Side winner; // meaningful only when status == SETTLED
        uint256 potBTC;
        uint256 potETH;
        bool btcUp;
        bool ethUp;
        bytes32 btcMarketId; // DreamDEX BTC Event Contract marketId, for audit
        bytes32 ethMarketId; // DreamDEX ETH Event Contract marketId, for audit
    }

    /// @notice Seconds before a window's expiry that picks stop being accepted.
    uint64 public constant LOCK_BUFFER = 30;

    /// @notice Grace period after expiry before anyone may force-refund a
    ///         window whose resolver never called `settle` (stuck-resolver path).
    uint64 public constant GRACE_PERIOD = 30 minutes;

    address public owner;
    address public resolver;

    mapping(uint256 => Window) public windows;
    mapping(uint256 => mapping(address => uint256)) public stakeBTC;
    mapping(uint256 => mapping(address => uint256)) public stakeETH;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event WindowOpened(
        uint256 indexed windowId,
        uint64 opensAt,
        uint64 locksAt,
        uint64 expiresAt,
        bytes32 btcMarketId,
        bytes32 ethMarketId
    );
    event Picked(uint256 indexed windowId, address indexed user, Side side, uint256 amount);
    event Settled(uint256 indexed windowId, bool btcUp, bool ethUp, Status status, Side winner);
    event WindowVoided(uint256 indexed windowId, string reason);
    event Claimed(uint256 indexed windowId, address indexed user, uint256 amount);
    event Refunded(uint256 indexed windowId, address indexed user, uint256 amount);
    event ResolverUpdated(address indexed newResolver);
    event OwnerUpdated(address indexed newOwner);

    uint256 private _reentrancyLock = 1;

    modifier nonReentrant() {
        require(_reentrancyLock == 1, "REENTRANT");
        _reentrancyLock = 2;
        _;
        _reentrancyLock = 1;
    }

    modifier onlyOperator() {
        require(msg.sender == owner || msg.sender == resolver, "NOT_OPERATOR");
        _;
    }

    modifier onlyResolver() {
        require(msg.sender == resolver, "NOT_RESOLVER");
        _;
    }

    constructor(address _resolver) {
        owner = msg.sender;
        resolver = _resolver;
        emit OwnerUpdated(msg.sender);
        emit ResolverUpdated(_resolver);
    }

    function setOwner(address newOwner) external {
        require(msg.sender == owner, "NOT_OWNER");
        require(newOwner != address(0), "ZERO_ADDR");
        owner = newOwner;
        emit OwnerUpdated(newOwner);
    }

    function setResolver(address newResolver) external {
        require(msg.sender == owner, "NOT_OWNER");
        resolver = newResolver;
        emit ResolverUpdated(newResolver);
    }

    /// @notice Open a new matchup window bound to a specific DreamDEX BTC
    ///         market and ETH market. `expiresAt` must be the shared expiry
    ///         both DreamDEX markets settle at.
    function openWindow(uint256 expiresAt, bytes32 btcMarketId, bytes32 ethMarketId) external onlyOperator {
        require(expiresAt > block.timestamp, "ALREADY_EXPIRED");
        require(windows[expiresAt].expiresAt == 0, "WINDOW_EXISTS");
        // forge-lint: disable-next-line(unsafe-typecast)
        require(expiresAt <= type(uint64).max, "EXPIRY_OVERFLOW");

        uint64 locksAt =
            expiresAt > LOCK_BUFFER ? uint64(expiresAt - LOCK_BUFFER) : uint64(expiresAt);

        windows[expiresAt] = Window({
            id: expiresAt,
            opensAt: uint64(block.timestamp),
            locksAt: locksAt,
            expiresAt: uint64(expiresAt),
            status: Status.OPEN,
            winner: Side.BTC,
            potBTC: 0,
            potETH: 0,
            btcUp: false,
            ethUp: false,
            btcMarketId: btcMarketId,
            ethMarketId: ethMarketId
        });

        emit WindowOpened(expiresAt, uint64(block.timestamp), locksAt, uint64(expiresAt), btcMarketId, ethMarketId);
    }

    /// @notice Stake native currency on a side of a window. A user may add to
    ///         the same side more than once, but may never hold stake on both
    ///         sides of the same window.
    function pick(uint256 windowId, Side side) external payable {
        Window storage w = windows[windowId];
        require(w.expiresAt != 0, "NO_WINDOW");
        require(w.status == Status.OPEN, "NOT_OPEN");
        require(block.timestamp < w.locksAt, "PICKS_LOCKED");
        require(msg.value > 0, "ZERO_STAKE");

        if (side == Side.BTC) {
            require(stakeETH[windowId][msg.sender] == 0, "ALREADY_ON_OTHER_SIDE");
            stakeBTC[windowId][msg.sender] += msg.value;
            w.potBTC += msg.value;
        } else {
            require(stakeBTC[windowId][msg.sender] == 0, "ALREADY_ON_OTHER_SIDE");
            stakeETH[windowId][msg.sender] += msg.value;
            w.potETH += msg.value;
        }

        emit Picked(windowId, msg.sender, side, msg.value);
    }

    /// @notice Resolver-only. Feed both DreamDEX Event Contract outcomes in.
    ///         Draw (same direction) or a one-sided/empty pot both resolve to
    ///         the refund path — see contract-level docs for why.
    function settle(uint256 windowId, bool btcUp, bool ethUp) external onlyResolver {
        Window storage w = windows[windowId];
        require(w.expiresAt != 0, "NO_WINDOW");
        require(w.status == Status.OPEN, "ALREADY_RESOLVED");
        require(block.timestamp >= w.expiresAt, "TOO_EARLY");

        w.btcUp = btcUp;
        w.ethUp = ethUp;

        if (w.potBTC == 0 || w.potETH == 0 || btcUp == ethUp) {
            w.status = Status.DRAW;
            emit Settled(windowId, btcUp, ethUp, Status.DRAW, Side.BTC);
        } else {
            w.winner = btcUp ? Side.BTC : Side.ETH;
            w.status = Status.SETTLED;
            emit Settled(windowId, btcUp, ethUp, Status.SETTLED, w.winner);
        }
    }

    /// @notice Permissionless escape hatch: if the resolver never calls
    ///         `settle` within GRACE_PERIOD after expiry, anyone can force
    ///         the window into the refund path so funds are never strandable.
    function refundStuckWindow(uint256 windowId) external {
        Window storage w = windows[windowId];
        require(w.expiresAt != 0, "NO_WINDOW");
        require(w.status == Status.OPEN, "ALREADY_RESOLVED");
        require(block.timestamp >= uint256(w.expiresAt) + GRACE_PERIOD, "NOT_STUCK_YET");

        w.status = Status.DRAW;
        emit WindowVoided(windowId, "resolver-timeout");
        emit Settled(windowId, w.btcUp, w.ethUp, Status.DRAW, Side.BTC);
    }

    /// @notice Claim winnings (SETTLED) or a full refund (DRAW). Guarded
    ///         against double-claims and reentrancy; state is written before
    ///         the external call.
    function claim(uint256 windowId) external nonReentrant {
        Window storage w = windows[windowId];
        require(w.expiresAt != 0, "NO_WINDOW");
        require(w.status == Status.SETTLED || w.status == Status.DRAW, "NOT_RESOLVED");
        require(!claimed[windowId][msg.sender], "ALREADY_CLAIMED");

        uint256 payout;

        if (w.status == Status.DRAW) {
            payout = stakeBTC[windowId][msg.sender] + stakeETH[windowId][msg.sender];
            require(payout > 0, "NOTHING_TO_CLAIM");
            claimed[windowId][msg.sender] = true;
            emit Refunded(windowId, msg.sender, payout);
        } else {
            bool userIsBTC = w.winner == Side.BTC;
            uint256 myStake = userIsBTC ? stakeBTC[windowId][msg.sender] : stakeETH[windowId][msg.sender];
            require(myStake > 0, "NOTHING_TO_CLAIM");

            uint256 winningPot = userIsBTC ? w.potBTC : w.potETH;
            uint256 losingPot = userIsBTC ? w.potETH : w.potBTC;

            claimed[windowId][msg.sender] = true;
            payout = myStake + (myStake * losingPot) / winningPot;
            emit Claimed(windowId, msg.sender, payout);
        }

        (bool ok,) = msg.sender.call{value: payout}("");
        require(ok, "TRANSFER_FAILED");
    }

    /// @notice Struct-shaped read, since the auto-generated mapping getter's
    ///         positional tuple is easy to miscount at the call site.
    function getWindow(uint256 windowId) external view returns (Window memory) {
        return windows[windowId];
    }

    /// @notice Convenience view for the frontend: a user's claimable amount
    ///         for a window, 0 if none or already claimed.
    function claimable(uint256 windowId, address user) external view returns (uint256) {
        Window storage w = windows[windowId];
        if (w.expiresAt == 0) return 0;
        if (claimed[windowId][user]) return 0;

        if (w.status == Status.DRAW) {
            return stakeBTC[windowId][user] + stakeETH[windowId][user];
        } else if (w.status == Status.SETTLED) {
            bool userIsBTC = w.winner == Side.BTC;
            uint256 myStake = userIsBTC ? stakeBTC[windowId][user] : stakeETH[windowId][user];
            if (myStake == 0) return 0;
            uint256 winningPot = userIsBTC ? w.potBTC : w.potETH;
            uint256 losingPot = userIsBTC ? w.potETH : w.potBTC;
            return myStake + (myStake * losingPot) / winningPot;
        }
        return 0;
    }
}
