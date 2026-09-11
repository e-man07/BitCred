# HANDOFF — BTC vs ETH matchup market on DreamDEX Event Contracts

Somnia × DreamDEX Event Contracts Hackathon (DoraHacks). This document is the
complete build spec. Read it fully before writing code.

---

## 0. TL;DR

Build a head-to-head prediction game: **BTC vs ETH, one window, pick a side.**

- BTC wins if the BTC Event Contract resolves UP and the ETH one does NOT.
- ETH wins on the reverse.
- If both resolve the same direction → **draw, everyone refunded.**
- Money is pooled parimutuel on our own contract. Winners split both pots.
- Resolution comes **entirely** from DreamDEX Event Contract settlements. Remove
  DreamDEX and the product cannot settle. That is the integration story.

One page. Two logos. A countdown. A live pot-split bar. One tap. A settlement moment.

---

## 1. Why this shape (do not redesign it)

There are ~86 competing submissions. Almost all fall into two buckets: autonomous
AI trading agents, and one-tap UP/DOWN consumer apps. Both buckets are saturated.

**Nobody is racing two assets against each other.** That is the entire edge. The
product is unclaimed, it is instantly legible in a three-second scan of a grid of
submissions, and it has a real market-design justification:

DreamDEX's own markets are mostly dead — a widely-cited figure in this hackathon is
that 83.5% of ~5,000 DreamDEX markets never saw a single trade. The reason is not a
lack of users, it is a **lack of disagreement**. "Will BTC go up in the next window"
is a question about market beta, so everyone answers the same way and the book goes
one-sided.

"BTC or ETH?" is close to a coin flip and people have pre-existing tribal opinions.
Both sides populate naturally. That is a genuine design answer to the dead-market
problem, not a cosmetic one.

### Rubric mapping (weights are official)

| Criterion | Weight | How we score |
|---|---|---|
| Technical Implementation | 25% | DreamDEX resolutions are load-bearing; clean on-chain settlement |
| Innovation & Originality | 20% | Relative/matchup market — unclaimed in the field |
| User Experience & Design | 20% | One screen, one tap, live race visual |
| Business & Ecosystem Impact | 20% | Fixes two-sided interest; front door to Event Contracts |
| Presentation & Demo | 15% | Live full-window run on video, clear story |

55% of the score is UX + ecosystem + presentation. **Do not trade polish for
cleverness.** A simpler product that demos flawlessly beats a sophisticated one
that needs explaining.

---

## 2. Phase 0 — resolve these before writing product code

These are genuine unknowns. Everything downstream depends on them. Do this first,
in a throwaway script, and report findings before building.

### 2.1 How to read an Event Contract resolution

This is the single most important question in the project.

Determine, against Shannon testnet:

1. Does the REST API expose a **settled outcome** for a past window
   (`GET /v0/markets` and whatever market/window detail endpoints exist)?
2. Is the outcome readable **on-chain** — a view function on the market contract,
   or a settlement **event** that must be caught?
3. What exactly identifies a window? A market ID, an expiry timestamp, an index?
4. **Do the BTC and ETH windows share the same clock?** If their window boundaries
   are not aligned, the matchup is not well-defined and the design must change
   (fall back to: compare the two most recent resolutions whose windows overlap,
   and state that rule explicitly in the UI).
5. What is the actual window length? Sources in the wild say both 5 and 15 minutes.
   **Verify empirically.** The UI copy and contract timing depend on it.

Primary docs: `https://docs.dreamdex.io/developers/event-contracts`

### 2.2 Decide the resolution path

Two options. **Default to polling.**

- **Polling (recommended).** A small off-chain resolver reads the settled outcome
  for both markets and writes it into our contract. Boring, reliable, cannot stall
  during a live demo.
- **Somnia Reactivity.** A contract subscribes to on-chain events via the
  reactivity precompile (`0x0100`) and reacts in the same block, no keeper.
  Technically nicer. **But at least three other submissions lead with exactly this
  story**, so the marginal score is near zero, and a stalled subscription breaks
  the demo.

If Reactivity is added at all, add it as a **second path with the poller as
fallback**, never as the only path. Note: keeping a reactivity subscription active
has a minimum SOMI balance requirement — verify the current figure before relying
on it.

### 2.3 Sanity-check that the matchup is interesting

Pull a few hours of both markets' resolutions. Measure how often BTC and ETH
resolve in the **same** direction. BTC and ETH are highly correlated over short
windows, so draws may be the majority outcome.

- If draws are ~50% or less: ship as designed.
- If draws are overwhelming (say >70%): the game feels like it never resolves.
  Mitigations, in order of preference: (a) lengthen the window, (b) race BTC
  against a higher-beta asset if another Event Contract market exists, (c) make
  the draw itself a third bettable outcome.

**Report this number before building the UI.** It determines whether the draw
state is an edge case or the main event.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js + wagmi/viem)                │
│  One page. Race view. Wallet connect. One tap.  │
└───────────────┬─────────────────────────────────┘
                │ reads/writes
┌───────────────▼─────────────────────────────────┐
│  MatchupMarket.sol  (Somnia Shannon, 50312)     │
│  - openWindow(windowId, btcMarket, ethMarket)   │
│  - pick(side) payable                           │
│  - settle(btcOutcome, ethOutcome)               │
│  - claim() / refund()                           │
└───────────────▲─────────────────────────────────┘
                │ writes outcomes
┌───────────────┴─────────────────────────────────┐
│  Resolver (TS, off-chain)                       │
│  Polls DreamDEX for both settled outcomes,      │
│  calls settle(). Restart-safe, idempotent.      │
└───────────────▲─────────────────────────────────┘
                │ reads
┌───────────────┴─────────────────────────────────┐
│  DreamDEX Event Contracts (BTC, ETH)            │
│  REST: https://stg.api.dreamdex.io/v0           │
│  WS:   wss://stg.api.dreamdex.io/v0/ws/public   │
└─────────────────────────────────────────────────┘
```

Deliberately: no indexer, no database, no backend beyond the resolver. Contract
state is the source of truth; the frontend reads it directly.

---

## 4. Contract spec — `MatchupMarket.sol`

### State

```solidity
enum Side   { BTC, ETH }
enum Status { OPEN, LOCKED, SETTLED, DRAW }

struct Window {
    uint256 id;
    uint64  opensAt;
    uint64  locksAt;        // picks close
    uint64  expiresAt;      // DreamDEX window close
    Status  status;
    Side    winner;
    uint256 potBTC;
    uint256 potETH;
    bool    btcUp;
    bool    ethUp;
}

mapping(uint256 => Window) public windows;
mapping(uint256 => mapping(address => uint256)) public stakeBTC;
mapping(uint256 => mapping(address => uint256)) public stakeETH;
mapping(uint256 => mapping(address => bool))    public claimed;
```

### Functions

- `openWindow(...)` — anyone or owner; binds this window to a specific DreamDEX
  BTC market and ETH market. Store those identifiers on-chain so settlement is
  auditable and a judge can verify it against DreamDEX.
- `pick(uint256 windowId, Side side) payable` — requires `OPEN` and
  `block.timestamp < locksAt`. Adds to the side's pot. A user may add more to the
  same side; **reject picking both sides** (it makes the parimutuel math degenerate
  and confuses the UI).
- `settle(uint256 windowId, bool btcUp, bool ethUp)` — resolver-only. Requires
  `block.timestamp >= expiresAt`. Computes:
  - `btcUp && !ethUp` → winner BTC, status SETTLED
  - `!btcUp && ethUp` → winner ETH, status SETTLED
  - otherwise → status **DRAW**
- `claim(uint256 windowId)` — SETTLED: payout = `stake + (stake / winningPot) * losingPot`.
  DRAW: refund exact stake. Guard with `claimed[][]` and follow
  checks-effects-interactions. Use `call` for transfers, not `transfer`.

### Edge cases that must be handled explicitly

| Case | Behaviour |
|---|---|
| Draw (both same direction) | Full refund both sides |
| One side has zero stake | Refund everyone — no counterparty, no game |
| Nobody staked at all | Window closes as DRAW, no-op |
| Resolver never calls settle | After a grace period, allow anyone to trigger refund. **Do not leave funds strandable.** |
| Double claim | `claimed` mapping guard |
| Reentrancy | Nonreentrant on claim; state written before transfer |
| Dust / rounding | Integer division truncates — send remainder to the last claimer or leave it; document the choice |

### Testing

Unit tests for: BTC win, ETH win, both-up draw, both-down draw, one-sided pot,
empty window, double claim, claim before settle, settle before expiry, stuck
resolver refund path. Foundry preferred.

---

## 5. DreamDEX integration — gotchas

Source: `https://github.com/somnia-chain/dreamdex-bot-kit`.
Starter template: `https://github.com/IronicDeGawd/ec-dreamdex-hackathon-template`.

### Network

|  | Shannon testnet | Mainnet |
|---|---|---|
| Chain ID | `50312` | `5031` |
| RPC | `https://dream-rpc.somnia.network` | `https://api.infra.mainnet.somnia.network` |
| REST | `https://stg.api.dreamdex.io/v0` | `https://api.dreamdex.io/v0` |
| WebSocket | `wss://stg.api.dreamdex.io/v0/ws/public` | `wss://api.dreamdex.io/v0/ws/public` |

**Use testnet only.** Test funds: `https://testnet.somnia.network` (STT tokens).

### Hard rules

1. **Never hard-code DreamDEX contract addresses.** Fetch them at runtime from
   `GET /v0/markets`. Addresses are also in `packages/core` of the bot kit.
2. **`placeTakerOrderWithoutVault` no longer exists.** It was removed in the June
   2026 spot upgrade. Most older example code — including much of `examples/` in
   the bot kit — still calls it and is wrong. The single entry point is now:

   ```solidity
   function placeOrder(
       bool isBid, uint64 userData, uint256 price, uint256 quantity,
       uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption,
       address builder, uint96 builderFeeBpsTimes1k
   ) external payable returns (bool success, uint128 orderId);
   ```

   It is `payable` and **auto-pulls funds from the wallet** — no separate deposit
   step in the common case.
3. Read `docs/gotchas.md` in the bot kit before touching any order path.
4. `npx tsx scripts/doctor.ts` is a read-only setup check — wallet, balances, live
   books for every market. Run it first to confirm connectivity.
5. Every strategy in the kit defaults to `DRY_RUN=true`. Keep that default for any
   exploratory script.

### What we actually need from DreamDEX

For the core product: **read-only**. We need settled outcomes, nothing more. We do
not place orders. This keeps us immune to their thin liquidity, which is the single
biggest demo risk in this hackathon — several projects depend on filling orders on
books that are frequently empty.

Do not add an order-routing feature unless the core loop is complete, tested, and
recorded. If added later, route **one leg only** (never a two-leg hedge — a partial
fill leaves a broken position live on camera).

---

## 6. Somnia specifics

- Deploy target: Shannon testnet, chain `50312`.
- Somnia is the substrate: our contract, the picks, the pot, and settlement are all
  Somnia state. DreamDEX itself only exists because it is on Somnia. This is
  sufficient Somnia usage for the hackathon — no second integration is required.
- **Say the speed point explicitly** in the README and the video: picks confirm
  instantly and payout lands the moment the window closes, with no claim button
  ceremony. Short-window markets like this are only pleasant on a chain with
  sub-second finality. One sentence, free credit.
- Somnia Reactivity (precompile `0x0100`) is optional — see §2.2. It is a bonus
  path, never the critical path.

---

## 7. UX spec

**One screen. If a feature needs a second screen, it is out of scope.**

### Layout, top to bottom

1. **The race.** Two lanes, BTC and ETH, animating in real time against each other
   for the whole window. This is the product. It should be genuinely beautiful and
   it should move — in a grid of 86 static screenshots, motion is the differentiator.
2. **Countdown.** Large, unmissable, to window close.
3. **Pot split bar.** Live, showing which side the room is on. Real data, free
   social proof, no extra infrastructure.
4. **Two tap targets.** BTC / ETH. One tap to enter. No dropdowns, no forms, no
   confirm modal beyond the wallet signature.
5. **Settlement moment.** When the window closes: winner locks in, payout lands.
   This is the emotional beat and the proof that DreamDEX resolution drives the
   product. Make it land — animation, color, sound.

### The draw state

Draws will be common (both assets usually move together). **Design the draw as a
deliberate outcome, not an error.** Call it "No contest" or "Dead heat". Show it
with the same production value as a win. Refund messaging should be immediate and
obvious. If it looks like a bug, it scores like a bug.

### Explicitly out of scope

Leaderboards, trade history, user profiles, portfolio views, wallet dashboards,
multi-pair support, streaks, seasons, brackets, social feeds, AI anything.

All of these go in the **roadmap slide of the deck**. "Future vision" is a named
line item in the Presentation criterion, so unbuilt roadmap still earns points
there. Building it earns nothing extra.

### Wallet

Lowest-friction path available. If an embedded/burner key in the browser is
feasible, prefer it — several competing entries use one and it removes the single
biggest onboarding drop-off. Otherwise standard wagmi connect.

---

## 8. Build order

Strictly sequential. Do not start a step before the previous one works end to end.

1. **Phase 0 findings** (§2). Report before proceeding.
2. **Settlement loop, ugly.** Contract + resolver + a plain HTML page. Get one
   complete window to: open → accept a pick → read both real DreamDEX resolutions
   → pay out on testnet. Until this works, nothing else counts.
3. **Contract tests.** All edge cases in §4.
4. **Real UI.** The race view, per §7.
5. **Deployment.** Verified contract, deployed frontend, addresses in the README.
6. **Demo video.** See §9.
7. **Writeup + deck + feedback report.** See §10.

After step 2, the project is submittable. Every step after that is upside — so
never break step 2 in service of a later step.

---

## 9. Demo video

Required: 2–3 minutes. This is 15% of the score on its own, plus it is how judges
form their first impression of the UX 20%.

**Non-negotiable: the video must show one complete window, live, start to finish,
with a real settlement.** Not a mockup, not a sped-up montage of a simulation. That
means real runtime you cannot compress, and a real settlement you must catch.

Structure:

- **0:00–0:15** — the race on screen, moving. No talking-head intro, no logo splash.
  A judge scanning 86 submissions decides here.
- **0:15–0:40** — the problem: most DreamDEX markets never traded, because
  "will BTC go up" has no natural other side. Say the 83.5% figure.
- **0:40–1:00** — the fix: race two assets, both sides populate naturally.
- **1:00–2:00** — live run. Pick a side. Window closes. DreamDEX resolutions come
  in. Payout lands. Show the on-chain transaction.
- **2:00–2:30** — why Somnia (speed), and the roadmap in one line.

Record a draw outcome too if one occurs — showing it handled gracefully is a
strength, not a weakness.

---

## 10. Submission checklist

DoraHacks requires a GitHub link and a demo video. Both are hard requirements.

- [ ] Public repo, MIT licensed
- [ ] README: what it is, the market-design rationale, how DreamDEX resolutions
      drive settlement, deployed contract addresses, how to run locally
- [ ] Live testnet deployment, reachable by URL
- [ ] 2–3 minute demo video
- [ ] Deck (optional but listed) — include the roadmap slide
- [ ] **SDK & documentation feedback report (optional, do it).** This is an
      adoption-driver hackathon; the sponsor wants DX signal and almost nobody
      submits one. Log every friction point hit during the build — missing docs,
      confusing endpoints, the removed-function trap — and submit it. Cheap,
      high-goodwill, differentiating.
- [ ] Project name that reads instantly in a grid. The scan is three seconds long.

### One line to include in README and deck

State plainly that the pot is pooled on our own contract **because DreamDEX books
are thin today**, and that the natural next step is routing picks onto the real
Event Contract books as liquidity arrives. A judge from DreamDEX will wonder
whether this competes with them or feeds them. Answering before they ask reads as
market-design maturity; being silent reads as not having noticed.

---

## 11. Standing rules for this build

- Verify against live testnet rather than assuming from docs or from this document.
  Where this document and reality disagree, reality wins — and flag the conflict.
- Do not add features that cannot be shown in the video.
- Do not introduce a dependency that can stall during a live demo.
- Prefer boring and reliable over elegant and fragile, every time.
- If a design decision is ambiguous, pick the option that is easier to explain in
  one sentence.
