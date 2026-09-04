import { LitClinicClient } from "@litclinic-ethonline/sdk";

import type { GetContextInput, LitClinicContextProvider } from "./types";

export class RemoteLitClinicContextProvider implements LitClinicContextProvider {
  readonly mode = "remote";
  readonly #client: LitClinicClient;

  constructor(client: LitClinicClient) {
    this.#client = client;
  }

  getContext({ walletAddress, signal }: GetContextInput) {
    return this.#client.getCareAgentContext({
      walletAddress,
      signal,
    });
  }
}
