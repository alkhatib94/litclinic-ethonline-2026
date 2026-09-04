export {
  careAgentContextV1Schema,
  ethereumAddressSchema,
  parseEthereumAddress,
  type Address,
  type CareAgentContext,
  type CareAgentContextV1,
} from "./care-agent-context";
export {
  graphOnchainContextV1Schema,
  type GraphOnchainContext,
  type GraphOnchainContextV1,
} from "./graph-onchain-context";

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
