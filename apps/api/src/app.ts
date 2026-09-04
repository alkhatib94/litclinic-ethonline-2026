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
import { Hono } from "hono";

import type { LitClinicContextProvider } from "./providers/types";

export type CreateApiAppOptions = {
  provider: LitClinicContextProvider;
};

export function createApiApp({ provider }: CreateApiAppOptions) {
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

  return app;
}
