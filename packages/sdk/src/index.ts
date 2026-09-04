export type LitClinicApiClientOptions = {
  baseUrl: URL;
  getAccessToken?: () => Promise<string>;
};

export type LitClinicApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

// The HTTP client will be implemented after the public endpoint contract is approved.
export function createLitClinicApiClient(_options: LitClinicApiClientOptions): never {
  throw new Error("LitClinic API client is not implemented yet.");
}
