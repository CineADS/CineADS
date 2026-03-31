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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automation_logs: {
        Row: {
          actions_executed: Json | null
          conditions_matched: Json | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          rule_id: string | null
          rule_name: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          actions_executed?: Json | null
          conditions_matched?: Json | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          rule_id?: string | null
          rule_name?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          actions_executed?: Json | null
          conditions_matched?: Json | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          rule_id?: string | null
          rule_name?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          last_triggered_at: string | null
          name: string
          priority: string
          rule_type: string
          status: string
          tenant_id: string
          trigger_count: number
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_triggered_at?: string | null
          name: string
          priority?: string
          rule_type?: string
          status?: string
          tenant_id: string
          trigger_count?: number
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_triggered_at?: string | null
          name?: string
          priority?: string
          rule_type?: string
          status?: string
          tenant_id?: string
          trigger_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          marketplace_mapping: Json | null
          name: string
          parent_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketplace_mapping?: Json | null
          name: string
          parent_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketplace_mapping?: Json | null
          name?: string
          parent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      category_attributes: {
        Row: {
          attribute_id: string
          category_id: string
          created_at: string
          id: string
          marketplace: string
          name: string
          required: boolean
          type: string
          values: Json | null
        }
        Insert: {
          attribute_id: string
          category_id: string
          created_at?: string
          id?: string
          marketplace: string
          name: string
          required?: boolean
          type?: string
          values?: Json | null
        }
        Update: {
          attribute_id?: string
          category_id?: string
          created_at?: string
          id?: string
          marketplace?: string
          name?: string
          required?: boolean
          type?: string
          values?: Json | null
        }
        Relationships: []
      }
      category_mappings: {
        Row: {
          created_at: string
          id: string
          internal_category_id: string
          marketplace: string
          marketplace_category_id: string
          marketplace_category_name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          internal_category_id: string
          marketplace: string
          marketplace_category_id: string
          marketplace_category_name?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          internal_category_id?: string
          marketplace?: string
          marketplace_category_id?: string
          marketplace_category_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_mappings_internal_category_id_fkey"
            columns: ["internal_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          marketplace: string
          message: string
          resolved: boolean | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          marketplace: string
          message: string
          resolved?: boolean | null
          tenant_id: string
          type?: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          marketplace?: string
          message?: string
          resolved?: boolean | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          issued_at: string | null
          nfe_key: string | null
          nfe_number: string | null
          order_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issued_at?: string | null
          nfe_key?: string | null
          nfe_number?: string | null
          order_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issued_at?: string | null
          nfe_key?: string | null
          nfe_number?: string | null
          order_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          marketplace: string
          name: string
          parent_id: string | null
          path: Json | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          marketplace: string
          name: string
          parent_id?: string | null
          path?: Json | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          marketplace?: string
          name?: string
          parent_id?: string | null
          path?: Json | null
        }
        Relationships: []
      }
      marketplace_integrations: {
        Row: {
          created_at: string
          credentials: Json | null
          id: string
          marketplace: string
          settings: Json | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json | null
          id?: string
          marketplace: string
          settings?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json | null
          id?: string
          marketplace?: string
          settings?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          created_at: string
          id: string
          integration_id: string
          listing_id: string | null
          marketplace: string | null
          price: number | null
          product_id: string
          status: string
          stock: number | null
          tenant_id: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          integration_id: string
          listing_id?: string | null
          marketplace?: string | null
          price?: number | null
          product_id: string
          status?: string
          stock?: number | null
          tenant_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          integration_id?: string
          listing_id?: string | null
          marketplace?: string | null
          price?: number | null
          product_id?: string
          status?: string
          stock?: number | null
          tenant_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "marketplace_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mlb_categories: {
        Row: {
          created_at: string | null
          depth: number
          id: string
          is_leaf: boolean
          name: string
          parent_id: string | null
          path_from_root: Json
          site_id: string
          total_items_in_this_category: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          depth?: number
          id: string
          is_leaf?: boolean
          name: string
          parent_id?: string | null
          path_from_root?: Json
          site_id?: string
          total_items_in_this_category?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          depth?: number
          id?: string
          is_leaf?: boolean
          name?: string
          parent_id?: string | null
          path_from_root?: Json
          site_id?: string
          total_items_in_this_category?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mlb_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "mlb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      mlb_sync_logs: {
        Row: {
          duration_seconds: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          started_at: string | null
          status: string | null
          total_processed: number | null
          total_upserted: number | null
        }
        Insert: {
          duration_seconds?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          total_processed?: number | null
          total_upserted?: number | null
        }
        Update: {
          duration_seconds?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          total_processed?: number | null
          total_upserted?: number | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          alert_email: string | null
          created_at: string | null
          frequency: string | null
          id: string
          integration_error_email: boolean | null
          listing_paused_email: boolean | null
          order_delayed_email: boolean | null
          order_risk_email: boolean | null
          stock_critical_email: boolean | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_email?: string | null
          created_at?: string | null
          frequency?: string | null
          id?: string
          integration_error_email?: boolean | null
          listing_paused_email?: boolean | null
          order_delayed_email?: boolean | null
          order_risk_email?: boolean | null
          stock_critical_email?: boolean | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_email?: string | null
          created_at?: string | null
          frequency?: string | null
          id?: string
          integration_error_email?: boolean | null
          listing_paused_email?: boolean | null
          order_delayed_email?: boolean | null
          order_risk_email?: boolean | null
          stock_critical_email?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price: number | null
          product_variant_id: string | null
          quantity: number
          title: string | null
        }
        Insert: {
          id?: string
          order_id: string
          price?: number | null
          product_variant_id?: string | null
          quantity?: number
          title?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          price?: number | null
          product_variant_id?: string | null
          quantity?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipping: {
        Row: {
          address: Json | null
          carrier: string | null
          created_at: string
          delivered_at: string | null
          id: string
          order_id: string
          shipped_at: string | null
          tracking_code: string | null
        }
        Insert: {
          address?: Json | null
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id: string
          shipped_at?: string | null
          tracking_code?: string | null
        }
        Update: {
          address?: Json | null
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id?: string
          shipped_at?: string | null
          tracking_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer: Json | null
          id: string
          marketplace: string | null
          order_number: string | null
          status: string
          tenant_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer?: Json | null
          id?: string
          marketplace?: string | null
          order_number?: string | null
          status?: string
          tenant_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer?: Json | null
          id?: string
          marketplace?: string | null
          order_number?: string | null
          status?: string
          tenant_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          supplier: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          supplier?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          supplier?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rule_history: {
        Row: {
          applied_at: string | null
          blocked_by_margin: boolean | null
          id: string
          margin_after: number | null
          margin_before: number | null
          marketplace: string | null
          price_after: number | null
          price_before: number | null
          product_id: string | null
          product_name: string | null
          product_variant_id: string | null
          rule_id: string | null
          sku: string | null
          tenant_id: string
        }
        Insert: {
          applied_at?: string | null
          blocked_by_margin?: boolean | null
          id?: string
          margin_after?: number | null
          margin_before?: number | null
          marketplace?: string | null
          price_after?: number | null
          price_before?: number | null
          product_id?: string | null
          product_name?: string | null
          product_variant_id?: string | null
          rule_id?: string | null
          sku?: string | null
          tenant_id: string
        }
        Update: {
          applied_at?: string | null
          blocked_by_margin?: boolean | null
          id?: string
          margin_after?: number | null
          margin_before?: number | null
          marketplace?: string | null
          price_after?: number | null
          price_before?: number | null
          product_id?: string | null
          product_name?: string | null
          product_variant_id?: string | null
          rule_id?: string | null
          sku?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_rule_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rule_history_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rule_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "price_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rule_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rules: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          min_margin_percent: number | null
          min_price: number | null
          name: string
          products_affected: number | null
          scope: Json | null
          starts_at: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          adjustment_type: string
          adjustment_value: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          min_margin_percent?: number | null
          min_price?: number | null
          name: string
          products_affected?: number | null
          scope?: Json | null
          starts_at: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          min_margin_percent?: number | null
          min_price?: number | null
          name?: string
          products_affected?: number | null
          scope?: Json | null
          starts_at?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          attribute_key: string
          attribute_value: string | null
          created_at: string
          id: string
          marketplace: string
          product_id: string
        }
        Insert: {
          attribute_key: string
          attribute_value?: string | null
          created_at?: string
          id?: string
          marketplace: string
          product_id: string
        }
        Update: {
          attribute_key?: string
          attribute_value?: string | null
          created_at?: string
          id?: string
          marketplace?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          is_primary: boolean | null
          position: number | null
          product_id: string
          url: string
        }
        Insert: {
          id?: string
          is_primary?: boolean | null
          position?: number | null
          product_id: string
          url: string
        }
        Update: {
          id?: string
          is_primary?: boolean | null
          position?: number | null
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          combination: Json | null
          cost: number | null
          created_at: string
          ean: string | null
          id: string
          price: number | null
          product_id: string
          sku: string | null
          stock: number | null
          warehouse_stocks: Json | null
        }
        Insert: {
          combination?: Json | null
          cost?: number | null
          created_at?: string
          ean?: string | null
          id?: string
          price?: number | null
          product_id: string
          sku?: string | null
          stock?: number | null
          warehouse_stocks?: Json | null
        }
        Update: {
          combination?: Json | null
          cost?: number | null
          created_at?: string
          ean?: string | null
          id?: string
          price?: number | null
          product_id?: string
          sku?: string | null
          stock?: number | null
          warehouse_stocks?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          created_at: string
          description: string | null
          ean: string | null
          id: string
          model: string | null
          sku: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          ean?: string | null
          id?: string
          model?: string | null
          sku?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          ean?: string | null
          id?: string
          model?: string | null
          sku?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_seen_at: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          customer_name: string | null
          description: string
          due_date: string
          id: string
          notes: string | null
          order_id: string | null
          received_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          customer_name?: string | null
          description: string
          due_date: string
          id?: string
          notes?: string | null
          order_id?: string | null
          received_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          customer_name?: string | null
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          received_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repricing_rules: {
        Row: {
          competitor_price: number | null
          created_at: string
          current_price: number | null
          id: string
          last_repriced_at: string | null
          marketplace: string
          max_price: number | null
          min_price: number
          product_id: string | null
          status: string
          strategy: string
          target_margin: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          competitor_price?: number | null
          created_at?: string
          current_price?: number | null
          id?: string
          last_repriced_at?: string | null
          marketplace: string
          max_price?: number | null
          min_price?: number
          product_id?: string | null
          status?: string
          strategy?: string
          target_margin?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          competitor_price?: number | null
          created_at?: string
          current_price?: number | null
          id?: string
          last_repriced_at?: string | null
          marketplace?: string
          max_price?: number | null
          min_price?: number
          product_id?: string | null
          status?: string
          strategy?: string
          target_margin?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repricing_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repricing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          reason: string | null
          resolved_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          product_variant_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          tenant_id: string
          type: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_variant_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          tenant_id: string
          type?: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_variant_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          tenant_id?: string
          type?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          order_id: string | null
          product_variant_id: string
          reserved_quantity: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          product_variant_id: string
          reserved_quantity?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          product_variant_id?: string
          reserved_quantity?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_rules: {
        Row: {
          created_at: string
          id: string
          marketplace: string
          max_available: number | null
          min_stock: number | null
          product_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketplace: string
          max_available?: number | null
          min_stock?: number | null
          product_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketplace?: string
          max_available?: number | null
          min_stock?: number | null
          product_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_dead_jobs: {
        Row: {
          created_at: string
          died_at: string
          error_message: string | null
          id: string
          marketplace: string
          original_job_id: string | null
          payload: Json | null
          priority: string
          retry_count: number
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          died_at?: string
          error_message?: string | null
          id?: string
          marketplace: string
          original_job_id?: string | null
          payload?: Json | null
          priority: string
          retry_count?: number
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          died_at?: string
          error_message?: string | null
          id?: string
          marketplace?: string
          original_job_id?: string | null
          payload?: Json | null
          priority?: string
          retry_count?: number
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_dead_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          marketplace: string
          max_retries: number
          payload: Json | null
          priority: string
          processed_at: string | null
          retry_count: number
          started_at: string | null
          status: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          marketplace: string
          max_retries?: number
          payload?: Json | null
          priority?: string
          processed_at?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          marketplace?: string
          max_retries?: number
          payload?: Json | null
          priority?: string
          processed_at?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          created_at: string
          entity: string
          id: string
          last_cursor: string | null
          last_synced_at: string
          marketplace: string
          metadata: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity: string
          id?: string
          last_cursor?: string | null
          last_synced_at?: string
          marketplace: string
          metadata?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity?: string
          id?: string
          last_cursor?: string | null
          last_synced_at?: string
          marketplace?: string
          metadata?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: Json | null
          cnpj: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          plan: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string
          id: string
          reference_id: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          reference_id?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          reference_id?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          active: boolean | null
          address: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          active?: boolean | null
          address?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          active?: boolean | null
          address?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: never; Returns: string }
      has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      has_tenant_access: { Args: { _tenant_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "operational" | "financial" | "viewer"
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
      app_role: ["admin", "operational", "financial", "viewer"],
    },
  },
} as const
