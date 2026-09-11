# Matchup — BTC vs ETH, settled by DreamDEX Event Contracts

A head-to-head prediction game built for the Somnia × DreamDEX Event Contracts
Hackathon. Pick a cadence (5m / 15m / 1h), pick BTC or ETH, winner takes both
pots. Settlement comes **entirely** from DreamDEX Event Contract resolutions —
remove DreamDEX and the product cannot resolve. That is the integration
story.

**Repo:** https://github.com/e-man07/matchup-btc-eth
**Live app:** https://web-nine-puce-31.vercel.app
**Live testnet contract:** [`0x219eE4A6A83E7D9238e43e568720da2b5e5eC1c2`](https://shannon-explorer.somnia.network/address/0x219eE4A6A83E7D9238e43e568720da2b5e5eC1c2) on Somnia Shannon (chain `50312`)

---

## The idea

DreamDEX's own up/down markets are mostly dead — a widely-cited figure is
that 83.5% of ~5,000 DreamDEX markets never saw a single trade. The reason
isn't a lack of users, it's a lack of disagreement: "will BTC go up" is a
question about market beta, so nearly everyone answers the same way and the
book goes one-sided.

**"BTC or ETH?" is close to a coin flip and people have pre-existing tribal
opinions.** Both sides populate naturally — a genuine design answer to the
dead-market problem, not a cosmetic one.

- BTC wins if the BTC DreamDEX Event Contract resolves **Up** and the ETH one
  does **not**.
- ETH wins on the reverse.
- If both resolve the **same direction** → draw, everyone refunded their
  exact stake.
- Money is pooled parimutuel on our own contract; DreamDEX resolutions are
  the only oracle.

### The number that shaped this build

Before writing any product code, we measured how often BTC and ETH actually
resolve in the same direction, against **live Shannon testnet data**, across
every cadence DreamDEX offers:

| Cadence | Sample (real pairs) | Draw rate |
|---|---|---|
| 5 min | 2,108 | **85.0%** |
| 15 min | 4,445 | 79.1% |
| 1 hour | 1,192 | 79.6% |
| 4 hours | 297 | 81.5% |
| 24 hours | 49 | 89.8% |

Draws are the **majority outcome at every timeframe** — lengthening the
window doesn't fix it, and no third, less-correlated asset exists on
DreamDEX to race against (only BTC and ETH have Event Contracts). So the
draw isn't an edge case in this product, it's the main event: the UI treats
it as a first-class, equally-produced outcome ("No Contest — Dead Heat"),
not an error state.

The app runs **5m / 15m / 1h concurrently**, picked with a tab on `/play` —
5-minute is the default because it gives the most attempts per hour to catch
a decisive (non-draw) result live, but all three cadences settle for real
off the same DreamDEX feed.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  web/        Next.js app (App Router)            │
│  Landing page · race view · wallet · one tap     │
└───────────────┬───────────────────────────────────┘
                │ reads/writes (viem)
┌───────────────▼───────────────────────────────────┐
│  contracts/  MatchupMarket.sol (Solidity, Foundry) │
│  Somnia Shannon testnet, chain 50312               │
│  openWindow · pick · settle · claim · refund       │
└───────────────▲───────────────────────────────────┘
                │ writes settlement
┌───────────────┴───────────────────────────────────┐
│  resolver/   TS keeper (@somnia-chain/markets-sdk) │
│  Opens windows, polls DreamDEX for both outcomes,  │
│  calls settle(). Stateless — re-derives everything │
│  from wall-clock time + on-chain state, so a       │
│  restart is always safe.                           │
└───────────────▲───────────────────────────────────┘
                │ reads (indexer GraphQL + on-chain)
┌───────────────┴───────────────────────────────────┐
│  DreamDEX Event Contracts (BTC, ETH)               │
│  via @somnia-chain/markets-sdk — NOT REST/WS;      │
│  the public REST API only covers spot markets.     │
└─────────────────────────────────────────────────┘
```

No indexer of our own, no database, no backend beyond the resolver. Contract
state is the source of truth; the frontend reads it directly.

### Why Somnia

Our contract, the picks, the pot, and settlement are all Somnia state —
DreamDEX itself only exists because it's on Somnia. Picks confirm and payouts
land with no claim-button ceremony; short-window markets like this are only
pleasant on a chain with sub-second finality.

---

## Repo layout

| Path | What it is |
|---|---|
| `contracts/` | `MatchupMarket.sol`, Foundry tests (24 passing, every edge case in the spec), deploy script |
| `resolver/` | Standalone TS keeper — opens/settles windows against live DreamDEX data |
| `web/` | Next.js 16 frontend — landing page + the live race/pick/claim UI |
| `shared/` | The contract ABI, shared by `resolver/` and `web/` |
| `FEEDBACK.md` | SDK & documentation friction log from building this, for the DreamDEX team |

---

## Running it locally

### 1. Contracts

```bash
cd contracts
forge test                 # 24 tests, all edge cases in the spec
forge script script/Deploy.s.sol:Deploy --rpc-url shannon --broadcast \
  --legacy --gas-estimate-multiplier 2000   # see FEEDBACK.md for why the multiplier
```

### 2. Resolver

```bash
cd resolver
npm install
cp .env.example .env   # fill in SOMNIA_PRIVATE_KEY + CONTRACT_ADDRESS
npm start               # runs forever: opens windows, polls DreamDEX, settles
```

### 3. Frontend

```bash
cd web
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_CONTRACT_ADDRESS + FAUCET_PRIVATE_KEY
npm run dev
```

Open the printed local URL. A burner wallet is generated in the browser on
first load (no extension, no signup) — use the "Get test STT" button to fund
it from the faucet endpoint.

---

## Contract design notes

- `windowId` is derived on-chain as `expiresAt * 1_000_000 + cadenceSec` —
  BTC and ETH windows share a clock on DreamDEX (verified empirically), so
  expiry is a natural key, but DreamDEX runs several cadences concurrently
  per asset and a 15m expiry is also a 5m expiry, so cadence has to be
  folded in or two cadences' windows collide. Encoding rather than hashing
  keeps the id human-decodable: `windowId / 1_000_000` is the expiry,
  `windowId % 1_000_000` is the cadence.
- `openWindow` / `settle` are resolver/owner-gated, not fully permissionless
  — otherwise an attacker could front-run a real window with garbage
  DreamDEX market ids and grief the game. `pick` and `claim` stay open to
  anyone.
- A one-sided pot (only one side ever staked) forces the refund path even on
  a decisive DreamDEX outcome — otherwise the populated side's money would
  be permanently unclaimable (no counterparty exists to "win" against).
- A resolver that goes dark for 30 minutes past a window's expiry lets
  **anyone** trigger `refundStuckWindow` — funds are never strandable.
- Dust from integer-division truncation on a decisive settlement is left
  unclaimed in the contract rather than routed to a "last claimer" —
  simpler, and the amounts are negligible.

See `contracts/src/MatchupMarket.sol` for full inline documentation and
`contracts/test/MatchupMarket.t.sol` for the edge-case coverage (both draws,
one-sided pot, empty window, double claim, claim-before-settle,
settle-before-expiry, stuck-resolver refund, proportional multi-winner
split).

---

## The liquidity note

The pot is pooled on our **own** contract because DreamDEX's own order books
are thin today — several hackathon submissions depend on filling orders on
books that are frequently empty, which is the single biggest live-demo risk
in this event. The natural next step, as DreamDEX liquidity arrives, is
routing picks onto the real Event Contract books instead of a self-contained
pool. We see this as a front door to Event Contracts adoption, not a
competing venue.

---

## License

MIT — see [LICENSE](./LICENSE).
