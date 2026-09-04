import { LitClinicClient, LitClinicConfigurationError } from "@litclinic-ethonline/sdk";

import { MockLitClinicContextProvider } from "./mock";
import { RemoteLitClinicContextProvider } from "./remote";
import type { LitClinicContextMode, LitClinicContextProvider } from "./types";

type RuntimeEnvironment = Record<string, string | undefined>;

export type ContextProviderFactoryOptions = {
  defaultMode?: LitClinicContextMode;
};

export function createContextProviderFromEnv(
  env: RuntimeEnvironment,
  options: ContextProviderFactoryOptions = {},
): LitClinicContextProvider {
  const mode = env.LITCLINIC_CONTEXT_MODE?.trim() || options.defaultMode;

  if (mode === "mock") {
    return new MockLitClinicContextProvider();
  }
  if (mode !== "remote") {
    throw new LitClinicConfigurationError(
      "LITCLINIC_CONTEXT_MODE must be set to mock or remote.",
    );
  }

  return new RemoteLitClinicContextProvider(
    new LitClinicClient({
      baseUrl: requiredEnv(env, "LITCLINIC_API_URL"),
      serviceToken: requiredEnv(env, "LITCLINIC_SERVICE_TOKEN"),
      contextEndpoint: requiredEnv(env, "LITCLINIC_CONTEXT_ENDPOINT"),
    }),
  );
}

function requiredEnv(env: RuntimeEnvironment, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new LitClinicConfigurationError(`${name} is required in remote mode.`);
  }
  return value;
}
