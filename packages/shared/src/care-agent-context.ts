import { getAddress, isAddress } from "viem";
import { z } from "zod";

export type Address = `0x${string}`;

export const ethereumAddressSchema = z
  .string()
  .refine((value) => isAddress(value, { strict: false }), {
    message: "A valid Ethereum wallet address is required.",
  })
  .transform((value) => getAddress(value) as Address);

const publicLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => !/[\u0000-\u001F\u007F]/u.test(value), {
    message: "Public labels cannot contain control characters.",
  });

/**
 * Public, allowlisted context for the ETHOnline care agent.
 *
 * Required fields establish identity, authorization, and provenance.
 * Optional fields may be absent when LitClinic does not expose them.
 * Unknown fields are stripped so future upstream additions cannot leak through.
 */
export const careAgentContextV1Schema = z.object({
  version: z.literal("1"),
  wallet: z.object({
    address: ethereumAddressSchema,
    chainId: z.number().int().positive().optional(),
  }),
  identity: z.object({
    displayName: publicLabelSchema.optional(),
    ensName: publicLabelSchema.optional(),
  }),
  account: z.object({
    exists: z.boolean(),
    tier: publicLabelSchema.optional(),
  }),
  permissions: z.object({
    canRequestAgentAction: z.boolean(),
    canRequestPayment: z.boolean(),
  }),
  onchain: z.object({
    activityCount: z.number().int().nonnegative().optional(),
    lastActivityAt: z.string().datetime({ offset: true }).optional(),
  }),
  metadata: z.object({
    generatedAt: z.string().datetime({ offset: true }),
    source: z.literal("litclinic"),
  }),
});

export type CareAgentContextV1 = z.infer<typeof careAgentContextV1Schema>;
export type CareAgentContext = CareAgentContextV1;

export function parseEthereumAddress(value: string): Address {
  return ethereumAddressSchema.parse(value);
}
