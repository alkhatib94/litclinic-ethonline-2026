export const UNISWAP_V3_WALLET_ACTIVITY_QUERY = `
  query WalletOnchainContext($wallet: Bytes!, $sampleSize: Int!) {
    _meta {
      block {
        number
      }
      hasIndexingErrors
    }
    walletSwaps: swaps(
      first: $sampleSize
      orderBy: timestamp
      orderDirection: desc
      where: { origin: $wallet }
    ) {
      timestamp
      transaction {
        id
      }
    }
    latestSwaps: swaps(
      first: 1
      orderBy: timestamp
      orderDirection: desc
    ) {
      timestamp
    }
  }
`;

export const UNISWAP_V3_WALLET_ACTIVITY_QUERY_ID =
  "uniswap-v3-wallet-swaps-v1" as const;
