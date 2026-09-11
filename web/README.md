# web

The Bitcred frontend — landing page plus the live race/pick/claim UI at
`/play`. Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, viem,
wagmi. See the [root README](../README.md) for the full product story.

Wallet access is via wagmi's injected connector (MetaMask or any other
injected provider) — no embedded or custodial wallet. `/api/faucet` funds
the connected address from a server-held testnet key.

## Run

```shell
cp .env.example .env.local   # fill in NEXT_PUBLIC_CONTRACT_ADDRESS + FAUCET_PRIVATE_KEY
npm install
npm run dev
```
