export type WorldAgentkitErrorCode =
  | "ABORTED"
  | "CONFIGURATION_ERROR"
  | "INVALID_AGENT_ADDRESS"
  | "MALFORMED_AGENTBOOK_RESULT"
  | "TIMEOUT"
  | "VERIFICATION_UNAVAILABLE";

export class WorldAgentkitError extends Error {
  readonly code: WorldAgentkitErrorCode;

  constructor(code: WorldAgentkitErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class WorldAgentkitConfigurationError extends WorldAgentkitError {
  constructor(message = "World AgentKit configuration is invalid.") {
    super("CONFIGURATION_ERROR", message);
  }
}

export class WorldAgentkitInvalidAddressError extends WorldAgentkitError {
  constructor() {
    super("INVALID_AGENT_ADDRESS", "A valid agent wallet address is required.");
  }
}

export class WorldAgentkitMalformedResultError extends WorldAgentkitError {
  constructor() {
    super(
      "MALFORMED_AGENTBOOK_RESULT",
      "World AgentKit returned an invalid AgentBook result.",
    );
  }
}

export class WorldAgentkitTimeoutError extends WorldAgentkitError {
  constructor() {
    super("TIMEOUT", "World AgentKit verification timed out.");
  }
}

export class WorldAgentkitAbortError extends WorldAgentkitError {
  constructor() {
    super("ABORTED", "World AgentKit verification was aborted.");
  }
}

export class WorldAgentkitUnavailableError extends WorldAgentkitError {
  constructor() {
    super(
      "VERIFICATION_UNAVAILABLE",
      "World AgentKit verification is unavailable.",
    );
  }
}
