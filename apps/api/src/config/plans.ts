/**
 * Commercial plan catalogue.
 *
 * Prices are used by the vendor-side platform console to estimate MRR. They are
 * list prices in USD; discounts and taxes belong to the billing provider, not
 * here. Quotas are the seat and member caps a plan grants a gym brand.
 */
export const PLAN_PRICES = {
  STARTER: 29,
  GROWTH: 99,
  SCALE: 299,
} as const;

export const PLAN_QUOTAS = {
  STARTER: { quotaMembers: 500, quotaStaff: 5 },
  GROWTH: { quotaMembers: 5000, quotaStaff: 25 },
  SCALE: { quotaMembers: 100000, quotaStaff: 200 },
} as const;
