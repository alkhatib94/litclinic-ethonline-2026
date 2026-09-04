import { authorizeAgentPlan } from "../packages/agent-core/src";
import { MockWorldAgentAuthorizationProvider } from "../integrations/world-agentkit/src";
import {
  ethereumAddressSchema,
  type AgentActionPlan,
} from "../packages/shared/src";

const addressResult = ethereumAddressSchema.safeParse(process.argv[2]);
const scenario = process.argv[3];
if (
  !addressResult.success ||
  (scenario !== "verified" && scenario !== "unregistered")
) {
  console.error(
    "Usage: bun run demo:world:mock <AGENT_WALLET> <verified|unregistered>",
  );
  process.exit(1);
}

const agentAddress = addressResult.data;
const plan: AgentActionPlan = {
  version: "1",
  action: "continue_workflow",
  decision: "require_approval",
  reasons: ["NO_OBSERVED_ONCHAIN_ACTIVITY"],
  evidence: {
    graphProvider: "the-graph",
    graphQueryId: "uniswap-v3-wallet-swaps-v1",
    indexedBlockNumber: 0,
    graphQueriedAt: "2026-09-04T00:00:00.000Z",
  },
};
const verified = scenario === "verified";
const authorization = await authorizeAgentPlan({
  plan,
  agentAddress,
  worldSource: new MockWorldAgentAuthorizationProvider({
    registered: verified,
    humanBacked: verified,
  }),
});

console.log(`AGENT WALLET: ${agentAddress}`);
console.log("LIVE WORLD AGENTKIT: NO");
console.log(`AGENTBOOK REGISTERED: ${authorization.worldStatus?.registered ? "YES" : "NO"}`);
console.log(
  `HUMAN-BACKED AGENT: ${
    authorization.worldStatus?.humanBacked ? "VERIFIED" : "NOT VERIFIED"
  }`,
);
console.log(
  `FINAL EXECUTION PERMISSION: ${authorization.authorized ? "ALLOWED" : "BLOCKED"}`,
);
console.log(JSON.stringify(authorization, null, 2));
