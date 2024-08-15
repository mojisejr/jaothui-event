import { createPublicClient, http } from "viem";
import { bitkub_mainnet } from "../blockchain/chain";

export const viem = createPublicClient({
  chain: bitkub_mainnet,
  transport: http(),
});
