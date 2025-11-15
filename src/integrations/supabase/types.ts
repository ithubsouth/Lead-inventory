export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      audit_check_history: {
        Row: {
          audited_at: string
          audited_by: string
          created_at: string | null
          device_id: string
          id: string
          new_asset_check: string
          old_asset_check: string | null
          serial_number: string
        }
        Insert: {
          audited_at?: string
          audited_by: string
          created_at?: string | null
          device_id: string
          id?: string
          new_asset_check: string
          old_asset_check?: string | null
          serial_number: string
        }
        Update: {
          audited_at?: string
          audited_by?: string
          created_at?: string | null
          device_id?: string
          id?: string
          new_asset_check?: string
          old_asset_check?: string | null
          serial_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_check_history_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_history: {
        Row: {
          asset_check: string
          audited_at: string
          audited_by: string
          created_at: string | null
          device_id: string
          id: number
          serial_number: string
        }
        Insert: {
          asset_check: string
          audited_at: string
          audited_by: string
          created_at?: string | null
          device_id: string
          id?: number
          serial_number: string
        }
        Update: {
          asset_check?: string
          audited_at?: string
          audited_by?: string
          created_at?: string | null
          device_id?: string
          id?: number
          serial_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_device"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          asset_check: string | null
          asset_condition: string | null
          asset_group: string | null
          asset_status: string | null
          asset_type: string
          audited_at: string | null
          audited_by: string | null
          configuration: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          far_code: number | null
          id: string
          is_deleted: boolean
          material: string | null
          material_type: string | null
          model: string
          nucleus_id: string | null
          order_id: string | null
          order_type: string | null
          product: string | null
          profile_id: string | null
          sales_order: string | null
          school_name: string | null
          sd_card_size: string | null
          serial_number: string
          size: string | null
          status: string
          updated_at: string
          updated_by: string | null
          warehouse: string
        }
        Insert: {
          asset_check?: string | null
          asset_condition?: string | null
          asset_group?: string | null
          asset_status?: string | null
          asset_type: string
          audited_at?: string | null
          audited_by?: string | null
          configuration?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          far_code?: number | null
          id?: string
          is_deleted?: boolean
          material?: string | null
          material_type?: string | null
          model: string
          nucleus_id?: string | null
          order_id?: string | null
          order_type?: string | null
          product?: string | null
          profile_id?: string | null
          sales_order?: string | null
          school_name?: string | null
          sd_card_size?: string | null
          serial_number: string
          size?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          warehouse: string
        }
        Update: {
          asset_check?: string | null
          asset_condition?: string | null
          asset_group?: string | null
          asset_status?: string | null
          asset_type?: string
          audited_at?: string | null
          audited_by?: string | null
          configuration?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          far_code?: number | null
          id?: string
          is_deleted?: boolean
          material?: string | null
          material_type?: string | null
          model?: string
          nucleus_id?: string | null
          order_id?: string | null
          order_type?: string | null
          product?: string | null
          profile_id?: string | null
          sales_order?: string | null
          school_name?: string | null
          sd_card_size?: string | null
          serial_number?: string
          size?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          warehouse?: string
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
      history: {
        Row: {
          changed_by: string | null
          created_at: string
          field_name: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string | null
          record_id: string
          sales_order: string | null
          table_name: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          field_name?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          record_id: string
          sales_order?: string | null
          table_name: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          field_name?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          record_id?: string
          sales_order?: string | null
          table_name?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      old: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          agreement_type: string | null
          asset_group: string | null
          asset_status: string | null
          asset_type: string
          configuration: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean
          material_type: string
          model: string
          nucleus_id: string | null
          order_date: string
          order_type: string | null
          product: string | null
          profile_id: string | null
          quantity: number
          sales_order: string
          school_name: string | null
          sd_card_size: string | null
          serial_numbers: string[]
          updated_at: string
          updated_by: string | null
          warehouse: string
        }
        Insert: {
          agreement_type?: string | null
          asset_group?: string | null
          asset_status?: string | null
          asset_type: string
          configuration?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          material_type: string
          model: string
          nucleus_id?: string | null
          order_date?: string
          order_type?: string | null
          product?: string | null
          profile_id?: string | null
          quantity?: number
          sales_order: string
          school_name?: string | null
          sd_card_size?: string | null
          serial_numbers?: string[]
          updated_at?: string
          updated_by?: string | null
          warehouse: string
        }
        Update: {
          agreement_type?: string | null
          asset_group?: string | null
          asset_status?: string | null
          asset_type?: string
          configuration?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          material_type?: string
          model?: string
          nucleus_id?: string | null
          order_date?: string
          order_type?: string | null
          product?: string | null
          profile_id?: string | null
          quantity?: number
          sales_order?: string
          school_name?: string | null
          sd_card_size?: string | null
          serial_numbers?: string[]
          updated_at?: string
          updated_by?: string | null
          warehouse?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          account_type: string | null
          created_at: string | null
          department: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          account_type?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          account_type?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_by_email: {
        Args: { email_param: string }
        Returns: {
          id: string
        }[]
      }
      update_asset_check_only: {
        Args: { ids: string[]; new_check: string }
        Returns: string[]
      }
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
