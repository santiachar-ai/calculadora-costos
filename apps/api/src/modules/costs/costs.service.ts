import { prisma } from "../../lib/prisma";

import { saveCostConfigurationSchema } from "./costs.schemas";

const ACTIVE_CONFIG_KEY = "active";

export async function getCostConfiguration() {
  const configuration = await prisma.costConfiguration.findUnique({
    where: {
      key: ACTIVE_CONFIG_KEY,
    },
  });

  if (!configuration) {
    return {
      params: null,
      purchaseRules: [],
      salesRules: [],
    };
  }

  return {
    params: JSON.parse(configuration.paramsJson),
    purchaseRules: JSON.parse(configuration.purchaseRulesJson),
    salesRules: JSON.parse(configuration.salesRulesJson),
  };
}

export async function saveCostConfiguration(input: unknown) {
  const data = saveCostConfigurationSchema.parse(input);

  const configuration = await prisma.costConfiguration.upsert({
    where: {
      key: ACTIVE_CONFIG_KEY,
    },
    create: {
      key: ACTIVE_CONFIG_KEY,
      paramsJson: JSON.stringify(data.params),
      purchaseRulesJson: JSON.stringify(data.purchaseRules),
      salesRulesJson: JSON.stringify(data.salesRules),
    },
    update: {
      paramsJson: JSON.stringify(data.params),
      purchaseRulesJson: JSON.stringify(data.purchaseRules),
      salesRulesJson: JSON.stringify(data.salesRules),
    },
  });

  return {
    id: configuration.id,
    updatedAt: configuration.updatedAt,
  };
}
