export type TheGraphErrorCode =
  | "ABORTED"
  | "CONFIGURATION_ERROR"
  | "GRAPHQL_ERROR"
  | "HTTP_ERROR"
  | "INVALID_WALLET_ADDRESS"
  | "MALFORMED_RESPONSE"
  | "NETWORK_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "TIMEOUT";

export class TheGraphProviderError extends Error {
  readonly code: TheGraphErrorCode;

  constructor(code: TheGraphErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class TheGraphConfigurationError extends TheGraphProviderError {
  constructor(message = "The Graph provider configuration is invalid.") {
    super("CONFIGURATION_ERROR", message);
  }
}

export class TheGraphInvalidWalletError extends TheGraphProviderError {
  constructor() {
    super("INVALID_WALLET_ADDRESS", "A valid Ethereum wallet address is required.");
  }
}

export class TheGraphHttpError extends TheGraphProviderError {
  readonly status: number;

  constructor(status: number) {
    super("HTTP_ERROR", `The Graph request failed with HTTP status ${status}.`);
    this.status = status;
  }
}

export class TheGraphGraphqlError extends TheGraphProviderError {
  constructor() {
    super("GRAPHQL_ERROR", "The Graph returned a GraphQL error.");
  }
}

export class TheGraphMalformedResponseError extends TheGraphProviderError {
  constructor() {
    super("MALFORMED_RESPONSE", "The Graph returned an invalid response.");
  }
}

export class TheGraphNetworkError extends TheGraphProviderError {
  constructor() {
    super("NETWORK_ERROR", "The Graph provider could not be reached.");
  }
}

export class TheGraphTimeoutError extends TheGraphProviderError {
  constructor() {
    super("TIMEOUT", "The Graph request timed out.");
  }
}

export class TheGraphAbortError extends TheGraphProviderError {
  constructor() {
    super("ABORTED", "The Graph request was aborted.");
  }
}

export class TheGraphPayloadTooLargeError extends TheGraphProviderError {
  constructor() {
    super("PAYLOAD_TOO_LARGE", "The Graph response was too large.");
  }
}
