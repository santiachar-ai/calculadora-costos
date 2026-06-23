import { z } from "zod";

export const costRuleSchema = z.record(z.string(), z.unknown());

export const saveCostConfigurationSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  purchaseRules: z.array(costRuleSchema),
  salesRules: z.array(costRuleSchema),
});
