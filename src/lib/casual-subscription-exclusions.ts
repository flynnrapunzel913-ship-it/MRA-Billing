/** Legacy casual swim subscription plan IDs — billing moved to Casual Swimming module. */
export const EXCLUDED_CASUAL_SUBSCRIPTION_PLAN_IDS = [
  "sp_casual_adult",
  "spl_casual_adult",
  "sp_casual_child",
  "spl_casual_child",
] as const;

export const EXCLUDED_CASUAL_SUBSCRIPTION_PLAN_NAMES = [
  "Casual Swim Adult",
  "Casual Swim Below 5 Years",
] as const;

export function casualSubscriptionExclusionFilter() {
  return {
    NOT: {
      OR: [
        { id: { in: [...EXCLUDED_CASUAL_SUBSCRIPTION_PLAN_IDS] } },
        { planName: { in: [...EXCLUDED_CASUAL_SUBSCRIPTION_PLAN_NAMES] } },
      ],
    },
  };
}

export function isLegacyCasualSubscriptionPlanName(planName: string): boolean {
  const normalized = planName.trim();
  return (EXCLUDED_CASUAL_SUBSCRIPTION_PLAN_NAMES as readonly string[]).includes(normalized);
}
