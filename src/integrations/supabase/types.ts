export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      devices: {
        Row: {
          id: string
          asset_type: string
          model: string
          serial_number: string
          warehouse: string
          status: string
          order_id: string | null
          sales_order: string | null
          school_name: string | null
          nucleus_id: string | null
          profile_id: string | null
          sd_card_size: string | null
          deal_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          is_deleted: boolean
          created_by: string | null
          asset_status: string | null
          configuration: string | null
          product: string | null
          order_type: string | null
          material_type: string | null
          updated_by: string | null
          asset_group: string | null
          asset_check: string | null
        }
        Insert: {
          id?: string
          asset_type: string
          model: string
          serial_number: string
          warehouse: string
          status: string
          order_id?: string | null
          sales_order?: string | null
          school_name?: string | null
          nucleus_id?: string | null
          profile_id?: string | null
          sd_card_size?: string | null
          deal_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          is_deleted?: boolean
          created_by?: string | null
          asset_status?: string | null
          configuration?: string | null
          product?: string | null
          order_type?: string | null
          material_type?: string | null
          updated_by?: string | null
          asset_group?: string | null
          asset_check?: string | null
        }
        Update: {
          id?: string
          asset_type?: string
          model?: string
          serial_number?: string
          warehouse?: string
          status?: string
          order_id?: string | null
          sales_order?: string | null
          school_name?: string | null
          nucleus_id?: string | null
          profile_id?: string | null
          sd_card_size?: string | null
          deal_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          is_deleted?: boolean
          created_by?: string | null
          asset_status?: string | null
          configuration?: string | null
          product?: string | null
          order_type?: string | null
          material_type?: string | null
          updated_by?: string | null
          asset_group?: string | null
          asset_check?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          id: string
          material_type: string
          asset_type: string
          model: string
          quantity: number
          warehouse: string
          serial_numbers: string[]
          order_date: string
          sales_order: string
          school_name: string | null
          deal_id: string | null
          nucleus_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          is_deleted: boolean
          asset_status: string | null
          configuration: string | null
          product: string | null
          order_type: string | null
          updated_by: string | null
          created_by: string | null
          asset_group: string | null
          sd_card_size: string | null
          profile_id: string | null
        }
        Insert: {
          id?: string
          material_type: string
          asset_type: string
          model: string
          quantity: number
          warehouse: string
          serial_numbers: string[]
          order_date: string
          sales_order: string
          school_name?: string | null
          deal_id?: string | null
          nucleus_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          is_deleted?: boolean
          asset_status?: string | null
          configuration?: string | null
          product?: string | null
          order_type?: string | null
          updated_by?: string | null
          created_by?: string | null
          asset_group?: string | null
          sd_card_size?: string | null
          profile_id?: string | null
        }
        Update: {
          id?: string
          material_type?: string
          asset_type?: string
          model?: string
          quantity?: number
          warehouse?: string
          serial_numbers?: string[]
          order_date?: string
          sales_order?: string
          school_name?: string | null
          deal_id?: string | null
          nucleus_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          is_deleted?: boolean
          asset_status?: string | null
          configuration?: string | null
          product?: string | null
          order_type?: string | null
          updated_by?: string | null
          created_by?: string | null
          asset_group?: string | null
          sd_card_size?: string | null
          profile_id?: string | null
        }
        Relationships: []
      }
      history: {
        Row: {
          id: string
          table_name: string
          record_id: string
          old_data: Json | null
          new_data: Json | null
          changed_by: string | null
          created_at: string
          field_name: string | null
          sales_order: string | null
          updated_at: string
          updated_by: string
          operation: string | null
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          old_data?: Json | null
          new_data?: Json | null
          changed_by?: string | null
          created_at?: string
          field_name?: string | null
          sales_order?: string | null
          updated_at?: string
          updated_by: string
          operation?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          old_data?: Json | null
          new_data?: Json | null
          changed_by?: string | null
          created_at?: string
          field_name?: string | null
          sales_order?: string | null
          updated_at?: string
          updated_by?: string
          operation?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          department: string | null
          role: string | null
          account_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          department?: string | null
          role?: string | null
          account_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          department?: string | null
          role?: string | null
          account_type?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const