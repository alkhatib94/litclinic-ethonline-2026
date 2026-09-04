export type ExtensionConfig = {
  litclinicApiBaseUrl: URL;
  chainId: number;
  rpcUrl: URL;
};

export function defineConfig(config: ExtensionConfig): ExtensionConfig {
  return Object.freeze({ ...config });
}
