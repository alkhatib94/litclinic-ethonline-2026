import { z } from "zod";

import { careAgentContextV1Schema, ethereumAddressSchema } from "./care-agent-context";
import { graphOnchainContextV1Schema } from "./graph-onchain-context";

export const agentContextV1Schema = z
  .object({
    version: z.literal("1"),
    wallet: z.object({
      address: ethereumAddressSchema,
    }),
    litclinic: careAgentContextV1Schema,
    onchain: graphOnchainContextV1Schema,
    metadata: z.object({
      composedAt: z.string().datetime({ offset: true }),
      sources: z.tuple([z.literal("litclinic"), z.literal("the-graph")]),
    }),
  })
  .superRefine((context, refinement) => {
    const expected = context.wallet.address.toLowerCase();
    if (
      context.litclinic.wallet.address.toLowerCase() !== expected ||
      context.onchain.wallet.address.toLowerCase() !== expected
    ) {
      refinement.addIssue({
        code: "custom",
        message: "Agent context sources must describe the requested wallet.",
        path: ["wallet", "address"],
      });
    }
  });

export type AgentContextV1 = z.infer<typeof agentContextV1Schema>;
export type AgentContext = AgentContextV1;

export type AgentActionKind = "continue_workflow" | "request_payment";

export type AgentDecisionReason =
  | "AGENT_ACTION_NOT_ALLOWED"
  | "GRAPH_INDEXING_ERROR"
  | "GRAPH_DATA_STALE"
  | "NO_OBSERVED_ONCHAIN_ACTIVITY"
  | "ONCHAIN_ACTIVITY_STALE"
  | "PAYMENT_NOT_AVAILABLE"
  | "PAYMENT_REQUIRES_APPROVAL"
  | "LIVE_ONCHAIN_CONTEXT_CONFIRMED";

export type AgentActionPlan = {
  version: "1";
  action: AgentActionKind;
  decision: "continue" | "require_approval";
  reasons: AgentDecisionReason[];
  evidence: {
    graphProvider: "the-graph";
    graphQueryId: "uniswap-v3-wallet-swaps-v1";
    indexedBlockNumber: number;
    graphQueriedAt: string;
    lastWalletActivityAt?: string;
  };
};
