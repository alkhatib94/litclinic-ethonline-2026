import type { CareAgentContext } from "@litclinic-ethonline/shared";

import type { GetContextInput, LitClinicContextProvider } from "./types";

const MOCK_GENERATED_AT = "2026-09-04T00:00:00.000Z";
const MOCK_LAST_ACTIVITY_AT = "2026-09-03T12:00:00.000Z";

export class MockLitClinicContextProvider implements LitClinicContextProvider {
  readonly mode = "mock";

  async getContext({ walletAddress }: GetContextInput): Promise<CareAgentContext> {
    const activityCount = Number.parseInt(walletAddress.slice(-4), 16) % 128;

    return {
      version: "1",
      wallet: {
        address: walletAddress,
      },
      identity: {
        displayName: `Demo ${walletAddress.slice(2, 8)}`,
      },
      account: {
        exists: true,
        tier: "demo",
      },
      permissions: {
        canRequestAgentAction: true,
        canRequestPayment: false,
      },
      onchain: {
        activityCount,
        ...(activityCount > 0 ? { lastActivityAt: MOCK_LAST_ACTIVITY_AT } : {}),
      },
      metadata: {
        generatedAt: MOCK_GENERATED_AT,
        source: "litclinic",
      },
    };
  }
}
