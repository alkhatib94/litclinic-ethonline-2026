import { createApiApp } from "./app";
import { createContextProviderFromEnv } from "./providers/factory";

const provider = createContextProviderFromEnv(process.env);
const app = createApiApp({ provider });
const port = parsePort(process.env.PORT);

export default {
  port,
  fetch: app.fetch,
};

function parsePort(value: string | undefined): number {
  if (value === undefined) return 3001;
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return port;
}
