# web

The Matchup frontend — landing page plus the live race/pick/claim UI at
`/play`. Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, viem. See
the [root README](../README.md) for the full product story.

An embedded burner wallet is generated client-side on first load (no
extension, no signup) and persisted to `localStorage`; `/api/faucet` funds
it from a server-held testnet key.

## Run

```shell
cp .env.example .env.local   # fill in NEXT_PUBLIC_CONTRACT_ADDRESS + FAUCET_PRIVATE_KEY
npm install
npm run dev
```
