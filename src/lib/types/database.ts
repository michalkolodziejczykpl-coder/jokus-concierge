export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          apartment: string | null;
          building: string;
          city: string;
          created_at: string | null;
          estate_id: string | null;
          id: string;
          is_default: boolean;
          label: string;
          notes: string | null;
          point: unknown;
          postal_code: string;
          street: string;
          user_id: string;
        };
        Insert: {
          apartment?: string | null;
          building: string;
          city: string;
          created_at?: string | null;
          estate_id?: string | null;
          id?: string;
          is_default?: boolean;
          label?: string;
          notes?: string | null;
          point?: unknown;
          postal_code: string;
          street: string;
          user_id: string;
        };
        Update: {
          apartment?: string | null;
          building?: string;
          city?: string;
          created_at?: string | null;
          estate_id?: string | null;
          id?: string;
          is_default?: boolean;
          label?: string;
          notes?: string | null;
          point?: unknown;
          postal_code?: string;
          street?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'addresses_estate_id_fkey';
            columns: ['estate_id'];
            isOneToOne: false;
            referencedRelation: 'estates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'addresses_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      ai_intents: {
        Row: {
          action_params: Json | null;
          canonical_response: string;
          created_at: string | null;
          embedding: string | null;
          follow_up_action: string | null;
          id: string;
          intent_key: string;
          module_id: string;
          sample_questions: string[];
          updated_at: string | null;
        };
        Insert: {
          action_params?: Json | null;
          canonical_response: string;
          created_at?: string | null;
          embedding?: string | null;
          follow_up_action?: string | null;
          id?: string;
          intent_key: string;
          module_id: string;
          sample_questions: string[];
          updated_at?: string | null;
        };
        Update: {
          action_params?: Json | null;
          canonical_response?: string;
          created_at?: string | null;
          embedding?: string | null;
          follow_up_action?: string | null;
          id?: string;
          intent_key?: string;
          module_id?: string;
          sample_questions?: string[];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_intents_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          ip_address: unknown;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: unknown;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: unknown;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      cart_items: {
        Row: {
          added_at: string | null;
          note: string | null;
          product_id: string;
          quantity: number;
          user_id: string;
        };
        Insert: {
          added_at?: string | null;
          note?: string | null;
          product_id: string;
          quantity?: number;
          user_id: string;
        };
        Update: {
          added_at?: string | null;
          note?: string | null;
          product_id?: string;
          quantity?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cart_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cart_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      estates: {
        Row: {
          boundary: unknown;
          city: string;
          created_at: string | null;
          id: string;
          is_active: boolean;
          launched_at: string | null;
          name: string;
          postal_codes: string[] | null;
          voivodeship: string;
        };
        Insert: {
          boundary?: unknown;
          city: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean;
          launched_at?: string | null;
          name: string;
          postal_codes?: string[] | null;
          voivodeship: string;
        };
        Update: {
          boundary?: unknown;
          city?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean;
          launched_at?: string | null;
          name?: string;
          postal_codes?: string[] | null;
          voivodeship?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          created_at: string | null;
          product_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          product_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          product_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      fee_config: {
        Row: {
          cashback_pct: number;
          created_at: string | null;
          created_by: string | null;
          effective_from: string;
          gastro_base_fee: number | null;
          gastro_included_km: number | null;
          gastro_per_km_fee: number | null;
          id: string;
          jokusor_share: number;
          order_type: string;
          payment_cost_mode: string;
        };
        Insert: {
          cashback_pct?: number;
          created_at?: string | null;
          created_by?: string | null;
          effective_from?: string;
          gastro_base_fee?: number | null;
          gastro_included_km?: number | null;
          gastro_per_km_fee?: number | null;
          id?: string;
          jokusor_share: number;
          order_type: string;
          payment_cost_mode?: string;
        };
        Update: {
          cashback_pct?: number;
          created_at?: string | null;
          created_by?: string | null;
          effective_from?: string;
          gastro_base_fee?: number | null;
          gastro_included_km?: number | null;
          gastro_per_km_fee?: number | null;
          id?: string;
          jokusor_share?: number;
          order_type?: string;
          payment_cost_mode?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fee_config_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      gastro_orders: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          delivered_on: string;
          distance_km: number;
          fee: number;
          fee_config_id: string;
          id: string;
          jokusor_id: string;
          jokusor_share_frozen: number;
          notes: string | null;
          restaurant_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          delivered_on: string;
          distance_km: number;
          fee: number;
          fee_config_id: string;
          id?: string;
          jokusor_id: string;
          jokusor_share_frozen: number;
          notes?: string | null;
          restaurant_id: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          delivered_on?: string;
          distance_km?: number;
          fee?: number;
          fee_config_id?: string;
          id?: string;
          jokusor_id?: string;
          jokusor_share_frozen?: number;
          notes?: string | null;
          restaurant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gastro_orders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gastro_orders_fee_config_id_fkey';
            columns: ['fee_config_id'];
            isOneToOne: false;
            referencedRelation: 'fee_config';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gastro_orders_jokusor_id_fkey';
            columns: ['jokusor_id'];
            isOneToOne: false;
            referencedRelation: 'jokusors';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'gastro_orders_restaurant_id_fkey';
            columns: ['restaurant_id'];
            isOneToOne: false;
            referencedRelation: 'restaurants';
            referencedColumns: ['id'];
          }
        ];
      };
      invoices: {
        Row: {
          commission_amount: number;
          created_at: string | null;
          id: string;
          invoice_number: string | null;
          issued_at: string | null;
          jokusor_id: string;
          paid_at: string | null;
          pdf_url: string | null;
          period_end: string;
          period_start: string;
          status: string;
          subscription_amount: number;
          total_amount: number;
          vat_amount: number;
        };
        Insert: {
          commission_amount?: number;
          created_at?: string | null;
          id?: string;
          invoice_number?: string | null;
          issued_at?: string | null;
          jokusor_id: string;
          paid_at?: string | null;
          pdf_url?: string | null;
          period_end: string;
          period_start: string;
          status?: string;
          subscription_amount?: number;
          total_amount: number;
          vat_amount: number;
        };
        Update: {
          commission_amount?: number;
          created_at?: string | null;
          id?: string;
          invoice_number?: string | null;
          issued_at?: string | null;
          jokusor_id?: string;
          paid_at?: string | null;
          pdf_url?: string | null;
          period_end?: string;
          period_start?: string;
          status?: string;
          subscription_amount?: number;
          total_amount?: number;
          vat_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_jokusor_id_fkey';
            columns: ['jokusor_id'];
            isOneToOne: false;
            referencedRelation: 'jokusors';
            referencedColumns: ['user_id'];
          }
        ];
      };
      jokusor_modules: {
        Row: {
          accepts: boolean;
          custom_price: number | null;
          jokusor_id: string;
          module_id: string;
        };
        Insert: {
          accepts?: boolean;
          custom_price?: number | null;
          jokusor_id: string;
          module_id: string;
        };
        Update: {
          accepts?: boolean;
          custom_price?: number | null;
          jokusor_id?: string;
          module_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'jokusor_modules_jokusor_id_fkey';
            columns: ['jokusor_id'];
            isOneToOne: false;
            referencedRelation: 'jokusors';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'jokusor_modules_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          }
        ];
      };
      jokusors: {
        Row: {
          background_check_url: string | null;
          bank_account: string | null;
          billing_model: Database['public']['Enums']['billing_model'];
          bio: string | null;
          business_name: string | null;
          commission_rate: number | null;
          completed_jobs_count: number;
          contract_signed_at: string | null;
          created_at: string | null;
          estate_id: string;
          insurance_doc_url: string | null;
          insurance_oc_amount: number | null;
          insurance_valid_until: string | null;
          is_active: boolean;
          max_concurrent_orders: number;
          nip: string | null;
          onboarding_status: string;
          payout_share: number | null;
          public_photo_url: string | null;
          rating: number | null;
          regon: string | null;
          service_area: unknown;
          service_postal_codes: string[] | null;
          service_streets: string[] | null;
          subscription_amount: number | null;
          updated_at: string | null;
          user_id: string;
          vacation_until: string | null;
          working_hours: Json | null;
        };
        Insert: {
          background_check_url?: string | null;
          bank_account?: string | null;
          billing_model?: Database['public']['Enums']['billing_model'];
          bio?: string | null;
          business_name?: string | null;
          commission_rate?: number | null;
          completed_jobs_count?: number;
          contract_signed_at?: string | null;
          created_at?: string | null;
          estate_id: string;
          insurance_doc_url?: string | null;
          insurance_oc_amount?: number | null;
          insurance_valid_until?: string | null;
          is_active?: boolean;
          max_concurrent_orders?: number;
          nip?: string | null;
          onboarding_status?: string;
          payout_share?: number | null;
          public_photo_url?: string | null;
          rating?: number | null;
          regon?: string | null;
          service_area?: unknown;
          service_postal_codes?: string[] | null;
          service_streets?: string[] | null;
          subscription_amount?: number | null;
          updated_at?: string | null;
          user_id: string;
          vacation_until?: string | null;
          working_hours?: Json | null;
        };
        Update: {
          background_check_url?: string | null;
          bank_account?: string | null;
          billing_model?: Database['public']['Enums']['billing_model'];
          bio?: string | null;
          business_name?: string | null;
          commission_rate?: number | null;
          completed_jobs_count?: number;
          contract_signed_at?: string | null;
          created_at?: string | null;
          estate_id?: string;
          insurance_doc_url?: string | null;
          insurance_oc_amount?: number | null;
          insurance_valid_until?: string | null;
          is_active?: boolean;
          max_concurrent_orders?: number;
          nip?: string | null;
          onboarding_status?: string;
          payout_share?: number | null;
          public_photo_url?: string | null;
          rating?: number | null;
          regon?: string | null;
          service_area?: unknown;
          service_postal_codes?: string[] | null;
          service_streets?: string[] | null;
          subscription_amount?: number | null;
          updated_at?: string | null;
          user_id?: string;
          vacation_until?: string | null;
          working_hours?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'jokusors_estate_id_fkey';
            columns: ['estate_id'];
            isOneToOne: false;
            referencedRelation: 'estates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jokusors_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      marketplace_listings: {
        Row: {
          category: string;
          condition: Database['public']['Enums']['listing_condition'];
          created_at: string | null;
          currency: string;
          delivery_option: string;
          description: string | null;
          estate_id: string;
          expires_at: string;
          id: string;
          moderation_notes: string | null;
          moderation_status: string;
          photos: string[];
          pickup_address: Json;
          price: number;
          reports_count: number;
          seller_id: string;
          status: Database['public']['Enums']['listing_status'];
          title: string;
          updated_at: string | null;
          views_count: number;
        };
        Insert: {
          category: string;
          condition: Database['public']['Enums']['listing_condition'];
          created_at?: string | null;
          currency?: string;
          delivery_option?: string;
          description?: string | null;
          estate_id: string;
          expires_at?: string;
          id?: string;
          moderation_notes?: string | null;
          moderation_status?: string;
          photos?: string[];
          pickup_address: Json;
          price: number;
          reports_count?: number;
          seller_id: string;
          status?: Database['public']['Enums']['listing_status'];
          title: string;
          updated_at?: string | null;
          views_count?: number;
        };
        Update: {
          category?: string;
          condition?: Database['public']['Enums']['listing_condition'];
          created_at?: string | null;
          currency?: string;
          delivery_option?: string;
          description?: string | null;
          estate_id?: string;
          expires_at?: string;
          id?: string;
          moderation_notes?: string | null;
          moderation_status?: string;
          photos?: string[];
          pickup_address?: Json;
          price?: number;
          reports_count?: number;
          seller_id?: string;
          status?: Database['public']['Enums']['listing_status'];
          title?: string;
          updated_at?: string | null;
          views_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'marketplace_listings_estate_id_fkey';
            columns: ['estate_id'];
            isOneToOne: false;
            referencedRelation: 'estates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'marketplace_listings_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      marketplace_messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          listing_id: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          listing_id: string;
          read_at?: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          listing_id?: string;
          read_at?: string | null;
          recipient_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'marketplace_messages_listing_id_fkey';
            columns: ['listing_id'];
            isOneToOne: false;
            referencedRelation: 'marketplace_listings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'marketplace_messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'marketplace_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      marketplace_purchases: {
        Row: {
          buyer_confirmed_at: string | null;
          buyer_id: string;
          created_at: string | null;
          delivery_order_id: string | null;
          delivery_price: number | null;
          id: string;
          inspection_deadline: string | null;
          item_price: number;
          listing_id: string;
          migmig_commission: number;
          payment_method: string | null;
          payment_status: string;
          released_at: string | null;
          seller_id: string;
        };
        Insert: {
          buyer_confirmed_at?: string | null;
          buyer_id: string;
          created_at?: string | null;
          delivery_order_id?: string | null;
          delivery_price?: number | null;
          id?: string;
          inspection_deadline?: string | null;
          item_price: number;
          listing_id: string;
          migmig_commission?: number;
          payment_method?: string | null;
          payment_status?: string;
          released_at?: string | null;
          seller_id: string;
        };
        Update: {
          buyer_confirmed_at?: string | null;
          buyer_id?: string;
          created_at?: string | null;
          delivery_order_id?: string | null;
          delivery_price?: number | null;
          id?: string;
          inspection_deadline?: string | null;
          item_price?: number;
          listing_id?: string;
          migmig_commission?: number;
          payment_method?: string | null;
          payment_status?: string;
          released_at?: string | null;
          seller_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'marketplace_purchases_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'marketplace_purchases_delivery_order_id_fkey';
            columns: ['delivery_order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'marketplace_purchases_listing_id_fkey';
            columns: ['listing_id'];
            isOneToOne: false;
            referencedRelation: 'marketplace_listings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'marketplace_purchases_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      marketplace_reports: {
        Row: {
          created_at: string | null;
          id: string;
          listing_id: string;
          reporter_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          listing_id: string;
          reporter_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          listing_id?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'marketplace_reports_listing_id_fkey';
            columns: ['listing_id'];
            isOneToOne: false;
            referencedRelation: 'marketplace_listings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'marketplace_reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      module_activations: {
        Row: {
          activated_at: string | null;
          activated_by: string | null;
          active: boolean;
          estate_id: string;
          module_id: string;
          price_override: number | null;
        };
        Insert: {
          activated_at?: string | null;
          activated_by?: string | null;
          active?: boolean;
          estate_id: string;
          module_id: string;
          price_override?: number | null;
        };
        Update: {
          activated_at?: string | null;
          activated_by?: string | null;
          active?: boolean;
          estate_id?: string;
          module_id?: string;
          price_override?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'module_activations_activated_by_fkey';
            columns: ['activated_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'module_activations_estate_id_fkey';
            columns: ['estate_id'];
            isOneToOne: false;
            referencedRelation: 'estates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'module_activations_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          }
        ];
      };
      module_proposal_votes: {
        Row: {
          created_at: string | null;
          proposal_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          proposal_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          proposal_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'module_proposal_votes_proposal_id_fkey';
            columns: ['proposal_id'];
            isOneToOne: false;
            referencedRelation: 'module_proposals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'module_proposal_votes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      module_proposals: {
        Row: {
          created_at: string | null;
          description: string;
          estate_id: string | null;
          expected_frequency: string | null;
          expected_price_range: string | null;
          id: string;
          name: string;
          notes: string | null;
          proposed_by: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['proposal_status'];
          votes_count: number;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          estate_id?: string | null;
          expected_frequency?: string | null;
          expected_price_range?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          proposed_by: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['proposal_status'];
          votes_count?: number;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          estate_id?: string | null;
          expected_frequency?: string | null;
          expected_price_range?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          proposed_by?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['proposal_status'];
          votes_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'module_proposals_estate_id_fkey';
            columns: ['estate_id'];
            isOneToOne: false;
            referencedRelation: 'estates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'module_proposals_proposed_by_fkey';
            columns: ['proposed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'module_proposals_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      modules: {
        Row: {
          base_price: number;
          category: Database['public']['Enums']['module_category'];
          created_at: string | null;
          custom_fields: Json;
          description: string | null;
          estimated_duration_min: number;
          icon_name: string | null;
          id: string;
          is_global: boolean;
          min_price: number | null;
          name: string;
          price_unit: Database['public']['Enums']['price_unit'];
          requires_age_verification: boolean;
          requires_pickup: boolean;
          slug: string;
          sort_order: number | null;
          updated_at: string | null;
        };
        Insert: {
          base_price: number;
          category: Database['public']['Enums']['module_category'];
          created_at?: string | null;
          custom_fields?: Json;
          description?: string | null;
          estimated_duration_min: number;
          icon_name?: string | null;
          id?: string;
          is_global?: boolean;
          min_price?: number | null;
          name: string;
          price_unit?: Database['public']['Enums']['price_unit'];
          requires_age_verification?: boolean;
          requires_pickup?: boolean;
          slug: string;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Update: {
          base_price?: number;
          category?: Database['public']['Enums']['module_category'];
          created_at?: string | null;
          custom_fields?: Json;
          description?: string | null;
          estimated_duration_min?: number;
          icon_name?: string | null;
          id?: string;
          is_global?: boolean;
          min_price?: number | null;
          name?: string;
          price_unit?: Database['public']['Enums']['price_unit'];
          requires_age_verification?: boolean;
          requires_pickup?: boolean;
          slug?: string;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string | null;
          data: Json | null;
          id: string;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      order_events: {
        Row: {
          created_at: string | null;
          event_type: string;
          id: string;
          location: unknown;
          metadata: Json | null;
          order_id: string;
        };
        Insert: {
          created_at?: string | null;
          event_type: string;
          id?: string;
          location?: unknown;
          metadata?: Json | null;
          order_id: string;
        };
        Update: {
          created_at?: string | null;
          event_type?: string;
          id?: string;
          location?: unknown;
          metadata?: Json | null;
          order_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_events_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          }
        ];
      };
      order_items: {
        Row: {
          created_at: string | null;
          estimated_unit_price: number;
          id: string;
          name_snapshot: string;
          note: string | null;
          order_id: string;
          product_id: string | null;
          quantity: number;
          unit: string;
        };
        Insert: {
          created_at?: string | null;
          estimated_unit_price: number;
          id?: string;
          name_snapshot: string;
          note?: string | null;
          order_id: string;
          product_id?: string | null;
          quantity: number;
          unit: string;
        };
        Update: {
          created_at?: string | null;
          estimated_unit_price?: number;
          id?: string;
          name_snapshot?: string;
          note?: string | null;
          order_id?: string;
          product_id?: string | null;
          quantity?: number;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          }
        ];
      };
      order_messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          order_id: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          order_id: string;
          read_at?: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          order_id?: string;
          read_at?: string | null;
          recipient_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_messages_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      orders: {
        Row: {
          accepted_at: string | null;
          address_id: string;
          base_price: number;
          bodycam_enabled: boolean | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cashback_pct_frozen: number | null;
          completed_at: string | null;
          created_at: string | null;
          created_via: string | null;
          custom_data: Json | null;
          estate_id: string;
          estimated_duration_min: number | null;
          fee_config_id: string | null;
          id: string;
          jokusor_id: string | null;
          jokusor_share_frozen: number | null;
          module_id: string;
          notes: string | null;
          pickup_address: Json | null;
          planned_duration_sec: number | null;
          planned_route: Json | null;
          resident_id: string;
          scheduled_at: string | null;
          started_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_price: number;
          voice_confidence: number | null;
          voice_intent: string | null;
          voice_transcription: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          address_id: string;
          base_price: number;
          bodycam_enabled?: boolean | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cashback_pct_frozen?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_via?: string | null;
          custom_data?: Json | null;
          estate_id: string;
          estimated_duration_min?: number | null;
          fee_config_id?: string | null;
          id?: string;
          jokusor_id?: string | null;
          jokusor_share_frozen?: number | null;
          module_id: string;
          notes?: string | null;
          pickup_address?: Json | null;
          planned_duration_sec?: number | null;
          planned_route?: Json | null;
          resident_id: string;
          scheduled_at?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['order_status'];
          total_price: number;
          voice_confidence?: number | null;
          voice_intent?: string | null;
          voice_transcription?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          address_id?: string;
          base_price?: number;
          bodycam_enabled?: boolean | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cashback_pct_frozen?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          created_via?: string | null;
          custom_data?: Json | null;
          estate_id?: string;
          estimated_duration_min?: number | null;
          fee_config_id?: string | null;
          id?: string;
          jokusor_id?: string | null;
          jokusor_share_frozen?: number | null;
          module_id?: string;
          notes?: string | null;
          pickup_address?: Json | null;
          planned_duration_sec?: number | null;
          planned_route?: Json | null;
          resident_id?: string;
          scheduled_at?: string | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['order_status'];
          total_price?: number;
          voice_confidence?: number | null;
          voice_intent?: string | null;
          voice_transcription?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_address_id_fkey';
            columns: ['address_id'];
            isOneToOne: false;
            referencedRelation: 'addresses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_estate_id_fkey';
            columns: ['estate_id'];
            isOneToOne: false;
            referencedRelation: 'estates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_fee_config_id_fkey';
            columns: ['fee_config_id'];
            isOneToOne: false;
            referencedRelation: 'fee_config';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_jokusor_id_fkey';
            columns: ['jokusor_id'];
            isOneToOne: false;
            referencedRelation: 'jokusors';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'orders_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_resident_id_fkey';
            columns: ['resident_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      payments: {
        Row: {
          amount: number;
          completed_at: string | null;
          created_at: string | null;
          currency: string;
          external_id: string | null;
          external_response: Json | null;
          id: string;
          idempotency_key: string | null;
          marketplace_purchase_id: string | null;
          order_id: string | null;
          payment_method: string | null;
          status: Database['public']['Enums']['payment_status'];
          user_id: string;
        };
        Insert: {
          amount: number;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string;
          external_id?: string | null;
          external_response?: Json | null;
          id?: string;
          idempotency_key?: string | null;
          marketplace_purchase_id?: string | null;
          order_id?: string | null;
          payment_method?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          user_id: string;
        };
        Update: {
          amount?: number;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string;
          external_id?: string | null;
          external_response?: Json | null;
          id?: string;
          idempotency_key?: string | null;
          marketplace_purchase_id?: string | null;
          order_id?: string | null;
          payment_method?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_marketplace_purchase_id_fkey';
            columns: ['marketplace_purchase_id'];
            isOneToOne: false;
            referencedRelation: 'marketplace_purchases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      product_categories: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      products: {
        Row: {
          brand: string | null;
          category_id: string | null;
          created_at: string | null;
          estimated_price: number;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          sort_order: number;
          unit: string;
          updated_at: string | null;
        };
        Insert: {
          brand?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          estimated_price: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          unit?: string;
          updated_at?: string | null;
        };
        Update: {
          brand?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          estimated_price?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          unit?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'product_categories';
            referencedColumns: ['id'];
          }
        ];
      };
      professional_reviews: {
        Row: {
          comment: string | null;
          created_at: string | null;
          id: string;
          order_id: string;
          professional_id: string;
          reviewer_id: string;
          stars: number;
        };
        Insert: {
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          order_id: string;
          professional_id: string;
          reviewer_id: string;
          stars: number;
        };
        Update: {
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          order_id?: string;
          professional_id?: string;
          reviewer_id?: string;
          stars?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'professional_reviews_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'professional_reviews_professional_id_fkey';
            columns: ['professional_id'];
            isOneToOne: false;
            referencedRelation: 'trusted_professionals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'professional_reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string | null;
          endpoint: string;
          id: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string | null;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string | null;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      ratings: {
        Row: {
          comment: string | null;
          created_at: string | null;
          is_visible: boolean;
          jokusor_id: string;
          order_id: string;
          resident_id: string;
          stars: number;
        };
        Insert: {
          comment?: string | null;
          created_at?: string | null;
          is_visible?: boolean;
          jokusor_id: string;
          order_id: string;
          resident_id: string;
          stars: number;
        };
        Update: {
          comment?: string | null;
          created_at?: string | null;
          is_visible?: boolean;
          jokusor_id?: string;
          order_id?: string;
          resident_id?: string;
          stars?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ratings_jokusor_id_fkey';
            columns: ['jokusor_id'];
            isOneToOne: false;
            referencedRelation: 'jokusors';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'ratings_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ratings_resident_id_fkey';
            columns: ['resident_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      restaurants: {
        Row: {
          address: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean;
          name: string;
          nip: string | null;
          notes: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          nip?: string | null;
          notes?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          nip?: string | null;
          notes?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      time_slots: {
        Row: {
          created_at: string | null;
          hold_expires_at: string | null;
          id: string;
          jokusor_id: string;
          order_id: string | null;
          range: unknown;
          status: string;
        };
        Insert: {
          created_at?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          jokusor_id: string;
          order_id?: string | null;
          range: unknown;
          status?: string;
        };
        Update: {
          created_at?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          jokusor_id?: string;
          order_id?: string | null;
          range?: unknown;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'time_slots_jokusor_id_fkey';
            columns: ['jokusor_id'];
            isOneToOne: false;
            referencedRelation: 'jokusors';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'time_slots_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          }
        ];
      };
      tips: {
        Row: {
          amount: number;
          created_at: string | null;
          id: string;
          jokusor_id: string;
          order_id: string;
          payment_method: string | null;
          payment_status: Database['public']['Enums']['payment_status'];
          resident_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          id?: string;
          jokusor_id: string;
          order_id: string;
          payment_method?: string | null;
          payment_status?: Database['public']['Enums']['payment_status'];
          resident_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: string;
          jokusor_id?: string;
          order_id?: string;
          payment_method?: string | null;
          payment_status?: Database['public']['Enums']['payment_status'];
          resident_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tips_jokusor_id_fkey';
            columns: ['jokusor_id'];
            isOneToOne: false;
            referencedRelation: 'jokusors';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'tips_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tips_resident_id_fkey';
            columns: ['resident_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      trusted_professionals: {
        Row: {
          callout_fee: number | null;
          category: string;
          commission_rate: number | null;
          company_name: string | null;
          completed_jobs: number;
          created_at: string | null;
          email: string | null;
          emergency_available: boolean | null;
          full_name: string;
          hourly_rate: number | null;
          id: string;
          is_active: boolean | null;
          nip: string | null;
          notes_admin: string | null;
          phone: string;
          rating: number | null;
          service_areas: string[];
          updated_at: string | null;
          verification_documents: Json | null;
          verified: boolean | null;
        };
        Insert: {
          callout_fee?: number | null;
          category: string;
          commission_rate?: number | null;
          company_name?: string | null;
          completed_jobs?: number;
          created_at?: string | null;
          email?: string | null;
          emergency_available?: boolean | null;
          full_name: string;
          hourly_rate?: number | null;
          id?: string;
          is_active?: boolean | null;
          nip?: string | null;
          notes_admin?: string | null;
          phone: string;
          rating?: number | null;
          service_areas: string[];
          updated_at?: string | null;
          verification_documents?: Json | null;
          verified?: boolean | null;
        };
        Update: {
          callout_fee?: number | null;
          category?: string;
          commission_rate?: number | null;
          company_name?: string | null;
          completed_jobs?: number;
          created_at?: string | null;
          email?: string | null;
          emergency_available?: boolean | null;
          full_name?: string;
          hourly_rate?: number | null;
          id?: string;
          is_active?: boolean | null;
          nip?: string | null;
          notes_admin?: string | null;
          phone?: string;
          rating?: number | null;
          service_areas?: string[];
          updated_at?: string | null;
          verification_documents?: Json | null;
          verified?: boolean | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          age_verified: boolean;
          avatar_url: string | null;
          created_at: string | null;
          deleted_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          oauth_provider: string | null;
          phone: string | null;
          phone_verified: boolean;
          preferences: Json | null;
          role: Database['public']['Enums']['user_role'];
          updated_at: string | null;
        };
        Insert: {
          age_verified?: boolean;
          avatar_url?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          oauth_provider?: string | null;
          phone?: string | null;
          phone_verified?: boolean;
          preferences?: Json | null;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string | null;
        };
        Update: {
          age_verified?: boolean;
          avatar_url?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          oauth_provider?: string | null;
          phone?: string | null;
          phone_verified?: boolean;
          preferences?: Json | null;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      voice_query_log: {
        Row: {
          created_at: string | null;
          id: string;
          matched_intent_id: string | null;
          resulted_in_order: boolean | null;
          similarity_score: number | null;
          transcription: string;
          user_id: string | null;
          user_satisfied: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          matched_intent_id?: string | null;
          resulted_in_order?: boolean | null;
          similarity_score?: number | null;
          transcription: string;
          user_id?: string | null;
          user_satisfied?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          matched_intent_id?: string | null;
          resulted_in_order?: boolean | null;
          similarity_score?: number | null;
          transcription?: string;
          user_id?: string | null;
          user_satisfied?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'voice_query_log_matched_intent_id_fkey';
            columns: ['matched_intent_id'];
            isOneToOne: false;
            referencedRelation: 'ai_intents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'voice_query_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown;
          f_table_catalog: string | null;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: { Args: never; Returns: string };
      _postgis_scripts_pgsql_version: { Args: never; Returns: string };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _postgis_stats: {
        Args: { ''?: string; att_name: string; tbl: unknown };
        Returns: string;
      };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_sortablehash: { Args: { geom: unknown }; Returns: number };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      addauth: { Args: { '': string }; Returns: boolean };
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          };
      cancel_slot_hold: { Args: { p_time_slot_id: string }; Returns: undefined };
      create_marketplace_purchase: {
        Args: { p_listing_id: string };
        Returns: string;
      };
      create_slot_hold: {
        Args: {
          p_jokusor_id: string;
          p_order_id: string;
          p_slot_end: string;
          p_slot_start: string;
        };
        Returns: {
          hold_expires_at: string;
          time_slot_id: string;
        }[];
      };
      current_fee_config: {
        Args: { p_at?: string; p_order_type: string };
        Returns: {
          cashback_pct: number;
          created_at: string | null;
          created_by: string | null;
          effective_from: string;
          gastro_base_fee: number | null;
          gastro_included_km: number | null;
          gastro_per_km_fee: number | null;
          id: string;
          jokusor_share: number;
          order_type: string;
          payment_cost_mode: string;
        };
        SetofOptions: {
          from: '*';
          to: 'fee_config';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_role_id: {
        Args: never;
        Returns: Database['public']['Enums']['user_role'];
      };
      disablelongtransactions: { Args: never; Returns: string };
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { column_name: string; table_name: string }; Returns: string };
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string };
      enablelongtransactions: { Args: never; Returns: string };
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      find_estate_for_address: { Args: { p_point: unknown }; Returns: string };
      geometry: { Args: { '': string }; Returns: unknown };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geomfromewkt: { Args: { '': string }; Returns: unknown };
      get_available_slots: {
        Args: {
          p_address_id: string;
          p_from?: string;
          p_module_slug: string;
          p_to?: string;
        };
        Returns: {
          jokusor_id: string;
          jokusor_name: string;
          slot_end: string;
          slot_start: string;
        }[];
      };
      gettransactionid: { Args: never; Returns: unknown };
      is_admin: { Args: never; Returns: boolean };
      is_jokusor: { Args: never; Returns: boolean };
      jokusor_accept_order: { Args: { p_order_id: string }; Returns: undefined };
      jokusor_complete_order: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      jokusor_serves_address: {
        Args: { p_jokusor_id: string; p_point: unknown; p_postal_code: string };
        Returns: boolean;
      };
      jokusor_start_order: { Args: { p_order_id: string }; Returns: undefined };
      longtransactionsenabled: { Args: never; Returns: boolean };
      mock_pay_order: { Args: { p_order_id: string }; Returns: undefined };
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_extensions_upgrade: { Args: never; Returns: string };
      postgis_full_version: { Args: never; Returns: string };
      postgis_geos_version: { Args: never; Returns: string };
      postgis_lib_build_date: { Args: never; Returns: string };
      postgis_lib_revision: { Args: never; Returns: string };
      postgis_lib_version: { Args: never; Returns: string };
      postgis_libjson_version: { Args: never; Returns: string };
      postgis_liblwgeom_version: { Args: never; Returns: string };
      postgis_libprotobuf_version: { Args: never; Returns: string };
      postgis_libxml_version: { Args: never; Returns: string };
      postgis_proj_version: { Args: never; Returns: string };
      postgis_scripts_build_date: { Args: never; Returns: string };
      postgis_scripts_installed: { Args: never; Returns: string };
      postgis_scripts_released: { Args: never; Returns: string };
      postgis_svn_version: { Args: never; Returns: string };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_version: { Args: never; Returns: string };
      postgis_wagyu_version: { Args: never; Returns: string };
      report_listing: { Args: { p_listing_id: string }; Returns: undefined };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
            Returns: number;
          };
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { '': string }; Returns: string };
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_asgml:
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          };
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_astext: { Args: { '': string }; Returns: string };
      st_astwkb:
        | {
            Args: {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number };
            Returns: unknown;
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number };
            Returns: unknown;
          };
      st_centroid: { Args: { '': string }; Returns: unknown };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_coorddim: { Args: { geometry: unknown }; Returns: number };
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
            Returns: number;
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | {
            Args: {
              dm?: number;
              dx: number;
              dy: number;
              dz?: number;
              geom: unknown;
            };
            Returns: unknown;
          };
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          };
      st_geogfromtext: { Args: { '': string }; Returns: unknown };
      st_geographyfromtext: { Args: { '': string }; Returns: unknown };
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string };
      st_geomcollfromtext: { Args: { '': string }; Returns: unknown };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: { Args: { '': string }; Returns: unknown };
      st_geomfromewkt: { Args: { '': string }; Returns: unknown };
      st_geomfromgeojson:
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': string }; Returns: unknown };
      st_geomfromgml: { Args: { '': string }; Returns: unknown };
      st_geomfromkml: { Args: { '': string }; Returns: unknown };
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
      st_geomfromtext: { Args: { '': string }; Returns: unknown };
      st_gmltosql: { Args: { '': string }; Returns: unknown };
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database['public']['CompositeTypes']['valid_detail'];
        SetofOptions: {
          from: '*';
          to: 'valid_detail';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefromtext: { Args: { '': string }; Returns: unknown };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_mlinefromtext: { Args: { '': string }; Returns: unknown };
      st_mpointfromtext: { Args: { '': string }; Returns: unknown };
      st_mpolyfromtext: { Args: { '': string }; Returns: unknown };
      st_multilinestringfromtext: { Args: { '': string }; Returns: unknown };
      st_multipointfromtext: { Args: { '': string }; Returns: unknown };
      st_multipolygonfromtext: { Args: { '': string }; Returns: unknown };
      st_node: { Args: { g: unknown }; Returns: unknown };
      st_normalize: { Args: { geom: unknown }; Returns: unknown };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_pointfromtext: { Args: { '': string }; Returns: unknown };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: { Args: { '': string }; Returns: unknown };
      st_polygonfromtext: { Args: { '': string }; Returns: unknown };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string };
            Returns: unknown;
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number };
            Returns: unknown;
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown };
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
      st_wkttosql: { Args: { '': string }; Returns: unknown };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      unlockrows: { Args: { '': string }; Returns: number };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
    };
    Enums: {
      billing_model: 'subscription_only' | 'commission_only' | 'hybrid';
      listing_condition: 'new' | 'like_new' | 'good' | 'used' | 'for_parts';
      listing_status: 'active' | 'reserved' | 'sold' | 'archived' | 'removed';
      module_category:
        | 'delivery'
        | 'shopping'
        | 'transport'
        | 'home_pet'
        | 'errands'
        | 'professional'
        | 'marketplace';
      order_status:
        | 'draft'
        | 'hold'
        | 'pending'
        | 'accepted'
        | 'in_transit'
        | 'at_pickup'
        | 'in_progress'
        | 'in_return'
        | 'completed'
        | 'cancelled'
        | 'disputed';
      payment_status:
        | 'pending'
        | 'processing'
        | 'paid'
        | 'failed'
        | 'refunded'
        | 'partially_refunded';
      price_unit: 'fixed' | 'hourly' | 'per_km' | 'percent';
      proposal_status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'implemented';
      user_role: 'resident' | 'jokusor' | 'admin';
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      billing_model: ['subscription_only', 'commission_only', 'hybrid'],
      listing_condition: ['new', 'like_new', 'good', 'used', 'for_parts'],
      listing_status: ['active', 'reserved', 'sold', 'archived', 'removed'],
      module_category: [
        'delivery',
        'shopping',
        'transport',
        'home_pet',
        'errands',
        'professional',
        'marketplace'
      ],
      order_status: [
        'draft',
        'hold',
        'pending',
        'accepted',
        'in_transit',
        'at_pickup',
        'in_progress',
        'in_return',
        'completed',
        'cancelled',
        'disputed'
      ],
      payment_status: ['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'],
      price_unit: ['fixed', 'hourly', 'per_km', 'percent'],
      proposal_status: ['pending', 'under_review', 'approved', 'rejected', 'implemented'],
      user_role: ['resident', 'jokusor', 'admin']
    }
  }
} as const;
