import { z } from "zod";

import { ethereumAddressSchema } from "./care-agent-context";

const transactionHashSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/u, "Invalid transaction hash.");

/**
 * Allowlisted live activity evidence returned by The Graph integration.
 * It contains aggregate protocol activity and provenance, never raw entities.
 */
export const graphOnchainContextV1Schema = z
  .object({
    version: z.literal("1"),
    wallet: z.object({
      address: ethereumAddressSchema,
    }),
    network: z.object({
      chainId: z.number().int().positive(),
      name: z.string().min(1).max(64),
    }),
    activity: z.object({
      protocol: z.literal("uniswap-v3"),
      observedSwapCount: z.number().int().nonnegative(),
      sampleLimit: z.number().int().positive(),
      hasObservedActivity: z.boolean(),
      lastActivityAt: z.string().datetime({ offset: true }).optional(),
      latestTransactionHash: transactionHashSchema.optional(),
    }),
    indexing: z.object({
      indexedBlockNumber: z.number().int().nonnegative(),
      latestProtocolActivityAt: z.string().datetime({ offset: true }).optional(),
      hasIndexingErrors: z.boolean(),
      queriedAt: z.string().datetime({ offset: true }),
      freshnessSeconds: z.number().int().nonnegative().optional(),
      isFresh: z.boolean(),
    }),
    provenance: z.object({
      provider: z.literal("the-graph"),
      product: z.literal("subgraph"),
      subgraphId: z.string().min(1).max(128),
      queryId: z.literal("uniswap-v3-wallet-swaps-v1"),
      live: z.literal(true),
    }),
  })
  .superRefine((context, refinement) => {
    const activityObserved = context.activity.observedSwapCount > 0;
    if (
      context.activity.observedSwapCount > context.activity.sampleLimit ||
      context.activity.hasObservedActivity !== activityObserved ||
      (activityObserved && !context.activity.lastActivityAt) ||
      (!activityObserved &&
        (context.activity.lastActivityAt || context.activity.latestTransactionHash))
    ) {
      refinement.addIssue({
        code: "custom",
        message: "The Graph activity summary is inconsistent.",
        path: ["activity"],
      });
    }
    if (
      (context.indexing.hasIndexingErrors && context.indexing.isFresh) ||
      (context.indexing.isFresh &&
        context.indexing.freshnessSeconds === undefined)
    ) {
      refinement.addIssue({
        code: "custom",
        message: "The Graph freshness summary is inconsistent.",
        path: ["indexing"],
      });
    }
  });

export type GraphOnchainContextV1 = z.infer<typeof graphOnchainContextV1Schema>;
export type GraphOnchainContext = GraphOnchainContextV1;
