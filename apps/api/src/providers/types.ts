import type { Address, CareAgentContext } from "@litclinic-ethonline/shared";

export type LitClinicContextMode = "mock" | "remote";

export type GetContextInput = {
  walletAddress: Address;
  signal?: AbortSignal;
};

export interface LitClinicContextProvider {
  readonly mode: LitClinicContextMode;
  getContext(input: GetContextInput): Promise<CareAgentContext>;
}
