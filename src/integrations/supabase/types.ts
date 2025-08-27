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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          permissions: Json | null
          role: Database["public"]["Enums"]["admin_role"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["admin_role"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["admin_role"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_contacts: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          blocked_user_id: string | null
          created_at: string | null
          email: string | null
          id: string
          mobile_number: string | null
          phone: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          blocked_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          mobile_number?: string | null
          phone?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          blocked_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          mobile_number?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_contacts_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string | null
          booking_metadata: Json | null
          booking_status: string | null
          bookings: string | null
          convenience_fee: number | null
          created_at: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_state: string | null
          event_id: string | null
          event_occurrence_id: string | null
          formatted_booking_id: string | null
          id: string
          occurrence_date: string | null
          occurrence_ticket_category_id: string | null
          quantity: number | null
          seat_numbers: Json | null
          state: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          booking_date?: string | null
          booking_metadata?: Json | null
          booking_status?: string | null
          bookings?: string | null
          convenience_fee?: number | null
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_state?: string | null
          event_id?: string | null
          event_occurrence_id?: string | null
          formatted_booking_id?: string | null
          id?: string
          occurrence_date?: string | null
          occurrence_ticket_category_id?: string | null
          quantity?: number | null
          seat_numbers?: Json | null
          state?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          booking_date?: string | null
          booking_metadata?: Json | null
          booking_status?: string | null
          bookings?: string | null
          convenience_fee?: number | null
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_state?: string | null
          event_id?: string | null
          event_occurrence_id?: string | null
          formatted_booking_id?: string | null
          id?: string
          occurrence_date?: string | null
          occurrence_ticket_category_id?: string | null
          quantity?: number | null
          seat_numbers?: Json | null
          state?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_event_occurrence_id_fkey"
            columns: ["event_occurrence_id"]
            isOneToOne: false
            referencedRelation: "event_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_occurrence_ticket_category_id_fkey"
            columns: ["occurrence_ticket_category_id"]
            isOneToOne: false
            referencedRelation: "occurrence_ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_slides: {
        Row: {
          button_link: string | null
          button_text: string | null
          city: string | null
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          is_active: boolean | null
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sub_category: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sub_category?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sub_category?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_occurrences: {
        Row: {
          available_tickets: number
          created_at: string
          end_time: string | null
          event_id: string
          id: string
          is_active: boolean
          layout_type: string | null
          max_capacity: number | null
          occurrence_date: string
          occurrence_time: string
          parent_event_id: string | null
          seat_map_id: string | null
          start_time: string | null
          status: string | null
          total_tickets: number
          updated_at: string
        }
        Insert: {
          available_tickets?: number
          created_at?: string
          end_time?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          layout_type?: string | null
          max_capacity?: number | null
          occurrence_date: string
          occurrence_time: string
          parent_event_id?: string | null
          seat_map_id?: string | null
          start_time?: string | null
          status?: string | null
          total_tickets?: number
          updated_at?: string
        }
        Update: {
          available_tickets?: number
          created_at?: string
          end_time?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          layout_type?: string | null
          max_capacity?: number | null
          occurrence_date?: string
          occurrence_time?: string
          parent_event_id?: string | null
          seat_map_id?: string | null
          start_time?: string | null
          status?: string | null
          total_tickets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_occurrences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_occurrences_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_price_zones: {
        Row: {
          base_price: number | null
          commission: number | null
          convenience_fee: number | null
          created_at: string | null
          event_id: string | null
          id: number
          is_active: boolean | null
          seat_layout_id: string | null
          updated_at: string | null
          zone_name: string | null
        }
        Insert: {
          base_price?: number | null
          commission?: number | null
          convenience_fee?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: number
          is_active?: boolean | null
          seat_layout_id?: string | null
          updated_at?: string | null
          zone_name?: string | null
        }
        Update: {
          base_price?: number | null
          commission?: number | null
          convenience_fee?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: number
          is_active?: boolean | null
          seat_layout_id?: string | null
          updated_at?: string | null
          zone_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_price_zones_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_requests: {
        Row: {
          additional_info: string | null
          admin_notes: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string | null
          estimated_budget: number | null
          event_category: string
          event_description: string | null
          event_name: string
          expected_attendees: number | null
          id: string
          preferred_date: string | null
          preferred_venue: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          additional_info?: string | null
          admin_notes?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string | null
          estimated_budget?: number | null
          event_category: string
          event_description?: string | null
          event_name: string
          expected_attendees?: number | null
          id?: string
          preferred_date?: string | null
          preferred_venue?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          additional_info?: string | null
          admin_notes?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string | null
          estimated_budget?: number | null
          event_category?: string
          event_description?: string | null
          event_name?: string
          expected_attendees?: number | null
          id?: string
          preferred_date?: string | null
          preferred_venue?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_seat_pricing: {
        Row: {
          available_tickets: number | null
          base_price: number
          commission: number | null
          commission_type: string | null
          commission_value: number | null
          convenience_fee: number | null
          convenience_fee_type: string | null
          convenience_fee_value: number | null
          created_at: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          seat_category_id: string | null
          total_tickets: number | null
          updated_at: string | null
        }
        Insert: {
          available_tickets?: number | null
          base_price: number
          commission?: number | null
          commission_type?: string | null
          commission_value?: number | null
          convenience_fee?: number | null
          convenience_fee_type?: string | null
          convenience_fee_value?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          seat_category_id?: string | null
          total_tickets?: number | null
          updated_at?: string | null
        }
        Update: {
          available_tickets?: number | null
          base_price?: number
          commission?: number | null
          commission_type?: string | null
          commission_value?: number | null
          convenience_fee?: number | null
          convenience_fee_type?: string | null
          convenience_fee_value?: number | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          seat_category_id?: string | null
          total_tickets?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_seat_pricing_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_seat_pricing_seat_category_id_fkey"
            columns: ["seat_category_id"]
            isOneToOne: false
            referencedRelation: "seat_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          artist_image: string | null
          artist_name: string | null
          artists: Json | null
          category: string
          category_id: string | null
          city: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          end_date: string | null
          end_datetime: string
          event_expiry_minutes: number | null
          event_id_display: string | null
          event_images: string | null
          event_logo: string | null
          event_tags: string | null
          event_time: string | null
          "events.tags": Json | null
          formatted_event_id: string | null
          genre: string | null
          genres: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_recurring: boolean | null
          is_regular: boolean | null
          is_sold_out: boolean | null
          language: string | null
          layout_type: string | null
          name: string
          poster: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          sale_end: string
          sale_start: string
          seat_map: Json | null
          seat_map_config: Json | null
          sold_out_at: string | null
          start_date: string | null
          start_datetime: string
          state: string | null
          status: string | null
          sub_category: string | null
          tags: string | null
          terms_and_conditions: string | null
          updated_at: string | null
          venue: string | null
          venue_id: string | null
        }
        Insert: {
          artist_image?: string | null
          artist_name?: string | null
          artists?: Json | null
          category: string
          category_id?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          end_date?: string | null
          end_datetime: string
          event_expiry_minutes?: number | null
          event_id_display?: string | null
          event_images?: string | null
          event_logo?: string | null
          event_tags?: string | null
          event_time?: string | null
          "events.tags"?: Json | null
          formatted_event_id?: string | null
          genre?: string | null
          genres?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_recurring?: boolean | null
          is_regular?: boolean | null
          is_sold_out?: boolean | null
          language?: string | null
          layout_type?: string | null
          name: string
          poster?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          sale_end: string
          sale_start: string
          seat_map?: Json | null
          seat_map_config?: Json | null
          sold_out_at?: string | null
          start_date?: string | null
          start_datetime: string
          state?: string | null
          status?: string | null
          sub_category?: string | null
          tags?: string | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          venue?: string | null
          venue_id?: string | null
        }
        Update: {
          artist_image?: string | null
          artist_name?: string | null
          artists?: Json | null
          category?: string
          category_id?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          end_date?: string | null
          end_datetime?: string
          event_expiry_minutes?: number | null
          event_id_display?: string | null
          event_images?: string | null
          event_logo?: string | null
          event_tags?: string | null
          event_time?: string | null
          "events.tags"?: Json | null
          formatted_event_id?: string | null
          genre?: string | null
          genres?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_recurring?: boolean | null
          is_regular?: boolean | null
          is_sold_out?: boolean | null
          language?: string | null
          layout_type?: string | null
          name?: string
          poster?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          sale_end?: string
          sale_start?: string
          seat_map?: Json | null
          seat_map_config?: Json | null
          sold_out_at?: string | null
          start_date?: string | null
          start_datetime?: string
          state?: string | null
          status?: string | null
          sub_category?: string | null
          tags?: string | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          venue?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reports: {
        Row: {
          created_at: string
          created_by: string | null
          date_range_end: string
          date_range_start: string
          filters_applied: Json | null
          id: string
          report_data: Json
          report_name: string
          report_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_range_end: string
          date_range_start: string
          filters_applied?: Json | null
          id?: string
          report_data: Json
          report_name: string
          report_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_range_end?: string
          date_range_start?: string
          filters_applied?: Json | null
          id?: string
          report_data?: Json
          report_name?: string
          report_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          actual_commission: number | null
          booking_id: string | null
          commission: number | null
          convenience_base_fee: number | null
          convenience_fee: number | null
          created_at: string | null
          customer_state: string | null
          discount_amount: number | null
          event_id: string | null
          event_state: string | null
          gst_on_actual_commission: number | null
          gst_on_commission: number | null
          gst_on_convenience: number | null
          gst_on_convenience_base_fee: number | null
          id: string
          is_wb_customer: boolean | null
          is_wb_event: boolean | null
          payment_mode: string | null
          reimbursable_ticket_price: number | null
          ticket_price: number
        }
        Insert: {
          actual_commission?: number | null
          booking_id?: string | null
          commission?: number | null
          convenience_base_fee?: number | null
          convenience_fee?: number | null
          created_at?: string | null
          customer_state?: string | null
          discount_amount?: number | null
          event_id?: string | null
          event_state?: string | null
          gst_on_actual_commission?: number | null
          gst_on_commission?: number | null
          gst_on_convenience?: number | null
          gst_on_convenience_base_fee?: number | null
          id?: string
          is_wb_customer?: boolean | null
          is_wb_event?: boolean | null
          payment_mode?: string | null
          reimbursable_ticket_price?: number | null
          ticket_price: number
        }
        Update: {
          actual_commission?: number | null
          booking_id?: string | null
          commission?: number | null
          convenience_base_fee?: number | null
          convenience_fee?: number | null
          created_at?: string | null
          customer_state?: string | null
          discount_amount?: number | null
          event_id?: string | null
          event_state?: string | null
          gst_on_actual_commission?: number | null
          gst_on_commission?: number | null
          gst_on_convenience?: number | null
          gst_on_convenience_base_fee?: number | null
          id?: string
          is_wb_customer?: boolean | null
          is_wb_event?: boolean | null
          payment_mode?: string | null
          reimbursable_ticket_price?: number | null
          ticket_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ga_ticket_inventory: {
        Row: {
          created_at: string
          event_occurrence_id: string
          id: string
          price: number
          remaining_quantity: number
          ticket_category_id: string | null
          ticket_category_name: string
          total_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_occurrence_id: string
          id?: string
          price?: number
          remaining_quantity?: number
          ticket_category_id?: string | null
          ticket_category_name: string
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_occurrence_id?: string
          id?: string
          price?: number
          remaining_quantity?: number
          ticket_category_id?: string | null
          ticket_category_name?: string
          total_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ga_ticket_inventory_event_occurrence_id_fkey"
            columns: ["event_occurrence_id"]
            isOneToOne: false
            referencedRelation: "event_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ga_ticket_inventory_ticket_category_id_fkey"
            columns: ["ticket_category_id"]
            isOneToOne: false
            referencedRelation: "seat_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      global_seat_categories: {
        Row: {
          base_price: number | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      occurrence_ticket_categories: {
        Row: {
          available_quantity: number
          base_price: number
          category_name: string
          commission: number
          convenience_fee: number
          created_at: string
          id: string
          is_active: boolean
          occurrence_id: string
          seat_category_id: string | null
          total_quantity: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          base_price?: number
          category_name: string
          commission?: number
          convenience_fee?: number
          created_at?: string
          id?: string
          is_active?: boolean
          occurrence_id: string
          seat_category_id?: string | null
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          base_price?: number
          category_name?: string
          commission?: number
          convenience_fee?: number
          created_at?: string
          id?: string
          is_active?: boolean
          occurrence_id?: string
          seat_category_id?: string | null
          total_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrence_ticket_categories_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "event_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrence_ticket_categories_seat_category_id_fkey"
            columns: ["seat_category_id"]
            isOneToOne: false
            referencedRelation: "seat_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrence_ticket_pricing: {
        Row: {
          base_price: number
          category_name: string
          commission: number
          convenience_fee: number
          created_at: string
          id: string
          is_active: boolean
          max_quantity: number
          occurrence_id: string
          seat_category_id: string | null
          sold_quantity: number
          updated_at: string
        }
        Insert: {
          base_price?: number
          category_name: string
          commission?: number
          convenience_fee?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_quantity?: number
          occurrence_id: string
          seat_category_id?: string | null
          sold_quantity?: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          category_name?: string
          commission?: number
          convenience_fee?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_quantity?: number
          occurrence_id?: string
          seat_category_id?: string | null
          sold_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrence_ticket_pricing_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "event_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrence_ticket_pricing_seat_category_id_fkey"
            columns: ["seat_category_id"]
            isOneToOne: false
            referencedRelation: "seat_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          purpose: string
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          purpose: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          purpose?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          callback_data: Json | null
          created_at: string
          currency: string | null
          id: string
          merchant_transaction_id: string
          payment_method: string | null
          phonepe_transaction_id: string | null
          response_data: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          callback_data?: Json | null
          created_at?: string
          currency?: string | null
          id?: string
          merchant_transaction_id: string
          payment_method?: string | null
          phonepe_transaction_id?: string | null
          response_data?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          callback_data?: Json | null
          created_at?: string
          currency?: string | null
          id?: string
          merchant_transaction_id?: string
          payment_method?: string | null
          phonepe_transaction_id?: string | null
          response_data?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          address_line_1: string | null
          address_line_2: string | null
          anniversary_date: string | null
          birthday: string | null
          blocked_at: string | null
          blocked_reason: string | null
          city: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          is_blocked: boolean | null
          is_married: boolean | null
          landmark: string | null
          last_name: string | null
          middle_name: string | null
          mobile_number: string | null
          phone: string | null
          pin_code: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          anniversary_date?: string | null
          birthday?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          is_blocked?: boolean | null
          is_married?: boolean | null
          landmark?: string | null
          last_name?: string | null
          middle_name?: string | null
          mobile_number?: string | null
          phone?: string | null
          pin_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          anniversary_date?: string | null
          birthday?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean | null
          is_married?: boolean | null
          landmark?: string | null
          last_name?: string | null
          middle_name?: string | null
          mobile_number?: string | null
          phone?: string | null
          pin_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          first_attempt_at: string | null
          id: string
          identifier: string
          last_attempt_at: string | null
          updated_at: string | null
        }
        Insert: {
          action_type: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier: string
          last_attempt_at?: string | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier?: string
          last_attempt_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      seat_bookings: {
        Row: {
          booking_id: string
          created_at: string
          event_id: string | null
          event_occurrence_id: string
          id: string
          seat_id: string | null
          seat_number: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          event_id?: string | null
          event_occurrence_id: string
          id?: string
          seat_id?: string | null
          seat_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          event_id?: string | null
          event_occurrence_id?: string
          id?: string
          seat_id?: string | null
          seat_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_bookings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_bookings_event_occurrence_id_fkey"
            columns: ["event_occurrence_id"]
            isOneToOne: false
            referencedRelation: "event_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_bookings_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_categories: {
        Row: {
          base_price: number | null
          capacity: number | null
          color: string | null
          created_at: string | null
          event_id: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seat_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_layouts: {
        Row: {
          columns: number | null
          created_at: string | null
          event_id: string
          id: string
          is_active: boolean | null
          layout_data: Json | null
          name: string
          rows: number | null
          updated_at: string | null
        }
        Insert: {
          columns?: number | null
          created_at?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          layout_data?: Json | null
          name: string
          rows?: number | null
          updated_at?: string | null
        }
        Update: {
          columns?: number | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          layout_data?: Json | null
          name?: string
          rows?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seat_layouts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          is_blocked: boolean | null
          row_label: string | null
          row_name: string
          seat_category_id: string
          seat_layout_id: string
          seat_number: string
          updated_at: string | null
          x_position: number | null
          y_position: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_blocked?: boolean | null
          row_label?: string | null
          row_name: string
          seat_category_id: string
          seat_layout_id: string
          seat_number: string
          updated_at?: string | null
          x_position?: number | null
          y_position?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          is_blocked?: boolean | null
          row_label?: string | null
          row_name?: string
          seat_category_id?: string
          seat_layout_id?: string
          seat_number?: string
          updated_at?: string | null
          x_position?: number | null
          y_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_seat_category_id_fkey"
            columns: ["seat_category_id"]
            isOneToOne: false
            referencedRelation: "seat_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_seat_layout_id_fkey"
            columns: ["seat_layout_id"]
            isOneToOne: false
            referencedRelation: "seat_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          booking_id: string
          created_at: string | null
          event_id: string
          holder_email: string
          holder_name: string
          id: string
          price: number
          seat_id: string | null
          status: string | null
          ticket_code: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          event_id: string
          holder_email: string
          holder_name: string
          id?: string
          price: number
          seat_id?: string | null
          status?: string | null
          ticket_code?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          event_id?: string
          holder_email?: string
          holder_name?: string
          id?: string
          price?: number
          seat_id?: string | null
          status?: string | null
          ticket_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          city: string | null
          created_at: string | null
          id: string
          latitude: string | null
          longitude: string | null
          name: string
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string | null
          id?: string
          latitude?: string | null
          longitude?: string | null
          name: string
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string | null
          id?: string
          latitude?: string | null
          longitude?: string | null
          name?: string
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      financial_analytics_summary: {
        Row: {
          customer_gst_category: string | null
          customer_state: string | null
          event_gst_category: string | null
          event_state: string | null
          total_actual_commission: number | null
          total_commission: number | null
          total_convenience_fees: number | null
          total_gst_commission: number | null
          total_gst_convenience: number | null
          total_ticket_sales: number | null
          transaction_count: number | null
          transaction_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_user: {
        Args: { user_email: string }
        Returns: boolean
      }
      admin_delete_user_by_email: {
        Args: { user_email: string }
        Returns: boolean
      }
      admin_delete_user_by_id: {
        Args: { user_id: string }
        Returns: boolean
      }
      admin_delete_users: {
        Args: { user_emails: string[] }
        Returns: string
      }
      block_user_with_contacts: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: boolean
      }
      bulk_insert_events_with_occurrences: {
        Args: { p_events_data: Json[] }
        Returns: string[]
      }
      calculate_financial_transaction_data: {
        Args: {
          p_booking_id: string
          p_customer_state?: string
          p_event_id: string
          p_event_state?: string
          p_quantity: number
          p_ticket_price: number
        }
        Returns: {
          actual_commission: number
          commission: number
          convenience_base_fee: number
          convenience_fee: number
          gst_on_actual_commission: number
          gst_on_convenience_base_fee: number
          reimbursable_ticket_price: number
        }[]
      }
      check_event_sold_out_status: {
        Args: { event_uuid: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_block_minutes?: number
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_sale_end_dates: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_occurrences: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_otps: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      force_delete_user: {
        Args: { user_email: string }
        Returns: boolean
      }
      generate_event_occurrences: {
        Args:
          | {
              end_date: string
              end_time: string
              event_id: string
              pattern: string
              start_date: string
              start_time: string
            }
          | { p_event_id: string }
        Returns: undefined
      }
      generate_formatted_event_id: {
        Args: { event_uuid: string; venue_state?: string }
        Returns: string
      }
      generate_formatted_id: {
        Args: { prefix?: string; state_name: string }
        Returns: string
      }
      generate_missing_one_time_occurrences: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_recurring_occurrences: {
        Args:
          | {
              p_end_date: string
              p_event_id: string
              p_recurrence_type: string
              p_start_date: string
              p_start_time: string
              p_total_tickets: number
            }
          | {
              p_end_date: string
              p_event_id: string
              p_recurrence_type: string
              p_start_date: string
              p_start_time: string
              p_total_tickets?: number
            }
        Returns: number
      }
      get_booked_seats_for_occurrence: {
        Args: { p_occurrence_id: string }
        Returns: {
          booking_id: string
          row_name: string
          seat_id: string
          seat_number: string
          status: string
        }[]
      }
      get_general_admission_availability: {
        Args: { p_event_id: string }
        Returns: {
          available_tickets: number
          base_price: number
          booked_tickets: number
          category_name: string
          color: string
          commission: number
          convenience_fee: number
          seat_category_id: string
          total_tickets: number
        }[]
      }
      get_next_available_date: {
        Args: {
          event_end_date: string
          event_expiry_minutes?: number
          event_start_date: string
          event_time: string
          recurrence_type: string
        }
        Returns: string
      }
      get_similar_events: {
        Args:
          | {
              current_category: string
              current_city: string
              current_event_id: string
            }
          | {
              p_category: string
              p_city: string
              p_event_id: string
              p_limit?: number
            }
        Returns: {
          artist_image: string | null
          artist_name: string | null
          artists: Json | null
          category: string
          category_id: string | null
          city: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          end_date: string | null
          end_datetime: string
          event_expiry_minutes: number | null
          event_id_display: string | null
          event_images: string | null
          event_logo: string | null
          event_tags: string | null
          event_time: string | null
          "events.tags": Json | null
          formatted_event_id: string | null
          genre: string | null
          genres: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_recurring: boolean | null
          is_regular: boolean | null
          is_sold_out: boolean | null
          language: string | null
          layout_type: string | null
          name: string
          poster: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          sale_end: string
          sale_start: string
          seat_map: Json | null
          seat_map_config: Json | null
          sold_out_at: string | null
          start_date: string | null
          start_datetime: string
          state: string | null
          status: string | null
          sub_category: string | null
          tags: string | null
          terms_and_conditions: string | null
          updated_at: string | null
          venue: string | null
          venue_id: string | null
        }[]
      }
      get_subcategories_by_category: {
        Args: { category_name: string }
        Returns: {
          description: string
          id: string
          is_active: boolean
          name: string
        }[]
      }
      get_user_by_mobile: {
        Args: { mobile_num: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      initialize_general_admission_categories: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      insert_event_with_occurrences: {
        Args: { p_auto_generate_occurrences?: boolean; p_event_data: Json }
        Returns: string
      }
      is_contact_blocked: {
        Args: { p_email?: string; p_mobile?: string; p_phone?: string }
        Returns: {
          is_blocked: boolean
          reason: string
        }[]
      }
      is_event_bookable: {
        Args: { event_id: string }
        Returns: boolean
      }
      is_seat_available_for_occurrence: {
        Args: { p_occurrence_id: string; p_seat_number: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_ip_address?: unknown
          p_resource_id?: string
          p_resource_type?: string
          p_severity?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      recalculate_event_availability: {
        Args: { event_id_param: string }
        Returns: undefined
      }
      recalculate_occurrence_availability: {
        Args: { occurrence_id_param: string }
        Returns: undefined
      }
      recalculate_specific_category_availability: {
        Args: { category_id_param: string }
        Returns: undefined
      }
      recalculate_ticket_availability: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_financial_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      unblock_user_with_contacts: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      update_event_time_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_recurring_event_occurrences: {
        Args: { p_event_id: string }
        Returns: number
      }
      update_user_password: {
        Args: { current_password: string; new_password: string }
        Returns: Json
      }
      validate_booking_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          booking_id: string
          details: string
          issue_type: string
        }[]
      }
    }
    Enums: {
      admin_role: "super_admin" | "admin"
      booking_status: "Confirmed" | "Pending" | "Cancelled" | "confirmed"
      event_status: "Active" | "Inactive" | "Draft"
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
      admin_role: ["super_admin", "admin"],
      booking_status: ["Confirmed", "Pending", "Cancelled", "confirmed"],
      event_status: ["Active", "Inactive", "Draft"],
    },
  },
} as const
