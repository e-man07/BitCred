# DreamDEX / Somnia SDK & docs feedback

Friction points hit while building Matchup, in the order we hit them. Every
item below is something we verified directly against Shannon testnet or the
SDK's own source — not a guess. We hope it's useful signal.

## 1. The REST API does not cover Event Contracts at all

`GET https://stg.api.dreamdex.io/v0/markets` returns only spot pairs
(`SOMI:USDso`, `WBTC:USDso`, `WETH:USDso`). There is no REST or WebSocket
surface for binary/Event Contract markets — the *only* way to read them is
the `@somnia-chain/markets-sdk` TypeScript package, which talks to an
indexer GraphQL endpoint plus on-chain fallback reads.

The Event Contracts docs page does eventually say this ("the HTTP API
covers spot only and has no event-contract endpoints"), but it's easy to
start from the REST API (it's the first thing linked from the architecture
overview) and burn real time before discovering the SDK is mandatory, not
optional.

## 2. The SDK's own GitHub repo is private

`@somnia-chain/markets-sdk`'s `package.json` points at
`github.com/somnia-chain/somnia-markets`, and its README links to
`./docs/EXCHANGE.md`, `./docs/BINARY.md`, etc. That repo is **private** —
every one of those links 404s for an external builder. The only way we
found to read those docs was to install the npm package and read its
shipped `src/` directly (fortunately it ships full TypeScript source, not
just `.d.ts`). A public docs mirror, or publishing the `docs/` folder
alongside the npm package, would remove a real "am I even allowed to be
using this?" moment for a hackathon participant.

## 3. Contract deployment gas is ~15.6x Ethereum's, and no estimator warns you

Somnia charges **3125 gas per deployed bytecode byte** for contract
creation (Ethereum charges 200). A contract that deploys for ~2.7M gas
worth of code storage on Ethereum needs ~42.9M gas on Somnia for the same
bytecode.

Nothing about this is surfaced anywhere obvious — not in the Event
Contracts docs, not in the general Somnia developer docs' landing pages.
We only found the number by asking the docs' own search assistant directly
after `forge script ... --broadcast` failed three times in a row with a
transaction that consumed **exactly 100% of whatever gas limit we gave it**
(3.9M, then 9M, then 20M via a manual `cast send --gas-limit 20000000`) —
which reads exactly like a Solidity-level revert, not "you didn't give
enough gas." We initially suspected a `PUSH0`/EVM-version incompatibility
(compiled a Paris-targeted build to rule it out) before finding the real
cause.

The frustrating part: the chain's own `eth_estimateGas` RPC method
**already accounts for this correctly** — `cast estimate --create <initcode>`
returned an accurate ~69M gas the whole time. The bug is entirely in
tooling that estimates gas *locally* rather than asking the chain:
`forge script`'s default broadcast path does this for contract creation,
so every Foundry deployment script needs `--gas-estimate-multiplier 1500`+
(or higher) as a blanket workaround. A callout in the "Deploying a smart
contract" doc — even a single sentence — would save every Foundry user
this exact debugging loop.

## 4. `eth_getLogs` caps at a 1000-block range, undocumented

```
curl ... eth_getLogs ... {"fromBlock": "<2000 blocks back>", "toBlock": "latest"}
→ {"error":{"code":-1,"message":"block range exceeds 1000"}}
```

Most Ethereum-compatible RPC providers allow ranges from 2,000 to 50,000+
blocks (or have no cap at all) for `eth_getLogs`. Somnia's Shannon RPC caps
at exactly 1,000 — tight enough that, combined with the chain's fast block
time (~11 blocks/sec in our testing), a single call only covers about 90
seconds of history. Any indexer, analytics tool, or "recent activity" UI
written with typical assumptions will silently get empty results instead
of an obvious error unless it explicitly paginates in 1,000-block pages.
We'd suggest documenting the cap next to the JSON-RPC reference, since it's
the kind of thing that costs someone a debugging session with no error
message pointing at the real cause (our own code returned zero results
before we thought to test the range limit directly).

## 5. `getOpeningPrices`'s returned scale isn't carried in the response

`client.getOpeningPrices(marketIds)` returns a raw `numericValue` per
market — but nothing in the return value says what scale it's in. The
SDK's own source comment is refreshingly honest about this:

> "SCALE IS NOT CARRIED, and that is a trap worth stating. Callers scale
> these by the explorer's `ORACLE_PRICE_DECIMALS` (2), which is empirical,
> not schema-backed."

That constant (`2`) isn't exported anywhere we could find — it's folklore
you only get by reading a comment in the SDK's source, or reverse
engineering it (which is what we did: our live BTC/ETH price comparison
showed a nonsensical **-99% change** until we found this comment and
divided by 100). Exporting `ORACLE_PRICE_DECIMALS` as an actual named
constant would remove an entire class of "why is my price 100x off" bugs.

## 6. Live prices need a *second*, undocumented-in-the-quickstart config field

The top-level README's "Create an exchange" example configures
`SomniaMarkets` with `indexerUrl`, `chain`, `wsRpcUrl`, and `addresses`.
Following that example exactly and then calling `client.watchPrice("BTC")`
throws:

```
NotConfiguredError: this price-feed read — needs config.priceFeed = { url }
— the price-feed indexer's GraphQL endpoint
```

`SOMNIA_TESTNET_PRICE_FEED` / `SOMNIA_MAINNET_PRICE_FEED` constants exist
and fix it in one line once you know to look — but the quickstart example
that every new integration is copy-pasted from doesn't mention prices need
a separate feed config at all, so this only surfaces at runtime, from a
part of the app (a live price ticker) that's easy to build last and test
last.

## 7. On-chain `getMarketOnchain().winningOutcome` defaults to a valid-looking value before resolution

`client.getMarketOnchain(marketId)`'s raw view returns `winningOutcome: 0`
even when `isResolved: false` — `0` is also a real, meaningful outcome
value (YES/Up). A resolver that reads `winningOutcome` without checking
`isResolved`/`isVoided` first will silently treat every not-yet-resolved
market as "resolved Up." We built our resolver around the indexer's
`listBinaryMarkets`/`getBinaryMarket` instead, where `winningOutcome` is
correctly typed `number | null` — but the two read paths disagreeing on
what "unresolved" looks like is a sharp edge worth flagging, especially
since the raw on-chain path is the one that feels more "authoritative."

## 8. Multiple concurrent cadences per asset aren't called out anywhere

`app.dreamdex.io`'s Events tab defaults to showing the 15-minute market and
requires a click to discover the 5-minute and 1-hour tabs also exist and
are fully live (on-chain we also found active 4-hour and 24-hour series
under the same venue). Nothing in the docs states that BTC/ETH run several
independent cadence series simultaneously. We initially assumed — based on
a first look at the product — that 15 minutes was the only window length,
and had to verify against the indexer directly (`intervalSec` filter on
`listBinaryMarkets`) to find the others. A line in the Event Contracts docs
listing the available cadences per asset would remove that ambiguity for
the next builder.

---

None of the above are complaints about the product working — everything
above was fully usable once we found the right incantation, and the
underlying settlement data (which is all we actually depend on) has been
completely reliable in ~40+ minutes of continuous resolver operation
against live testnet windows. These are all "the docs didn't say" gaps,
not correctness bugs.
