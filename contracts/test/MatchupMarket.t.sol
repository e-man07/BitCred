// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MatchupMarket} from "../src/MatchupMarket.sol";

contract MatchupMarketTest is Test {
    MatchupMarket market;

    address owner = address(this);
    address resolver = address(0xBEEF);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA401);

    bytes32 constant BTC_MKT = keccak256("btc-market");
    bytes32 constant ETH_MKT = keccak256("eth-market");

    uint256 windowId;

    function setUp() public {
        market = new MatchupMarket(resolver);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);

        windowId = block.timestamp + 5 minutes;
        market.openWindow(windowId, BTC_MKT, ETH_MKT);
    }

    function _pick(address user, MatchupMarket.Side side, uint256 amount) internal {
        vm.prank(user);
        market.pick{value: amount}(windowId, side);
    }

    function _warpToExpiry() internal {
        vm.warp(windowId);
    }

    function _settle(bool btcUp, bool ethUp) internal {
        vm.prank(resolver);
        market.settle(windowId, btcUp, ethUp);
    }

    // ---------- openWindow ----------

    function test_openWindow_rejectsPastExpiry() public {
        vm.expectRevert(bytes("ALREADY_EXPIRED"));
        market.openWindow(block.timestamp - 1, BTC_MKT, ETH_MKT);
    }

    function test_openWindow_rejectsDuplicate() public {
        vm.expectRevert(bytes("WINDOW_EXISTS"));
        market.openWindow(windowId, BTC_MKT, ETH_MKT);
    }

    function test_openWindow_onlyOperator() public {
        vm.prank(alice);
        vm.expectRevert(bytes("NOT_OPERATOR"));
        market.openWindow(block.timestamp + 10 minutes, BTC_MKT, ETH_MKT);
    }

    // ---------- pick ----------

    function test_pick_rejectsBothSides() public {
        _pick(alice, MatchupMarket.Side.BTC, 1 ether);
        vm.prank(alice);
        vm.expectRevert(bytes("ALREADY_ON_OTHER_SIDE"));
        market.pick{value: 1 ether}(windowId, MatchupMarket.Side.ETH);
    }

    function test_pick_allowsAddingToSameSide() public {
        _pick(alice, MatchupMarket.Side.BTC, 1 ether);
        _pick(alice, MatchupMarket.Side.BTC, 2 ether);
        assertEq(market.stakeBTC(windowId, alice), 3 ether);
    }

    function test_pick_rejectsAfterLock() public {
        vm.warp(windowId - market.LOCK_BUFFER());
        vm.prank(alice);
        vm.expectRevert(bytes("PICKS_LOCKED"));
        market.pick{value: 1 ether}(windowId, MatchupMarket.Side.BTC);
    }

    function test_pick_rejectsZero() public {
        vm.prank(alice);
        vm.expectRevert(bytes("ZERO_STAKE"));
        market.pick{value: 0}(windowId, MatchupMarket.Side.BTC);
    }

    // ---------- settle: BTC win ----------

    function test_settle_btcWin_payout() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        _pick(bob, MatchupMarket.Side.ETH, 10 ether);
        _warpToExpiry();
        _settle(true, false);

        MatchupMarket.Window memory w = market.getWindow(windowId);
        assertTrue(w.status == MatchupMarket.Status.SETTLED);
        assertTrue(w.winner == MatchupMarket.Side.BTC);

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        market.claim(windowId);
        assertEq(alice.balance - balBefore, 20 ether);
    }

    function test_settle_ethWin_payout() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        _pick(bob, MatchupMarket.Side.ETH, 30 ether);
        _warpToExpiry();
        _settle(false, true);

        uint256 balBefore = bob.balance;
        vm.prank(bob);
        market.claim(windowId);
        assertEq(bob.balance - balBefore, 40 ether);
    }

    function test_settle_proportionalSplit_multipleWinners() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        _pick(bob, MatchupMarket.Side.BTC, 30 ether); // BTC pot = 40
        _pick(carol, MatchupMarket.Side.ETH, 20 ether); // ETH pot = 20 (losing)
        _warpToExpiry();
        _settle(true, false);

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        market.claim(windowId);
        // alice: 10 + 10*20/40 = 15
        assertEq(alice.balance - aliceBefore, 15 ether);

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        market.claim(windowId);
        // bob: 30 + 30*20/40 = 45
        assertEq(bob.balance - bobBefore, 45 ether);

        // loser cannot claim
        vm.prank(carol);
        vm.expectRevert(bytes("NOTHING_TO_CLAIM"));
        market.claim(windowId);
    }

    // ---------- draws ----------

    function test_settle_bothUp_isDraw_refund() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        _pick(bob, MatchupMarket.Side.ETH, 15 ether);
        _warpToExpiry();
        _settle(true, true);

        MatchupMarket.Window memory w = market.getWindow(windowId);
        assertTrue(w.status == MatchupMarket.Status.DRAW);

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        market.claim(windowId);
        assertEq(alice.balance - aliceBefore, 10 ether);

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        market.claim(windowId);
        assertEq(bob.balance - bobBefore, 15 ether);
    }

    function test_settle_bothDown_isDraw_refund() public {
        _pick(alice, MatchupMarket.Side.BTC, 5 ether);
        _pick(bob, MatchupMarket.Side.ETH, 7 ether);
        _warpToExpiry();
        _settle(false, false);

        MatchupMarket.Window memory w = market.getWindow(windowId);
        assertTrue(w.status == MatchupMarket.Status.DRAW);
    }

    function test_settle_oneSidedPot_forcesRefundEvenIfDecisive() public {
        // only BTC has stakes; outcome resolves decisively BTC-wins
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        _warpToExpiry();
        _settle(true, false); // decisive BTC win, but ETH pot is empty

        MatchupMarket.Window memory w = market.getWindow(windowId);
        assertTrue(w.status == MatchupMarket.Status.DRAW, "must force refund, no counterparty");

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        market.claim(windowId);
        assertEq(alice.balance - aliceBefore, 10 ether);
    }

    function test_settle_emptyWindow_noOp() public {
        _warpToExpiry();
        _settle(true, false);
        MatchupMarket.Window memory w = market.getWindow(windowId);
        assertTrue(w.status == MatchupMarket.Status.DRAW);
    }

    // ---------- claim guards ----------

    function test_claim_doubleClaimReverts() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        _pick(bob, MatchupMarket.Side.ETH, 10 ether);
        _warpToExpiry();
        _settle(true, false);

        vm.prank(alice);
        market.claim(windowId);

        vm.prank(alice);
        vm.expectRevert(bytes("ALREADY_CLAIMED"));
        market.claim(windowId);
    }

    function test_claim_beforeSettleReverts() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        vm.prank(alice);
        vm.expectRevert(bytes("NOT_RESOLVED"));
        market.claim(windowId);
    }

    function test_settle_beforeExpiryReverts() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        vm.prank(resolver);
        vm.expectRevert(bytes("TOO_EARLY"));
        market.settle(windowId, true, false);
    }

    function test_settle_onlyResolver() public {
        _warpToExpiry();
        vm.prank(alice);
        vm.expectRevert(bytes("NOT_RESOLVER"));
        market.settle(windowId, true, false);
    }

    function test_settle_alreadyResolvedReverts() public {
        _warpToExpiry();
        _settle(true, false);
        vm.prank(resolver);
        vm.expectRevert(bytes("ALREADY_RESOLVED"));
        market.settle(windowId, false, true);
    }

    // ---------- stuck resolver refund path ----------

    function test_refundStuckWindow_beforeGraceReverts() public {
        _warpToExpiry();
        vm.expectRevert(bytes("NOT_STUCK_YET"));
        market.refundStuckWindow(windowId);
    }

    function test_refundStuckWindow_afterGrace_anyoneCanTrigger() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        _pick(bob, MatchupMarket.Side.ETH, 10 ether);
        vm.warp(windowId + market.GRACE_PERIOD());

        vm.prank(carol); // anyone, not just resolver/owner
        market.refundStuckWindow(windowId);

        MatchupMarket.Window memory w = market.getWindow(windowId);
        assertTrue(w.status == MatchupMarket.Status.DRAW);

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        market.claim(windowId);
        assertEq(alice.balance - aliceBefore, 10 ether);
    }

    function test_refundStuckWindow_afterSettleReverts() public {
        _warpToExpiry();
        _settle(true, false);
        vm.warp(windowId + market.GRACE_PERIOD());
        vm.expectRevert(bytes("ALREADY_RESOLVED"));
        market.refundStuckWindow(windowId);
    }

    // ---------- reentrancy / claimable view ----------

    function test_claimable_matchesActualPayout() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        _pick(bob, MatchupMarket.Side.ETH, 20 ether);
        _warpToExpiry();
        _settle(true, false);

        uint256 predicted = market.claimable(windowId, alice);
        uint256 before = alice.balance;
        vm.prank(alice);
        market.claim(windowId);
        assertEq(alice.balance - before, predicted);
    }

    function test_claimable_zeroAfterClaim() public {
        _pick(alice, MatchupMarket.Side.BTC, 10 ether);
        _pick(bob, MatchupMarket.Side.ETH, 20 ether);
        _warpToExpiry();
        _settle(true, false);

        vm.prank(alice);
        market.claim(windowId);
        assertEq(market.claimable(windowId, alice), 0);
    }
}
