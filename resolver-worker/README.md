# resolver-worker

The production resolver — the same open/settle logic as `../resolver/`, refactored
from an always-on Node loop into a Cloudflare Worker triggered by a Cron Trigger
every minute. This is what keeps windows opening and settling in production;
`../resolver/` (`npm start`) is still useful for local dev since it ticks every 5s
instead of waiting for the next cron minute.

Deployed at `https://bitcred-resolver.bitcred-resolver.workers.dev` (cron-only in
practice — the `fetch` handler exists just so a plain `curl` can force one tick on
demand, e.g. to verify a deploy without waiting for the next minute).

## Deploy

```shell
npm install
npx wrangler secret put SOMNIA_PRIVATE_KEY   # paste the operator key when prompted
npx wrangler deploy
```

Non-secret config (`CONTRACT_ADDRESS`, `RPC_URL`, `INDEXER_URL`, `WS_RPC_URL`,
`CADENCES_SEC`) lives in `wrangler.toml` under `[vars]`.

## Watch logs

```shell
npx wrangler tail
```
