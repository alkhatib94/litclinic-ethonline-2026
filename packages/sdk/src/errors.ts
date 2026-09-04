export type LitClinicClientErrorCode =
  | "ABORTED"
  | "CONFIGURATION_ERROR"
  | "HTTP_ERROR"
  | "INVALID_WALLET_ADDRESS"
  | "MALFORMED_RESPONSE"
  | "NETWORK_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "TIMEOUT"
  | "UNSUPPORTED_CONTEXT_VERSION";

export class LitClinicClientError extends Error {
  readonly code: LitClinicClientErrorCode;

  constructor(code: LitClinicClientErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class LitClinicConfigurationError extends LitClinicClientError {
  constructor(message = "LitClinic client configuration is invalid.") {
    super("CONFIGURATION_ERROR", message);
  }
}

export class InvalidWalletAddressError extends LitClinicClientError {
  constructor() {
    super("INVALID_WALLET_ADDRESS", "A valid Ethereum wallet address is required.");
  }
}

export class LitClinicHttpError extends LitClinicClientError {
  readonly status: number;

  constructor(status: number) {
    super("HTTP_ERROR", `LitClinic request failed with HTTP status ${status}.`);
    this.status = status;
  }
}

export class LitClinicNetworkError extends LitClinicClientError {
  constructor() {
    super("NETWORK_ERROR", "LitClinic could not be reached.");
  }
}

export class LitClinicTimeoutError extends LitClinicClientError {
  constructor() {
    super("TIMEOUT", "LitClinic request timed out.");
  }
}

export class LitClinicAbortError extends LitClinicClientError {
  constructor() {
    super("ABORTED", "LitClinic request was aborted.");
  }
}

export class LitClinicMalformedResponseError extends LitClinicClientError {
  constructor() {
    super("MALFORMED_RESPONSE", "LitClinic returned an invalid context response.");
  }
}

export class LitClinicPayloadTooLargeError extends LitClinicClientError {
  constructor() {
    super("PAYLOAD_TOO_LARGE", "LitClinic returned a context response that was too large.");
  }
}

export class UnsupportedContextVersionError extends LitClinicClientError {
  constructor() {
    super("UNSUPPORTED_CONTEXT_VERSION", "LitClinic returned an unsupported context version.");
  }
}
