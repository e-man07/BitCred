# resolver-worker

The production resolver — the same open/settle logic as `../resolver/`, refactored
from an always-on Node loop into a Cloudflare Worker. `../resolver/` (`npm start`)
is still useful for local dev since it ticks every 5s instead of waiting for the
next minute boundary.

Deployed at `https://bitcred-resolver.bitcred-resolver.workers.dev`.

## Why an external pinger, not Cloudflare's own Cron Trigger

`wrangler.toml` still declares `crons = ["* * * * *"]` and it's registered
correctly (confirmed via the Cloudflare API), but Cloudflare's own scheduler
never actually dispatches `scheduled()` on this account — a known, currently
open platform bug affecting Workers Free accounts (see the Cloudflare
community forum for multiple 2026 reports of the same symptom: a Cron Trigger
listed under `/schedules` that simply never fires, no error either side).

So in practice, **[cron-job.org](https://cron-job.org) is what actually drives
this worker** — a free job (ID `8433095`) hits the `fetch` handler below every
minute, which does exactly what `scheduled()` would have. If Cloudflare's cron
dispatch starts working again, the two would just run redundantly (harmless,
since every write is idempotent) — no code change needed either way.

## Deploy

```shell
npm install
npx wrangler secret put SOMNIA_PRIVATE_KEY   # paste the operator key when prompted
npx wrangler deploy
```

Non-secret config (`CONTRACT_ADDRESS`, `RPC_URL`, `INDEXER_URL`, `WS_RPC_URL`,
`CADENCES_SEC`) lives in `wrangler.toml` under `[vars]`.

## Manually trigger a tick

```shell
curl https://bitcred-resolver.bitcred-resolver.workers.dev/
```

Returns a step-by-step JSON report (per cadence: open attempt, settle attempt,
any error) — useful for confirming a deploy without waiting for the next ping.

## Watch logs

```shell
npx wrangler tail
```
