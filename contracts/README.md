# contracts

`MatchupMarket.sol` — the parimutuel BTC-vs-ETH matchup contract. See the
[root README](../README.md) for the full product story and architecture, and
[FEEDBACK.md](../FEEDBACK.md) for the Somnia-specific gas/EVM gotchas this
package's deploy script works around.

Built with [Foundry](https://book.getfoundry.sh/).

## Test

```shell
forge test -vv
```

24 tests, covering every edge case in the spec: BTC win, ETH win,
proportional multi-winner split, both-up draw, both-down draw, one-sided
pot, empty window, double claim, claim-before-settle, settle-before-expiry,
settle-only-once, and the stuck-resolver refund path.

## Deploy

```shell
cp .env.example .env   # fill in SOMNIA_PRIVATE_KEY
forge script script/Deploy.s.sol:Deploy --rpc-url shannon --broadcast \
  --legacy --gas-estimate-multiplier 2000
```

The `--gas-estimate-multiplier 2000` is not optional — Somnia charges ~15.6x
Ethereum's gas per deployed bytecode byte, and `forge script`'s local gas
estimation for contract creation doesn't know that (see FEEDBACK.md #3).
Without it, the deploy transaction lands on-chain and reverts, consuming
100% of whatever gas limit was given.

`shannon` (chain 50312, `https://dream-rpc.somnia.network`) is preconfigured
in `foundry.toml`.
