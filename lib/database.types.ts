export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          balance: number
          category: Database["public"]["Enums"]["asset_category"]
          created_at: string
          id: string
          income_split_percent: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          category: Database["public"]["Enums"]["asset_category"]
          created_at?: string
          id?: string
          income_split_percent?: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          category?: Database["public"]["Enums"]["asset_category"]
          created_at?: string
          id?: string
          income_split_percent?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category_id: string
          created_at: string
          id: string
          limit_amount: number
          month: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          limit_amount: number
          month: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          limit_amount?: number
          month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_tokens: {
        Row: {
          created_at: string
          default_asset_id: string | null
          last_used_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_asset_id?: string | null
          last_used_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_asset_id?: string | null
          last_used_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          label_zh: string
          sort_order: number
          type: Database["public"]["Enums"]["category_type"]
        }
        Insert: {
          icon?: string | null
          id?: string
          label_zh: string
          sort_order?: number
          type: Database["public"]["Enums"]["category_type"]
        }
        Update: {
          icon?: string | null
          id?: string
          label_zh?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["category_type"]
        }
        Relationships: []
      }
      financial_profile: {
        Row: {
          existing_monthly_debt: number
          monthly_expense_override: number | null
          monthly_income: number
          spending_style: Database["public"]["Enums"]["spending_style"] | null
          target_car_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          existing_monthly_debt?: number
          monthly_expense_override?: number | null
          monthly_income?: number
          spending_style?: Database["public"]["Enums"]["spending_style"] | null
          target_car_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          existing_monthly_debt?: number
          monthly_expense_override?: number | null
          monthly_income?: number
          spending_style?: Database["public"]["Enums"]["spending_style"] | null
          target_car_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          amount: number
          created_at: string
          goal_id: string
          id: string
          note: string | null
          occurred_on: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          occurred_on?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          occurred_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          balance: number
          category: Database["public"]["Enums"]["liability_category"]
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          category: Database["public"]["Enums"]["liability_category"]
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          category?: Database["public"]["Enums"]["liability_category"]
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liability_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          liability_id: string
          note: string | null
          occurred_on: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          liability_id: string
          note?: string | null
          occurred_on?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          liability_id?: string
          note?: string | null
          occurred_on?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          archived: boolean
          asset_id: string | null
          created_at: string
          current_amount: number
          id: string
          name: string
          target_amount: number
          target_date: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean
          asset_id?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          name: string
          target_amount: number
          target_date?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean
          asset_id?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          asset_id: string | null
          category_id: string
          created_at: string
          id: string
          merchant: string | null
          note: string | null
          occurred_on: string
          original_amount: number | null
          original_currency: string | null
          raw_text: string | null
          source: string
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          asset_id?: string | null
          merchant?: string | null
          note?: string | null
          original_amount?: number | null
          original_currency?: string | null
          raw_text?: string | null
          source?: string
          occurred_on?: string
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          asset_id?: string | null
          merchant?: string | null
          note?: string | null
          original_amount?: number | null
          original_currency?: string | null
          raw_text?: string | null
          source?: string
          occurred_on?: string
          type?: Database["public"]["Enums"]["category_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_passcode_state: { Args: never; Returns: string }
      change_app_passcode: { Args: { p_new: string }; Returns: undefined }
      remember_merchant_category: { Args: { p_merchant: string; p_category_id: string }; Returns: number }
      capture_transaction: {
        Args: {
          p_amount: number
          p_category_label: string
          p_merchant: string
          p_occurred_on: string
          p_original_amount?: number
          p_original_currency?: string
          p_raw_text: string
          p_token: string
        }
        Returns: Json
      }
    }
    Enums: {
      asset_category:
        | "cash"
        | "savings"
        | "investment"
        | "property"
        | "other_asset"
      category_type: "income" | "expense"
      liability_category:
        | "loan"
        | "credit_card"
        | "mortgage"
        | "other_liability"
      spending_style:
        | "daily_life"
        | "online_shopping"
        | "travel"
        | "dining"
        | "mixed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      asset_category: [
        "cash",
        "savings",
        "investment",
        "property",
        "other_asset",
      ],
      category_type: ["income", "expense"],
      liability_category: [
        "loan",
        "credit_card",
        "mortgage",
        "other_liability",
      ],
      spending_style: [
        "daily_life",
        "online_shopping",
        "travel",
        "dining",
        "mixed",
      ],
    },
  },
} as const
