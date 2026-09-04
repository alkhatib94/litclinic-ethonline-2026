import { z } from "zod";

import { agentContextV1Schema, type AgentActionPlan } from "./agent-context";
import { ethereumAddressSchema } from "./care-agent-context";

export const humanBackedAgentStatusSchema = z.object({
  version: z.literal("1"),
  provider: z.literal("world-agentkit"),
  agentAddress: ethereumAddressSchema,
  registered: z.boolean(),
  humanBacked: z.boolean(),
  checkedAt: z.string().datetime({ offset: true }),
  live: z.boolean(),
});

export type HumanBackedAgentStatus = z.infer<
  typeof humanBackedAgentStatusSchema
>;

export const agentAuthorizationReasonSchema = z.enum([
  "verified-human-backed-agent",
  "agent-not-registered",
  "agent-not-human-backed",
  "verification-unavailable",
  "approval-not-required",
]);

export type AgentAuthorizationReason = z.infer<
  typeof agentAuthorizationReasonSchema
>;

export const agentAuthorizationResultSchema = z.object({
  version: z.literal("1"),
  authorized: z.boolean(),
  reason: agentAuthorizationReasonSchema,
  worldVerificationUsed: z.boolean(),
  worldStatus: humanBackedAgentStatusSchema.optional(),
});

export type AgentAuthorizationResult = z.infer<
  typeof agentAuthorizationResultSchema
>;

export type FinalAgentPlan = {
  context: z.infer<typeof agentContextV1Schema>;
  reasoning: AgentActionPlan;
  worldAuthorization: AgentAuthorizationResult;
  finalExecutionPermission: boolean;
};
