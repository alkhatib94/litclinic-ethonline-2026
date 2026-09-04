export type Address = `0x${string}`;

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
