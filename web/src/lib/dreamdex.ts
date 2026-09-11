import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES, SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL ?? "https://dev.smk.somnia.host/v1/graphql";
const WS_RPC_URL = process.env.NEXT_PUBLIC_WS_RPC_URL ?? "";

let _exchange: SomniaMarkets | null = null;

/** Browser-side, read-only exchange instance (no signer) for live prices and market lookups. */
export function getDreamDexExchange(): SomniaMarkets {
  if (!_exchange) {
    _exchange = new SomniaMarkets({
      indexerUrl: INDEXER_URL,
      chain: somniaShannon,
      wsRpcUrl: WS_RPC_URL,
      addresses: SOMNIA_TESTNET_ADDRESSES,
      priceFeed: SOMNIA_TESTNET_PRICE_FEED,
    });
  }
  return _exchange;
}
