import { createTheGraphProviderFromEnv } from "@litclinic-ethonline/the-graph";
import {
  createLiveWorldProviderFromEnv,
  createWorldAgentRuntimeFromEnv,
} from "@litclinic-ethonline/world-agentkit";

import { createApiApp } from "./app";
import { createContextProviderFromEnv } from "./providers/factory";

const provider = createContextProviderFromEnv(process.env);
const onchainProvider = process.env.THE_GRAPH_API_KEY?.trim()
  ? createTheGraphProviderFromEnv(process.env)
  : undefined;
const worldProvider = createLiveWorldProviderFromEnv(process.env);
const worldRuntime = process.env.WORLD_AGENT_PRIVATE_KEY?.trim()
  ? createWorldAgentRuntimeFromEnv(process.env)
  : undefined;
const app = createApiApp({
  provider,
  onchainProvider,
  worldProvider,
  configuredAgentAddress: worldRuntime?.agentAddress,
});
const port = parsePort(process.env.PORT);

export default {
  port,
  fetch: app.fetch,
};

function parsePort(value: string | undefined): number {
  if (value === undefined) return 3001;
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return port;
}
