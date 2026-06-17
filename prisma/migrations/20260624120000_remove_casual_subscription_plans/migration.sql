-- Casual swim is billed via CasualSwimBill module, not subscriptions.
DELETE FROM "SubscriptionPlan"
WHERE "planName" IN ('Casual Swim Adult', 'Casual Swim Below 5 Years')
   OR "id" IN ('sp_casual_adult', 'spl_casual_adult', 'sp_casual_child', 'spl_casual_child');
