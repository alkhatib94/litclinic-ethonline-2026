export {
  careAgentContextV1Schema,
  ethereumAddressSchema,
  parseEthereumAddress,
  type Address,
  type CareAgentContext,
  type CareAgentContextV1,
} from "./care-agent-context";
export {
  agentContextV1Schema,
  type AgentActionKind,
  type AgentActionPlan,
  type AgentContext,
  type AgentContextV1,
  type AgentDecisionReason,
} from "./agent-context";
export {
  graphOnchainContextV1Schema,
  type GraphOnchainContext,
  type GraphOnchainContextV1,
} from "./graph-onchain-context";
export {
  agentAuthorizationReasonSchema,
  agentAuthorizationResultSchema,
  humanBackedAgentStatusSchema,
  sandboxSelfieStatusSchema,
  verificationSourceSchema,
  worldAuthorizationSummarySchema,
  worldEnvironmentSchema,
  type AgentAuthorizationReason,
  type AgentAuthorizationResult,
  type FinalAgentPlan,
  type HumanBackedAgentStatus,
  type SandboxSelfieStatus,
  type VerificationSource,
  type WorldAuthorizationSummary,
  type WorldEnvironment,
} from "./world-agent-authorization";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  code: string;
  message: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
