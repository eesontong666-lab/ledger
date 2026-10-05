import type { Database } from "@/lib/database.types";

export type CategoryType = Database["public"]["Enums"]["category_type"];
export type AssetCategory = Database["public"]["Enums"]["asset_category"];
export type LiabilityCategory = Database["public"]["Enums"]["liability_category"];
export type SpendingStyle = Database["public"]["Enums"]["spending_style"];

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type Asset = Database["public"]["Tables"]["assets"]["Row"];
export type Liability = Database["public"]["Tables"]["liabilities"]["Row"];
export type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];
export type GoalContribution = Database["public"]["Tables"]["goal_contributions"]["Row"];
export type FinancialProfile = Database["public"]["Tables"]["financial_profile"]["Row"];
