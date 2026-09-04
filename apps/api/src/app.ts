import {
  AgentContextValidationError,
  composeAgentContext,
  planAgentAction,
} from "@litclinic-ethonline/agent-core";
import {
  LitClinicAbortError,
  LitClinicHttpError,
  LitClinicMalformedResponseError,
  LitClinicNetworkError,
  LitClinicPayloadTooLargeError,
  LitClinicTimeoutError,
  UnsupportedContextVersionError,
} from "@litclinic-ethonline/sdk";
import {
  ethereumAddressSchema,
  type ApiFailure,
  type ApiSuccess,
  type CareAgentContext,
} from "@litclinic-ethonline/shared";
import {
  TheGraphAbortError,
  TheGraphHttpError,
  TheGraphProviderError,
  TheGraphTimeoutError,
  type GraphOnchainContextProvider,
} from "@litclinic-ethonline/the-graph";
import { Hono } from "hono";

import type { LitClinicContextProvider } from "./providers/types";

export type CreateApiAppOptions = {
  provider: LitClinicContextProvider;
  onchainProvider?: GraphOnchainContextProvider;
};

export function createApiApp({ provider, onchainProvider }: CreateApiAppOptions) {
  const app = new Hono();

  app.use("*", async (context, next) => {
    await next();
    context.header("Cache-Control", "no-store");
    context.header("X-Content-Type-Options", "nosniff");
  });

  app.get("/health", (context) =>
    context.json({
      ok: true,
      status: "healthy",
      mode: provider.mode,
      graph: onchainProvider ? "live" : "unconfigured",
    }),
  );

  app.get("/api/v1/context/:wallet", async (context) => {
    const walletResult = ethereumAddressSchema.safeParse(context.req.param("wallet"));
    if (!walletResult.success) {
      return context.json<ApiFailure>(
        {
          ok: false,
          code: "INVALID_WALLET_ADDRESS",
          message: "A valid Ethereum wallet address is required.",
        },
        400,
      );
    }

    try {
      const data = await provider.getContext({
        walletAddress: walletResult.data,
        signal: context.req.raw.signal,
      });
      return context.json<ApiSuccess<CareAgentContext>>({ ok: true, data });
    } catch (error) {
      if (error instanceof LitClinicHttpError && error.status === 404) {
        return context.json<ApiFailure>(
          {
            ok: false,
            code: "CONTEXT_NOT_FOUND",
            message: "No care agent context is available for this wallet.",
          },
          404,
        );
      }
      if (error instanceof LitClinicTimeoutError) {
        return context.json<ApiFailure>(
          {
            ok: false,
            code: "UPSTREAM_TIMEOUT",
            message: "The context provider timed out.",
          },
          504,
        );
      }
      if (
        error instanceof LitClinicHttpError ||
        error instanceof LitClinicNetworkError ||
        error instanceof LitClinicMalformedResponseError ||
        error instanceof LitClinicPayloadTooLargeError ||
        error instanceof UnsupportedContextVersionError
      ) {
        return context.json<ApiFailure>(
          {
            ok: false,
            code: "UPSTREAM_ERROR",
            message: "The context provider could not return a valid response.",
          },
          502,
        );
      }
      if (error instanceof LitClinicAbortError) {
        return context.json<ApiFailure>(
          {
            ok: false,
            code: "REQUEST_ABORTED",
            message: "The context request was aborted.",
          },
          503,
        );
      }

      return context.json<ApiFailure>(
        {
          ok: false,
          code: "INTERNAL_ERROR",
          message: "The context request could not be completed.",
        },
        500,
      );
    }
  });

  app.get("/api/v1/agent-context/:wallet", async (context) => {
    const walletResult = ethereumAddressSchema.safeParse(context.req.param("wallet"));
    if (!walletResult.success) {
      return context.json<ApiFailure>(
        {
          ok: false,
          code: "INVALID_WALLET_ADDRESS",
          message: "A valid Ethereum wallet address is required.",
        },
        400,
      );
    }
    if (!onchainProvider) {
      return context.json<ApiFailure>(
        {
          ok: false,
          code: "GRAPH_PROVIDER_UNCONFIGURED",
          message: "Live onchain context is not configured.",
        },
        503,
      );
    }

    try {
      const data = await composeAgentContext({
        walletAddress: walletResult.data,
        careSource: provider,
        onchainSource: onchainProvider,
        signal: context.req.raw.signal,
      });
      return context.json({ ok: true, data });
    } catch (error) {
      const mapped = mapAgentContextError(error);
      return context.json<ApiFailure>(mapped.body, mapped.status);
    }
  });

  app.get("/api/v1/agent-plan/:wallet", async (context) => {
    const walletResult = ethereumAddressSchema.safeParse(context.req.param("wallet"));
    if (!walletResult.success) {
      return context.json<ApiFailure>(
        {
          ok: false,
          code: "INVALID_WALLET_ADDRESS",
          message: "A valid Ethereum wallet address is required.",
        },
        400,
      );
    }
    const action = context.req.query("action");
    if (action !== "continue_workflow" && action !== "request_payment") {
      return context.json<ApiFailure>(
        {
          ok: false,
          code: "INVALID_AGENT_ACTION",
          message: "Action must be continue_workflow or request_payment.",
        },
        400,
      );
    }
    if (!onchainProvider) {
      return context.json<ApiFailure>(
        {
          ok: false,
          code: "GRAPH_PROVIDER_UNCONFIGURED",
          message: "Live onchain context is not configured.",
        },
        503,
      );
    }

    try {
      const agentContext = await composeAgentContext({
        walletAddress: walletResult.data,
        careSource: provider,
        onchainSource: onchainProvider,
        signal: context.req.raw.signal,
      });
      const plan = planAgentAction(agentContext, { action });
      return context.json({
        ok: true,
        data: {
          context: agentContext,
          plan,
        },
      });
    } catch (error) {
      const mapped = mapAgentContextError(error);
      return context.json<ApiFailure>(mapped.body, mapped.status);
    }
  });

  return app;
}

type MappedAgentError = {
  body: ApiFailure;
  status: 500 | 502 | 503 | 504;
};

function mapAgentContextError(error: unknown): MappedAgentError {
  if (
    error instanceof TheGraphTimeoutError ||
    error instanceof LitClinicTimeoutError
  ) {
    return {
      body: {
        ok: false,
        code: "CONTEXT_TIMEOUT",
        message: "A required context provider timed out.",
      },
      status: 504,
    };
  }
  if (error instanceof TheGraphAbortError || error instanceof LitClinicAbortError) {
    return {
      body: {
        ok: false,
        code: "REQUEST_ABORTED",
        message: "The context request was aborted.",
      },
      status: 503,
    };
  }
  if (
    error instanceof TheGraphProviderError ||
    error instanceof LitClinicHttpError ||
    error instanceof LitClinicNetworkError ||
    error instanceof LitClinicMalformedResponseError ||
    error instanceof LitClinicPayloadTooLargeError ||
    error instanceof UnsupportedContextVersionError
  ) {
    const code =
      error instanceof TheGraphHttpError && error.status === 401
        ? "GRAPH_AUTH_FAILED"
        : "CONTEXT_PROVIDER_ERROR";
    return {
      body: {
        ok: false,
        code,
        message: "A required context provider could not return valid data.",
      },
      status: 502,
    };
  }
  if (error instanceof AgentContextValidationError) {
    return {
      body: {
        ok: false,
        code: "CONTEXT_MISMATCH",
        message: "The context providers returned inconsistent data.",
      },
      status: 502,
    };
  }
  return {
    body: {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "The agent context request could not be completed.",
    },
    status: 500,
  };
}
