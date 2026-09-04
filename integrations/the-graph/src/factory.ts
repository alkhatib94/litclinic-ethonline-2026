import { TheGraphConfigurationError } from "./errors";
import { TheGraphLiveProvider } from "./provider";

export const THE_GRAPH_DEFAULT_GATEWAY_URL = "https://gateway.thegraph.com/api/";
export const UNISWAP_V3_ETHEREUM_SUBGRAPH_ID =
  "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6";

type RuntimeEnvironment = Record<string, string | undefined>;

export function createTheGraphProviderFromEnv(env: RuntimeEnvironment) {
  const credential = env.THE_GRAPH_API_KEY?.trim();
  if (!credential) {
    throw new TheGraphConfigurationError(
      "THE_GRAPH_API_KEY is required for live Graph queries.",
    );
  }

  return new TheGraphLiveProvider({
    gatewayUrl:
      env.THE_GRAPH_GATEWAY_URL?.trim() || THE_GRAPH_DEFAULT_GATEWAY_URL,
    subgraphId:
      env.THE_GRAPH_SUBGRAPH_ID?.trim() || UNISWAP_V3_ETHEREUM_SUBGRAPH_ID,
    apiKey: credential,
  });
}
