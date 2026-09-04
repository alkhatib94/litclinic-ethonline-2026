export {
  careAgentContextV1Schema,
  ethereumAddressSchema,
  parseEthereumAddress,
  type Address,
  type CareAgentContext,
  type CareAgentContextV1,
} from "./care-agent-context";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  code: string;
  message: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
