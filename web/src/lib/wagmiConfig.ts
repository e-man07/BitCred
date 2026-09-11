import { createConfig, http, injected } from "wagmi";
import { shannon } from "./chain";

export const wagmiConfig = createConfig({
  chains: [shannon],
  connectors: [injected()],
  transports: {
    [shannon.id]: http(),
  },
  // Defers reading any persisted connection until after hydration to avoid
  // an SSR/client hydration mismatch on the connected address.
  ssr: true,
});
