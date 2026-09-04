import { z } from "zod";

import { agentContextV1Schema, type AgentActionPlan } from "./agent-context";
import { ethereumAddressSchema } from "./care-agent-context";

export const worldEnvironmentSchema = z.enum(["production", "sandbox"]);
export type WorldEnvironment = z.infer<typeof worldEnvironmentSchema>;

export const verificationSourceSchema = z.enum([
  "agentbook-production",
  "world-sandbox",
  "unverified",
]);
export type VerificationSource = z.infer<typeof verificationSourceSchema>;

export const humanBackedAgentStatusSchema = z.object({
  version: z.literal("1"),
  provider: z.literal("world-agentkit"),
  agentAddress: ethereumAddressSchema,
  registered: z.boolean(),
  humanBacked: z.boolean(),
  checkedAt: z.string().datetime({ offset: true }),
  live: z.boolean(),
  worldEnvironment: worldEnvironmentSchema.default("production"),
  verificationSource: verificationSourceSchema.default("agentbook-production"),
});

export type HumanBackedAgentStatus = z.infer<
  typeof humanBackedAgentStatusSchema
>;

export const sandboxSelfieStatusSchema = z.object({
  version: z.literal("1"),
  provider: z.literal("world-selfie-check"),
  worldEnvironment: z.literal("sandbox"),
  configured: z.boolean(),
  verified: z.boolean(),
  humanBacked: z.boolean(),
  verificationSource: z.enum(["world-sandbox", "unverified"]),
  checkedAt: z.string().datetime({ offset: true }),
  live: z.boolean(),
});

export type SandboxSelfieStatus = z.infer<typeof sandboxSelfieStatusSchema>;

export const agentAuthorizationReasonSchema = z.enum([
  "verified-human-backed-agent",
  "agent-not-registered",
  "agent-not-human-backed",
  "verification-unavailable",
  "approval-not-required",
  "sandbox-selfie-verified",
  "sandbox-selfie-unverified",
  "sandbox-not-configured",
]);

export type AgentAuthorizationReason = z.infer<
  typeof agentAuthorizationReasonSchema
>;

export const agentAuthorizationResultSchema = z.object({
  version: z.literal("1"),
  authorized: z.boolean(),
  reason: agentAuthorizationReasonSchema,
  worldVerificationUsed: z.boolean(),
  worldEnvironment: worldEnvironmentSchema.optional(),
  verificationSource: verificationSourceSchema.optional(),
  worldStatus: humanBackedAgentStatusSchema.optional(),
  sandboxStatus: sandboxSelfieStatusSchema.optional(),
});

export type AgentAuthorizationResult = z.infer<
  typeof agentAuthorizationResultSchema
>;

export const worldAuthorizationSummarySchema = z.object({
  version: z.literal("1"),
  worldEnvironment: worldEnvironmentSchema,
  productionAgentBook: z.object({
    connected: z.boolean(),
    registered: z.boolean(),
    humanBacked: z.boolean(),
    agentAddress: ethereumAddressSchema.optional(),
    verificationSource: verificationSourceSchema,
    blocker: z.string().optional(),
  }),
  sandboxSelfie: z.object({
    configured: z.boolean(),
    verified: z.boolean(),
    humanBacked: z.boolean(),
    verificationSource: verificationSourceSchema,
  }),
  authorizationMode: z.enum([
    "production-agentbook",
    "sandbox-demonstration",
    "blocked",
  ]),
  finalExecutionPermission: z.boolean(),
});

export type WorldAuthorizationSummary = z.infer<
  typeof worldAuthorizationSummarySchema
>;

export type FinalAgentPlan = {
  context: z.infer<typeof agentContextV1Schema>;
  reasoning: AgentActionPlan;
  worldAuthorization: AgentAuthorizationResult;
  finalExecutionPermission: boolean;
};
