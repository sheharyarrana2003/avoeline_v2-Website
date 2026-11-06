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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          grantee_user_id: string
          id: string
          invite_sent_at: string | null
          invite_token_hash: string | null
          permissions: string[]
          revoked_at: string | null
          scope_id: string
          scope_type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          grantee_user_id: string
          id?: string
          invite_sent_at?: string | null
          invite_token_hash?: string | null
          permissions?: string[]
          revoked_at?: string | null
          scope_id: string
          scope_type: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          grantee_user_id?: string
          id?: string
          invite_sent_at?: string | null
          invite_token_hash?: string | null
          permissions?: string[]
          revoked_at?: string | null
          scope_id?: string
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_grantee_user_id_fkey"
            columns: ["grantee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_deliveries: {
        Row: {
          announcement_id: string
          channel: string
          created_at: string
          display_name: string
          email: string
          error: string | null
          id: string
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          announcement_id: string
          channel: string
          created_at?: string
          display_name?: string
          email?: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          announcement_id?: string
          channel?: string
          created_at?: string
          display_name?: string
          email?: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_deliveries_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "org_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      applicants: {
        Row: {
          applied_at: string | null
          email: string | null
          extra: Json | null
          form_id: string
          id: string
          interview_at: string | null
          interview_notes: string | null
          position_id: string | null
          responses: Json | null
          status: string | null
          team_id: string
        }
        Insert: {
          applied_at?: string | null
          email?: string | null
          extra?: Json | null
          form_id: string
          id?: string
          interview_at?: string | null
          interview_notes?: string | null
          position_id?: string | null
          responses?: Json | null
          status?: string | null
          team_id: string
        }
        Update: {
          applied_at?: string | null
          email?: string | null
          extra?: Json | null
          form_id?: string
          id?: string
          interview_at?: string | null
          interview_notes?: string | null
          position_id?: string | null
          responses?: Json | null
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicants_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "recruitment_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicants_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "team_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      attendee_profiles: {
        Row: {
          attendance_rate: number | null
          average_rating_given: number | null
          department: string | null
          events_attended: number | null
          events_registered: number | null
          extra: Json | null
          graduation_year: number | null
          interests: string[] | null
          is_student_verified: boolean | null
          networking_connections: number | null
          skills: string[] | null
          social_links: Json | null
          student_id: string | null
          total_certificates_earned: number | null
          total_hours_spent: number | null
          total_reviews_written: number | null
          university: string | null
          updated_at: string | null
          user_id: string
          verification_method: string | null
        }
        Insert: {
          attendance_rate?: number | null
          average_rating_given?: number | null
          department?: string | null
          events_attended?: number | null
          events_registered?: number | null
          extra?: Json | null
          graduation_year?: number | null
          interests?: string[] | null
          is_student_verified?: boolean | null
          networking_connections?: number | null
          skills?: string[] | null
          social_links?: Json | null
          student_id?: string | null
          total_certificates_earned?: number | null
          total_hours_spent?: number | null
          total_reviews_written?: number | null
          university?: string | null
          updated_at?: string | null
          user_id: string
          verification_method?: string | null
        }
        Update: {
          attendance_rate?: number | null
          average_rating_given?: number | null
          department?: string | null
          events_attended?: number | null
          events_registered?: number | null
          extra?: Json | null
          graduation_year?: number | null
          interests?: string[] | null
          is_student_verified?: boolean | null
          networking_connections?: number | null
          skills?: string[] | null
          social_links?: Json | null
          student_id?: string | null
          total_certificates_earned?: number | null
          total_hours_spent?: number | null
          total_reviews_written?: number | null
          university?: string | null
          updated_at?: string | null
          user_id?: string
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_meetups: {
        Row: {
          badge_tier_id: string
          created_at: string | null
          description: string | null
          id: string
          linked_event_id: string | null
          location: string | null
          scheduled_at: string | null
          title: string
        }
        Insert: {
          badge_tier_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          linked_event_id?: string | null
          location?: string | null
          scheduled_at?: string | null
          title: string
        }
        Update: {
          badge_tier_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          linked_event_id?: string | null
          location?: string | null
          scheduled_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_meetups_badge_tier_id_fkey"
            columns: ["badge_tier_id"]
            isOneToOne: false
            referencedRelation: "badge_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_meetups_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_tiers: {
        Row: {
          applies_to: string[] | null
          default_discount_pct: number | null
          id: string
          key: string
          label: string
          requirement_description: string | null
          sort_order: number | null
        }
        Insert: {
          applies_to?: string[] | null
          default_discount_pct?: number | null
          id?: string
          key: string
          label: string
          requirement_description?: string | null
          sort_order?: number | null
        }
        Update: {
          applies_to?: string[] | null
          default_discount_pct?: number | null
          id?: string
          key?: string
          label?: string
          requirement_description?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          actual_delivery_time: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          contract_signed: boolean | null
          contract_signed_at: string | null
          contract_signed_by_organizer: boolean | null
          contract_signed_by_vendor: boolean | null
          contract_url: string | null
          created_at: string | null
          currency: string | null
          delivery_notes: string | null
          event_id: string
          extra: Json | null
          id: string
          invoice_pdf_url: string | null
          negotiation_messages: Json | null
          organizer_id: string
          organizer_rating: number | null
          platform_commission: number | null
          platform_commission_pct: number | null
          quote: Json | null
          quote_pdf_url: string | null
          receipt_pdf_url: string | null
          requirements: Json | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_type: string | null
          setup_completed: boolean | null
          status: string
          status_history: Json | null
          teardown_completed: boolean | null
          total_amount: number | null
          updated_at: string | null
          vendor_id: string
          vendor_rating: number | null
          vendor_receives: number | null
        }
        Insert: {
          actual_delivery_time?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_signed_by_organizer?: boolean | null
          contract_signed_by_vendor?: boolean | null
          contract_url?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_notes?: string | null
          event_id: string
          extra?: Json | null
          id?: string
          invoice_pdf_url?: string | null
          negotiation_messages?: Json | null
          organizer_id: string
          organizer_rating?: number | null
          platform_commission?: number | null
          platform_commission_pct?: number | null
          quote?: Json | null
          quote_pdf_url?: string | null
          receipt_pdf_url?: string | null
          requirements?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_type?: string | null
          setup_completed?: boolean | null
          status?: string
          status_history?: Json | null
          teardown_completed?: boolean | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_id: string
          vendor_rating?: number | null
          vendor_receives?: number | null
        }
        Update: {
          actual_delivery_time?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_signed_by_organizer?: boolean | null
          contract_signed_by_vendor?: boolean | null
          contract_url?: string | null
          created_at?: string | null
          currency?: string | null
          delivery_notes?: string | null
          event_id?: string
          extra?: Json | null
          id?: string
          invoice_pdf_url?: string | null
          negotiation_messages?: Json | null
          organizer_id?: string
          organizer_rating?: number | null
          platform_commission?: number | null
          platform_commission_pct?: number | null
          quote?: Json | null
          quote_pdf_url?: string | null
          receipt_pdf_url?: string | null
          requirements?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_type?: string | null
          setup_completed?: boolean | null
          status?: string
          status_history?: Json | null
          teardown_completed?: boolean | null
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string
          vendor_rating?: number | null
          vendor_receives?: number | null
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
            foreignKeyName: "bookings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_entries: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          entry_date: string
          entry_type: string
          extra: Json | null
          id: string
          note: string | null
          org_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          entry_date: string
          entry_type: string
          extra?: Json | null
          id?: string
          note?: string | null
          org_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          entry_date?: string
          entry_type?: string
          extra?: Json | null
          id?: string
          note?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_links: {
        Row: {
          connection_id: string
          created_at: string
          entity_id: string
          entity_type: string
          etag: string | null
          google_calendar_id: string
          google_event_id: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          meet_url: string | null
          request_id: string
          status: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          etag?: string | null
          google_calendar_id: string
          google_event_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          meet_url?: string | null
          request_id: string
          status?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          etag?: string | null
          google_calendar_id?: string
          google_event_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          meet_url?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_links_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      category_field_sets: {
        Row: {
          extra: Json | null
          fields: Json
          id: string
          super_category_id: string | null
        }
        Insert: {
          extra?: Json | null
          fields?: Json
          id?: string
          super_category_id?: string | null
        }
        Update: {
          extra?: Json | null
          fields?: Json
          id?: string
          super_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_field_sets_super_category_id_fkey"
            columns: ["super_category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_requests: {
        Row: {
          admin_note: string | null
          category_type: string
          created_at: string | null
          decided_at: string | null
          extra: Json | null
          id: string
          name: string
          requested_by: string | null
          requested_by_name: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          category_type: string
          created_at?: string | null
          decided_at?: string | null
          extra?: Json | null
          id?: string
          name: string
          requested_by?: string | null
          requested_by_name?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          category_type?: string
          created_at?: string | null
          decided_at?: string | null
          extra?: Json | null
          id?: string
          name?: string
          requested_by?: string | null
          requested_by_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_template_versions: {
        Row: {
          assets: Json
          created_at: string
          id: string
          layout: Json
          template_id: string
          version: number
        }
        Insert: {
          assets?: Json
          created_at?: string
          id?: string
          layout: Json
          template_id: string
          version: number
        }
        Update: {
          assets?: Json
          created_at?: string
          id?: string
          layout?: Json
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificate_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          assets: Json
          created_at: string | null
          email_attach_pdf: boolean
          event_id: string | null
          extra: Json | null
          id: string
          layout: Json
          name: string
          organizer_id: string
          status: string
          updated_at: string | null
          version: number
        }
        Insert: {
          assets?: Json
          created_at?: string | null
          email_attach_pdf?: boolean
          event_id?: string | null
          extra?: Json | null
          id?: string
          layout?: Json
          name?: string
          organizer_id: string
          status?: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          assets?: Json
          created_at?: string | null
          email_attach_pdf?: boolean
          event_id?: string | null
          extra?: Json | null
          id?: string
          layout?: Json
          name?: string
          organizer_id?: string
          status?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          created_at: string | null
          data: Json
          download_count: number | null
          event_id: string
          extra: Json | null
          id: string
          issued_at: string | null
          organizer_id: string
          registration_id: string | null
          status: string | null
          template_id: string | null
          template_version: number
          updated_at: string | null
          user_id: string | null
          verification_code: string
          verification_count: number | null
        }
        Insert: {
          certificate_number: string
          created_at?: string | null
          data?: Json
          download_count?: number | null
          event_id: string
          extra?: Json | null
          id?: string
          issued_at?: string | null
          organizer_id: string
          registration_id?: string | null
          status?: string | null
          template_id?: string | null
          template_version?: number
          updated_at?: string | null
          user_id?: string | null
          verification_code: string
          verification_count?: number | null
        }
        Update: {
          certificate_number?: string
          created_at?: string | null
          data?: Json
          download_count?: number | null
          event_id?: string
          extra?: Json | null
          id?: string
          issued_at?: string | null
          organizer_id?: string
          registration_id?: string | null
          status?: string | null
          template_id?: string | null
          template_version?: number
          updated_at?: string | null
          user_id?: string | null
          verification_code?: string
          verification_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string | null
          event_format_id: string | null
          extra: Json | null
          id: string
          items: Json
          super_category_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_format_id?: string | null
          extra?: Json | null
          id?: string
          items?: Json
          super_category_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_format_id?: string | null
          extra?: Json | null
          id?: string
          items?: Json
          super_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_event_format_id_fkey"
            columns: ["event_format_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_super_category_id_fkey"
            columns: ["super_category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      club_roster: {
        Row: {
          created_at: string
          designation: string | null
          email: string | null
          full_name: string
          id: string
          is_lead: boolean
          member_code: string | null
          phone: string | null
          team_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_lead?: boolean
          member_code?: string | null
          phone?: string | null
          team_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          designation?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_lead?: boolean
          member_code?: string | null
          phone?: string | null
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_roster_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_roster_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      compete_access_failures: {
        Row: {
          created_at: string
          event_id: string
          id: string
          ip_hash: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          ip_hash?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          ip_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compete_access_failures_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_audit: {
        Row: {
          action: string
          actor_id: string | null
          connection_id: string | null
          created_at: string
          details: Json
          id: string
          owner_id: string
          owner_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          connection_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          owner_id: string
          owner_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          connection_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          owner_id?: string
          owner_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_audit_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_grants: {
        Row: {
          capabilities: string[]
          connection_id: string
          created_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          capabilities?: string[]
          connection_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          capabilities?: string[]
          connection_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_grants_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_reconnect_tokens: {
        Row: {
          connection_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          owner_id: string
          owner_type: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          owner_id: string
          owner_type: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          owner_id?: string
          owner_type?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_reconnect_tokens_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_reconnect_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_usage: {
        Row: {
          capability: string
          connection_id: string
          count: number
          usage_date: string
        }
        Insert: {
          capability: string
          connection_id: string
          count?: number
          usage_date: string
        }
        Update: {
          capability?: string
          connection_id?: string
          count?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_usage_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          message: string
          name: string
          notes: string | null
          spam_score: number | null
          status: string
          topic: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          message: string
          name: string
          notes?: string | null
          spam_score?: number | null
          status?: string
          topic?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          message?: string
          name?: string
          notes?: string | null
          spam_score?: number | null
          status?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_responses: {
        Row: {
          answers: Json
          form_id: string
          id: string
          meta: Json
          respondent_email: string | null
          respondent_name: string | null
          submitted_at: string
        }
        Insert: {
          answers?: Json
          form_id: string
          id?: string
          meta?: Json
          respondent_email?: string | null
          respondent_name?: string | null
          submitted_at?: string
        }
        Update: {
          answers?: Json
          form_id?: string
          id?: string
          meta?: Json
          respondent_email?: string | null
          respondent_name?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_forms: {
        Row: {
          created_at: string
          description: string
          fields: Json
          id: string
          kind: string
          owner_user_id: string
          public_token: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          fields?: Json
          id?: string
          kind?: string
          owner_user_id: string
          public_token: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          fields?: Json
          id?: string
          kind?: string
          owner_user_id?: string
          public_token?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_forms_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_pricing_agreements: {
        Row: {
          active: boolean | null
          created_at: string | null
          discount_pct: number | null
          flat_monthly_override: number | null
          id: string
          notes: string | null
          organizer_id: string
          set_by: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          discount_pct?: number | null
          flat_monthly_override?: number | null
          id?: string
          notes?: string | null
          organizer_id: string
          set_by?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          discount_pct?: number | null
          flat_monthly_override?: number | null
          id?: string
          notes?: string | null
          organizer_id?: string
          set_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_pricing_agreements_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_pricing_agreements_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_limit_overrides: {
        Row: {
          created_at: string
          daily_cap: number | null
          expires_at: string | null
          max_per_send: number | null
          monthly_cap: number | null
          owner_id: string
          reason: string
          set_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_cap?: number | null
          expires_at?: string | null
          max_per_send?: number | null
          monthly_cap?: number | null
          owner_id: string
          reason: string
          set_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_cap?: number | null
          expires_at?: string | null
          max_per_send?: number | null
          monthly_cap?: number | null
          owner_id?: string
          reason?: string
          set_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_limit_overrides_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_limit_overrides_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          batch_key: string | null
          connection_id: string | null
          created_at: string
          error: string | null
          id: string
          idempotency_key: string | null
          kind: string
          lane: string
          payload: Json
          provider_id: string | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          batch_key?: string | null
          connection_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          kind: string
          lane?: string
          payload?: Json
          provider_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Update: {
          batch_key?: string | null
          connection_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string
          lane?: string
          payload?: Json
          provider_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempt_at: string | null
          attempt_count: number
          batch_id: string | null
          connection_id: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          last_error: string | null
          not_before: string | null
          paused: boolean
          payload: Json
          priority: number
          skip_reason: string | null
          status: string
          time_sensitive: boolean
          updated_at: string
        }
        Insert: {
          attempt_at?: string | null
          attempt_count?: number
          batch_id?: string | null
          connection_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          not_before?: string | null
          paused?: boolean
          payload?: Json
          priority?: number
          skip_reason?: string | null
          status?: string
          time_sensitive?: boolean
          updated_at?: string
        }
        Update: {
          attempt_at?: string | null
          attempt_count?: number
          batch_id?: string | null
          connection_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          not_before?: string | null
          paused?: boolean
          payload?: Json
          priority?: number
          skip_reason?: string | null
          status?: string
          time_sensitive?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "email_send_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_batches: {
        Row: {
          cancelled: number
          connection_id: string
          created_at: string
          created_by: string | null
          event_id: string | null
          failed: number
          id: string
          kind: string
          not_before: string | null
          owner_id: string
          owner_type: string
          sent: number
          skipped: number
          spread_days: number | null
          status: string
          subject: string | null
          total: number
          updated_at: string
        }
        Insert: {
          cancelled?: number
          connection_id: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          failed?: number
          id?: string
          kind: string
          not_before?: string | null
          owner_id: string
          owner_type: string
          sent?: number
          skipped?: number
          spread_days?: number | null
          status?: string
          subject?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          cancelled?: number
          connection_id?: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          failed?: number
          id?: string
          kind?: string
          not_before?: string | null
          owner_id?: string
          owner_type?: string
          sent?: number
          skipped?: number
          spread_days?: number | null
          status?: string
          subject?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_batches_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          created_at: string
          email_normalized: string
          id: string
          owner_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          email_normalized: string
          id?: string
          owner_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          email_normalized?: string
          id?: string
          owner_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_suppressions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_access_tiers: {
        Row: {
          description: string | null
          event_id: string
          extra: Json | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          description?: string | null
          event_id: string
          extra?: Json | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          description?: string | null
          event_id?: string
          extra?: Json | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_access_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_agenda_items: {
        Row: {
          add_to_calendar: boolean
          description: string | null
          duration: string | null
          end_clock: string | null
          end_time: string | null
          event_id: string
          extra: Json | null
          id: string
          item_type: string | null
          linked_child_event_id: string | null
          location: string | null
          room: string | null
          session_date: string | null
          speaker_names: string[] | null
          start_clock: string | null
          start_time: string | null
          status: string | null
          timezone: string | null
          title: string
        }
        Insert: {
          add_to_calendar?: boolean
          description?: string | null
          duration?: string | null
          end_clock?: string | null
          end_time?: string | null
          event_id: string
          extra?: Json | null
          id?: string
          item_type?: string | null
          linked_child_event_id?: string | null
          location?: string | null
          room?: string | null
          session_date?: string | null
          speaker_names?: string[] | null
          start_clock?: string | null
          start_time?: string | null
          status?: string | null
          timezone?: string | null
          title: string
        }
        Update: {
          add_to_calendar?: boolean
          description?: string | null
          duration?: string | null
          end_clock?: string | null
          end_time?: string | null
          event_id?: string
          extra?: Json | null
          id?: string
          item_type?: string | null
          linked_child_event_id?: string | null
          location?: string | null
          room?: string | null
          session_date?: string | null
          speaker_names?: string[] | null
          start_clock?: string | null
          start_time?: string | null
          status?: string | null
          timezone?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_agenda_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_agenda_items_linked_child_event_id_fkey"
            columns: ["linked_child_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_agenda_speakers: {
        Row: {
          agenda_item_id: string
          speaker_id: string
        }
        Insert: {
          agenda_item_id: string
          speaker_id: string
        }
        Update: {
          agenda_item_id?: string
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_agenda_speakers_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "event_agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_agenda_speakers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "event_speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          active: boolean | null
          admin_note: string | null
          category_type: string
          checklist: Json | null
          created_at: string | null
          description: string | null
          extra: Json | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          admin_note?: string | null
          category_type: string
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          extra?: Json | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          admin_note?: string | null
          category_type?: string
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          extra?: Json | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_checklist_items: {
        Row: {
          done: boolean | null
          event_id: string
          extra: Json | null
          id: string
          label: string
          sort_order: number | null
        }
        Insert: {
          done?: boolean | null
          event_id: string
          extra?: Json | null
          id?: string
          label: string
          sort_order?: number | null
        }
        Update: {
          done?: boolean | null
          event_id?: string
          extra?: Json | null
          id?: string
          label?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_email_templates: {
        Row: {
          body: string
          created_at: string
          event_id: string
          extra: Json
          id: string
          include_blocks: string[]
          kind: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          event_id: string
          extra?: Json
          id?: string
          include_blocks?: string[]
          kind: string
          subject?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          extra?: Json
          id?: string
          include_blocks?: string[]
          kind?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_email_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_expenses: {
        Row: {
          amount: number
          booking_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          event_id: string
          external_vendor_id: string | null
          id: string
          kind: string
          paid_on: string | null
          receipt_path: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          event_id: string
          external_vendor_id?: string | null
          id?: string
          kind?: string
          paid_on?: string | null
          receipt_path?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          event_id?: string
          external_vendor_id?: string | null
          id?: string
          kind?: string
          paid_on?: string | null
          receipt_path?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_expenses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_expenses_external_vendor_id_fkey"
            columns: ["external_vendor_id"]
            isOneToOne: false
            referencedRelation: "event_external_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      event_external_vendors: {
        Row: {
          budget: number | null
          contact: string
          created_at: string
          created_by: string | null
          description: string
          event_id: string
          id: string
          name: string
          status: string
          updated_at: string
          vendor_type: string
        }
        Insert: {
          budget?: number | null
          contact?: string
          created_at?: string
          created_by?: string | null
          description?: string
          event_id: string
          id?: string
          name: string
          status?: string
          updated_at?: string
          vendor_type?: string
        }
        Update: {
          budget?: number | null
          contact?: string
          created_at?: string
          created_by?: string | null
          description?: string
          event_id?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
          vendor_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_external_vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_external_vendors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_form_fields: {
        Row: {
          archived_at: string | null
          created_at: string
          event_id: string
          help_text: string | null
          id: string
          is_system: boolean
          key: string
          label: string
          options: Json
          order_index: number
          placeholder: string | null
          required: boolean
          scope: string
          type: string
          updated_at: string
          validation: Json
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          event_id: string
          help_text?: string | null
          id?: string
          is_system?: boolean
          key: string
          label: string
          options?: Json
          order_index?: number
          placeholder?: string | null
          required?: boolean
          scope?: string
          type: string
          updated_at?: string
          validation?: Json
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          event_id?: string
          help_text?: string | null
          id?: string
          is_system?: boolean
          key?: string
          label?: string
          options?: Json
          order_index?: number
          placeholder?: string | null
          required?: boolean
          scope?: string
          type?: string
          updated_at?: string
          validation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "event_form_fields_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invites: {
        Row: {
          created_at: string | null
          email: string
          event_id: string
          expires_at: string | null
          extra: Json | null
          id: string
          kind: string | null
          name: string | null
          opened_at: string | null
          registered_at: string | null
          registration_id: string | null
          single_use: boolean | null
          tier: string | null
          token: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          event_id: string
          expires_at?: string | null
          extra?: Json | null
          id?: string
          kind?: string | null
          name?: string | null
          opened_at?: string | null
          registered_at?: string | null
          registration_id?: string | null
          single_use?: boolean | null
          tier?: string | null
          token?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          event_id?: string
          expires_at?: string | null
          extra?: Json | null
          id?: string
          kind?: string | null
          name?: string | null
          opened_at?: string | null
          registered_at?: string | null
          registration_id?: string | null
          single_use?: boolean | null
          tier?: string | null
          token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_registration_fk"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reports: {
        Row: {
          admin_note: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          event_id: string
          event_title: string | null
          extra: Json | null
          id: string
          reason: string
          reporter_email: string | null
          status: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          event_id: string
          event_title?: string | null
          extra?: Json | null
          id?: string
          reason: string
          reporter_email?: string | null
          status?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          event_id?: string
          event_title?: string | null
          extra?: Json | null
          id?: string
          reason?: string
          reporter_email?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reports_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_speakers: {
        Row: {
          bio: string | null
          company: string | null
          created_at: string | null
          designation: string | null
          email: string | null
          end_time: string | null
          event_id: string
          extra: Json | null
          id: string
          is_contact_public: boolean | null
          linkedin: string | null
          name: string
          phone: string | null
          profile_image: string | null
          purpose: string | null
          session_title: string | null
          start_time: string | null
          twitter: string | null
          visibility_tier: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          created_at?: string | null
          designation?: string | null
          email?: string | null
          end_time?: string | null
          event_id: string
          extra?: Json | null
          id?: string
          is_contact_public?: boolean | null
          linkedin?: string | null
          name: string
          phone?: string | null
          profile_image?: string | null
          purpose?: string | null
          session_title?: string | null
          start_time?: string | null
          twitter?: string | null
          visibility_tier?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          created_at?: string | null
          designation?: string | null
          email?: string | null
          end_time?: string | null
          event_id?: string
          extra?: Json | null
          id?: string
          is_contact_public?: boolean | null
          linkedin?: string | null
          name?: string
          phone?: string | null
          profile_image?: string | null
          purpose?: string | null
          session_title?: string | null
          start_time?: string | null
          twitter?: string | null
          visibility_tier?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_speakers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sponsors_partners: {
        Row: {
          accepted_at: string | null
          benefits: Json | null
          collaboration_terms: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_value: number | null
          contribution_custom: string | null
          contribution_kind: string | null
          created_at: string | null
          event_id: string
          extra: Json | null
          id: string
          invite_token: string | null
          invited_at: string | null
          invited_email: string | null
          logo_url: string | null
          name: string
          partnership_kind: string | null
          role: string | null
          tier: string | null
          track_id: string | null
          type: string
          updated_at: string | null
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          accepted_at?: string | null
          benefits?: Json | null
          collaboration_terms?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_value?: number | null
          contribution_custom?: string | null
          contribution_kind?: string | null
          created_at?: string | null
          event_id: string
          extra?: Json | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_email?: string | null
          logo_url?: string | null
          name: string
          partnership_kind?: string | null
          role?: string | null
          tier?: string | null
          track_id?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          accepted_at?: string | null
          benefits?: Json | null
          collaboration_terms?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_value?: number | null
          contribution_custom?: string | null
          contribution_kind?: string | null
          created_at?: string | null
          event_id?: string
          extra?: Json | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_email?: string | null
          logo_url?: string | null
          name?: string
          partnership_kind?: string | null
          role?: string | null
          tier?: string | null
          track_id?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sponsors_partners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sponsors_partners_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sponsors_partners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_assignments: {
        Row: {
          event_id: string
          id: string
          member_ids: string[]
          team_id: string
        }
        Insert: {
          event_id: string
          id?: string
          member_ids?: string[]
          team_id: string
        }
        Update: {
          event_id?: string
          id?: string
          member_ids?: string[]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          access_code: string | null
          address: string | null
          allow_group_registration: boolean
          archived_at: string | null
          available_seats: number | null
          banner_image: string | null
          budget_total: number | null
          category: string | null
          certificate_template_id: string | null
          certificate_type: string | null
          check_ins_count: number | null
          city: string | null
          completion_rate: number | null
          country: string | null
          created_at: string | null
          currency: string | null
          custom_field_values: Json | null
          custom_form: Json | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_format_id: string | null
          event_type: string | null
          extra: Json | null
          format: string | null
          gallery_images: string[] | null
          group_max_size: number | null
          group_min_size: number | null
          id: string
          is_demo: boolean
          is_free: boolean | null
          is_recurring: boolean | null
          issue_certificates: boolean | null
          language: string | null
          maps_url: string | null
          max_registrations_per_user: number | null
          meeting_id: string | null
          meeting_link: string | null
          meeting_password: string | null
          meeting_platform: string | null
          moderation_unpublished: boolean
          org_id: string | null
          organizer_id: string
          parent_event_id: string | null
          pricing: Json | null
          promo_video_url: string | null
          published_at: string | null
          recurrence_pattern: string | null
          registration_close_date: string | null
          registration_open_date: string | null
          registrations_count: number | null
          requires_approval: boolean | null
          requires_registration: boolean
          reserved_seats: number | null
          revenue: number | null
          short_description: string | null
          show_collaborators: boolean
          show_partners: boolean
          show_sponsors: boolean
          sponsor_tiers: string[] | null
          start_date: string | null
          start_time: string | null
          status: string
          super_category_id: string | null
          tenure_id: string | null
          timezone: string | null
          title: string
          total_seats: number | null
          updated_at: string | null
          venue_name: string | null
          views: number | null
          visibility: string
          waitlist_capacity: number | null
          waitlist_enabled: boolean | null
          website_featured: boolean
        }
        Insert: {
          access_code?: string | null
          address?: string | null
          allow_group_registration?: boolean
          archived_at?: string | null
          available_seats?: number | null
          banner_image?: string | null
          budget_total?: number | null
          category?: string | null
          certificate_template_id?: string | null
          certificate_type?: string | null
          check_ins_count?: number | null
          city?: string | null
          completion_rate?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          custom_field_values?: Json | null
          custom_form?: Json | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_format_id?: string | null
          event_type?: string | null
          extra?: Json | null
          format?: string | null
          gallery_images?: string[] | null
          group_max_size?: number | null
          group_min_size?: number | null
          id?: string
          is_demo?: boolean
          is_free?: boolean | null
          is_recurring?: boolean | null
          issue_certificates?: boolean | null
          language?: string | null
          maps_url?: string | null
          max_registrations_per_user?: number | null
          meeting_id?: string | null
          meeting_link?: string | null
          meeting_password?: string | null
          meeting_platform?: string | null
          moderation_unpublished?: boolean
          org_id?: string | null
          organizer_id: string
          parent_event_id?: string | null
          pricing?: Json | null
          promo_video_url?: string | null
          published_at?: string | null
          recurrence_pattern?: string | null
          registration_close_date?: string | null
          registration_open_date?: string | null
          registrations_count?: number | null
          requires_approval?: boolean | null
          requires_registration?: boolean
          reserved_seats?: number | null
          revenue?: number | null
          short_description?: string | null
          show_collaborators?: boolean
          show_partners?: boolean
          show_sponsors?: boolean
          sponsor_tiers?: string[] | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          super_category_id?: string | null
          tenure_id?: string | null
          timezone?: string | null
          title: string
          total_seats?: number | null
          updated_at?: string | null
          venue_name?: string | null
          views?: number | null
          visibility?: string
          waitlist_capacity?: number | null
          waitlist_enabled?: boolean | null
          website_featured?: boolean
        }
        Update: {
          access_code?: string | null
          address?: string | null
          allow_group_registration?: boolean
          archived_at?: string | null
          available_seats?: number | null
          banner_image?: string | null
          budget_total?: number | null
          category?: string | null
          certificate_template_id?: string | null
          certificate_type?: string | null
          check_ins_count?: number | null
          city?: string | null
          completion_rate?: number | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          custom_field_values?: Json | null
          custom_form?: Json | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_format_id?: string | null
          event_type?: string | null
          extra?: Json | null
          format?: string | null
          gallery_images?: string[] | null
          group_max_size?: number | null
          group_min_size?: number | null
          id?: string
          is_demo?: boolean
          is_free?: boolean | null
          is_recurring?: boolean | null
          issue_certificates?: boolean | null
          language?: string | null
          maps_url?: string | null
          max_registrations_per_user?: number | null
          meeting_id?: string | null
          meeting_link?: string | null
          meeting_password?: string | null
          meeting_platform?: string | null
          moderation_unpublished?: boolean
          org_id?: string | null
          organizer_id?: string
          parent_event_id?: string | null
          pricing?: Json | null
          promo_video_url?: string | null
          published_at?: string | null
          recurrence_pattern?: string | null
          registration_close_date?: string | null
          registration_open_date?: string | null
          registrations_count?: number | null
          requires_approval?: boolean | null
          requires_registration?: boolean
          reserved_seats?: number | null
          revenue?: number | null
          short_description?: string | null
          show_collaborators?: boolean
          show_partners?: boolean
          show_sponsors?: boolean
          sponsor_tiers?: string[] | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          super_category_id?: string | null
          tenure_id?: string | null
          timezone?: string | null
          title?: string
          total_seats?: number | null
          updated_at?: string | null
          venue_name?: string | null
          views?: number | null
          visibility?: string
          waitlist_capacity?: number | null
          waitlist_enabled?: boolean | null
          website_featured?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "events_event_format_id_fkey"
            columns: ["event_format_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_super_category_id_fkey"
            columns: ["super_category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenure_id_fkey"
            columns: ["tenure_id"]
            isOneToOne: false
            referencedRelation: "org_tenures"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_overrides: {
        Row: {
          created_at: string | null
          denied: boolean
          ended_emailed_at: string | null
          expires_at: string | null
          granted_by: string | null
          id: string
          module_key: string
          organizer_id: string | null
          reason: string | null
          target_org_id: string | null
        }
        Insert: {
          created_at?: string | null
          denied?: boolean
          ended_emailed_at?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          module_key: string
          organizer_id?: string | null
          reason?: string | null
          target_org_id?: string | null
        }
        Update: {
          created_at?: string | null
          denied?: boolean
          ended_emailed_at?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          module_key?: string
          organizer_id?: string | null
          reason?: string | null
          target_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_overrides_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_overrides_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_overrides_target_org_id_fkey"
            columns: ["target_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_analyses: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          input_hash: string
          model: string | null
          organizer_id: string
          response_count: number
          result: Json
          scope_key: string
          source: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          input_hash: string
          model?: string | null
          organizer_id: string
          response_count?: number
          result?: Json
          scope_key?: string
          source?: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          input_hash?: string
          model?: string | null
          organizer_id?: string
          response_count?: number
          result?: Json
          scope_key?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_analyses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_analyses_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_announcements: {
        Row: {
          body: string
          created_at: string | null
          emailed_count: number | null
          event_id: string
          extra: Json | null
          id: string
          title: string
          track_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          emailed_count?: number | null
          event_id: string
          extra?: Json | null
          id?: string
          title: string
          track_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          emailed_count?: number | null
          event_id?: string
          extra?: Json | null
          id?: string
          title?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_announcements_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_anomalies: {
        Row: {
          created_at: string | null
          detail: string | null
          event_id: string
          extra: Json | null
          hackathon_team_id: string | null
          id: string
          kind: string | null
        }
        Insert: {
          created_at?: string | null
          detail?: string | null
          event_id: string
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
          kind?: string | null
        }
        Update: {
          created_at?: string | null
          detail?: string | null
          event_id?: string
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
          kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_anomalies_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_anomalies_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_attendance: {
        Row: {
          checked_in_at: string | null
          event_id: string
          extra: Json | null
          hackathon_team_id: string | null
          id: string
          track_id: string | null
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          event_id: string
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
          track_id?: string | null
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          event_id?: string
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
          track_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_attendance_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_config: {
        Row: {
          config_key: string
          config_value: Json | null
          enabled: boolean | null
          event_id: string | null
          id: string
          track_id: string | null
        }
        Insert: {
          config_key: string
          config_value?: Json | null
          enabled?: boolean | null
          event_id?: string | null
          id?: string
          track_id?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json | null
          enabled?: boolean | null
          event_id?: string | null
          id?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_config_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_config_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_ctf_challenges: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          category: string | null
          created_at: string | null
          description: string | null
          docker_image: string | null
          dynamic_flag_salt: string | null
          event_id: string
          extra: Json | null
          flag_type: string | null
          hints: Json | null
          id: string
          points: number | null
          static_flag: string | null
          time_limit_minutes: number | null
          title: string
          track_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          docker_image?: string | null
          dynamic_flag_salt?: string | null
          event_id: string
          extra?: Json | null
          flag_type?: string | null
          hints?: Json | null
          id?: string
          points?: number | null
          static_flag?: string | null
          time_limit_minutes?: number | null
          title: string
          track_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          docker_image?: string | null
          dynamic_flag_salt?: string | null
          event_id?: string
          extra?: Json | null
          flag_type?: string | null
          hints?: Json | null
          id?: string
          points?: number | null
          static_flag?: string | null
          time_limit_minutes?: number | null
          title?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_ctf_challenges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_ctf_challenges_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_flag_submissions: {
        Row: {
          challenge_id: string
          correct: boolean | null
          extra: Json | null
          flag_value: string | null
          hackathon_team_id: string | null
          id: string
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id: string
          correct?: boolean | null
          extra?: Json | null
          flag_value?: string | null
          hackathon_team_id?: string | null
          id?: string
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string
          correct?: boolean | null
          extra?: Json | null
          flag_value?: string | null
          hackathon_team_id?: string | null
          id?: string
          submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_flag_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "hackathon_ctf_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_flag_submissions_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_flag_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_judges: {
        Row: {
          email: string
          event_id: string
          extra: Json | null
          id: string
          invite_token: string | null
          invited_at: string | null
          last_scored_at: string | null
          name: string
          track_ids: string[] | null
        }
        Insert: {
          email: string
          event_id: string
          extra?: Json | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          last_scored_at?: string | null
          name: string
          track_ids?: string[] | null
        }
        Update: {
          email?: string
          event_id?: string
          extra?: Json | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          last_scored_at?: string | null
          name?: string
          track_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_judges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_mentors: {
        Row: {
          bio: string | null
          email: string | null
          event_id: string
          expertise: string[] | null
          extra: Json | null
          id: string
          name: string
        }
        Insert: {
          bio?: string | null
          email?: string | null
          event_id: string
          expertise?: string[] | null
          extra?: Json | null
          id?: string
          name: string
        }
        Update: {
          bio?: string | null
          email?: string | null
          event_id?: string
          expertise?: string[] | null
          extra?: Json | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_mentors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_phases: {
        Row: {
          closes_at: string | null
          ends_at: string | null
          event_id: string
          extra: Json | null
          id: string
          name: string
          opens_at: string | null
          order_index: number | null
          sort_order: number | null
          starts_at: string | null
          track_id: string | null
        }
        Insert: {
          closes_at?: string | null
          ends_at?: string | null
          event_id: string
          extra?: Json | null
          id?: string
          name: string
          opens_at?: string | null
          order_index?: number | null
          sort_order?: number | null
          starts_at?: string | null
          track_id?: string | null
        }
        Update: {
          closes_at?: string | null
          ends_at?: string | null
          event_id?: string
          extra?: Json | null
          id?: string
          name?: string
          opens_at?: string | null
          order_index?: number | null
          sort_order?: number | null
          starts_at?: string | null
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_phases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_phases_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_sandboxes: {
        Row: {
          challenge_id: string | null
          created_at: string | null
          docker_image: string | null
          event_id: string | null
          extra: Json | null
          hackathon_team_id: string | null
          id: string
          instance_url: string | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string | null
          docker_image?: string | null
          event_id?: string | null
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
          instance_url?: string | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          created_at?: string | null
          docker_image?: string | null
          event_id?: string | null
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
          instance_url?: string | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_sandboxes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "hackathon_ctf_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_sandboxes_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_schedules: {
        Row: {
          body: string | null
          event_id: string
          extra: Json | null
          id: string
          schedule_date: string
          title: string | null
        }
        Insert: {
          body?: string | null
          event_id: string
          extra?: Json | null
          id?: string
          schedule_date: string
          title?: string | null
        }
        Update: {
          body?: string | null
          event_id?: string
          extra?: Json | null
          id?: string
          schedule_date?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_scores: {
        Row: {
          category: string
          comment: string | null
          extra: Json | null
          hackathon_team_id: string
          id: string
          judge_id: string
          round: number
          score: number
          scored_at: string | null
        }
        Insert: {
          category: string
          comment?: string | null
          extra?: Json | null
          hackathon_team_id: string
          id?: string
          judge_id: string
          round: number
          score: number
          scored_at?: string | null
        }
        Update: {
          category?: string
          comment?: string | null
          extra?: Json | null
          hackathon_team_id?: string
          id?: string
          judge_id?: string
          round?: number
          score?: number
          scored_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_scores_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_scores_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "hackathon_judges"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_settings: {
        Row: {
          event_id: string
          extra: Json | null
          livestream_url: string | null
          max_attachment_mb: number
          online_mode: boolean | null
          updated_at: string | null
        }
        Insert: {
          event_id: string
          extra?: Json | null
          livestream_url?: string | null
          max_attachment_mb?: number
          online_mode?: boolean | null
          updated_at?: string | null
        }
        Update: {
          event_id?: string
          extra?: Json | null
          livestream_url?: string | null
          max_attachment_mb?: number
          online_mode?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_submissions: {
        Row: {
          deck_name: string | null
          deck_path: string | null
          demo_video_url: string | null
          description: string | null
          extra: Json | null
          hackathon_team_id: string
          id: string
          repo_url: string | null
          submitted_at: string | null
          track_id: string
          unlocked_by_organizer: boolean | null
          updated_at: string | null
        }
        Insert: {
          deck_name?: string | null
          deck_path?: string | null
          demo_video_url?: string | null
          description?: string | null
          extra?: Json | null
          hackathon_team_id: string
          id?: string
          repo_url?: string | null
          submitted_at?: string | null
          track_id: string
          unlocked_by_organizer?: boolean | null
          updated_at?: string | null
        }
        Update: {
          deck_name?: string | null
          deck_path?: string | null
          demo_video_url?: string | null
          description?: string | null
          extra?: Json | null
          hackathon_team_id?: string
          id?: string
          repo_url?: string | null
          submitted_at?: string | null
          track_id?: string
          unlocked_by_organizer?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_submissions_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_submissions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_task_assignments: {
        Row: {
          hackathon_team_id: string
          id: string
          task_id: string
        }
        Insert: {
          hackathon_team_id: string
          id?: string
          task_id: string
        }
        Update: {
          hackathon_team_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_task_assignments_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_task_completions: {
        Row: {
          attempted_at: string | null
          extra: Json
          hackathon_team_id: string
          id: string
          is_correct: boolean | null
          points_awarded: number | null
          submitted_flag: string | null
          task_id: string
        }
        Insert: {
          attempted_at?: string | null
          extra?: Json
          hackathon_team_id: string
          id?: string
          is_correct?: boolean | null
          points_awarded?: number | null
          submitted_flag?: string | null
          task_id: string
        }
        Update: {
          attempted_at?: string | null
          extra?: Json
          hackathon_team_id?: string
          id?: string
          is_correct?: boolean | null
          points_awarded?: number | null
          submitted_flag?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_task_completions_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_task_submissions: {
        Row: {
          created_at: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          link_url: string | null
          mime: string | null
          phase_id: string | null
          points_awarded: number | null
          review_note: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          task_id: string
          team_id: string
          text_answer: string | null
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          link_url?: string | null
          mime?: string | null
          phase_id?: string | null
          points_awarded?: number | null
          review_note?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          task_id: string
          team_id: string
          text_answer?: string | null
          track_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          link_url?: string | null
          mime?: string | null
          phase_id?: string | null
          points_awarded?: number | null
          review_note?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          task_id?: string
          team_id?: string
          text_answer?: string | null
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_task_submissions_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "hackathon_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_task_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_task_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_task_submissions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_tasks: {
        Row: {
          category: string | null
          challenge_file_name: string | null
          challenge_file_path: string | null
          created_at: string | null
          description: string | null
          flag_hash: string | null
          hints: Json | null
          id: string
          is_random: boolean | null
          phase_id: string | null
          points: number | null
          time_limit_minutes: number | null
          title: string
          track_id: string
        }
        Insert: {
          category?: string | null
          challenge_file_name?: string | null
          challenge_file_path?: string | null
          created_at?: string | null
          description?: string | null
          flag_hash?: string | null
          hints?: Json | null
          id?: string
          is_random?: boolean | null
          phase_id?: string | null
          points?: number | null
          time_limit_minutes?: number | null
          title: string
          track_id: string
        }
        Update: {
          category?: string | null
          challenge_file_name?: string | null
          challenge_file_path?: string | null
          created_at?: string | null
          description?: string | null
          flag_hash?: string | null
          hints?: Json | null
          id?: string
          is_random?: boolean | null
          phase_id?: string | null
          points?: number | null
          time_limit_minutes?: number | null
          title?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "hackathon_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_tasks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_team_members: {
        Row: {
          email: string | null
          extra: Json | null
          hackathon_team_id: string
          id: string
          is_owner: boolean | null
          joined_at: string | null
          name: string | null
          registration_id: string | null
          skills: string[] | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          email?: string | null
          extra?: Json | null
          hackathon_team_id: string
          id?: string
          is_owner?: boolean | null
          joined_at?: string | null
          name?: string | null
          registration_id?: string | null
          skills?: string[] | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string | null
          extra?: Json | null
          hackathon_team_id?: string
          id?: string
          is_owner?: boolean | null
          joined_at?: string | null
          name?: string | null
          registration_id?: string | null
          skills?: string[] | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_team_members_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_team_members_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_team_task_starts: {
        Row: {
          id: string
          started_at: string
          task_id: string
          team_id: string
        }
        Insert: {
          id?: string
          started_at?: string
          task_id: string
          team_id: string
        }
        Update: {
          id?: string
          started_at?: string
          task_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_team_task_starts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_team_task_starts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_teams: {
        Row: {
          access_code_hash: string | null
          created_at: string | null
          eliminated_at_round: number | null
          event_id: string
          extra: Json | null
          fee_proof_path: string | null
          fee_status: string | null
          id: string
          join_code: string
          looking_for_members: boolean | null
          member_registration_ids: string[] | null
          name: string
          needed_skills: string[] | null
          round: number | null
          rules_acknowledged_at: string | null
          scores: Json | null
          status: string | null
          track_id: string
          updated_at: string | null
        }
        Insert: {
          access_code_hash?: string | null
          created_at?: string | null
          eliminated_at_round?: number | null
          event_id: string
          extra?: Json | null
          fee_proof_path?: string | null
          fee_status?: string | null
          id?: string
          join_code: string
          looking_for_members?: boolean | null
          member_registration_ids?: string[] | null
          name: string
          needed_skills?: string[] | null
          round?: number | null
          rules_acknowledged_at?: string | null
          scores?: Json | null
          status?: string | null
          track_id: string
          updated_at?: string | null
        }
        Update: {
          access_code_hash?: string | null
          created_at?: string | null
          eliminated_at_round?: number | null
          event_id?: string
          extra?: Json | null
          fee_proof_path?: string | null
          fee_status?: string | null
          id?: string
          join_code?: string
          looking_for_members?: boolean | null
          member_registration_ids?: string[] | null
          name?: string
          needed_skills?: string[] | null
          round?: number | null
          rules_acknowledged_at?: string | null
          scores?: Json | null
          status?: string | null
          track_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_teams_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_track_prizes: {
        Row: {
          amount: string | null
          description: string | null
          id: string
          order_index: number
          position_label: string
          track_id: string
        }
        Insert: {
          amount?: string | null
          description?: string | null
          id?: string
          order_index?: number
          position_label: string
          track_id: string
        }
        Update: {
          amount?: string | null
          description?: string | null
          id?: string
          order_index?: number
          position_label?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_track_prizes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_tracks: {
        Row: {
          closes_at: string | null
          created_at: string | null
          currency: string | null
          current_round: number | null
          description: string | null
          discount_expires_at: string | null
          discount_note: string | null
          discount_percent: number | null
          ended_at: string | null
          event_id: string
          extra: Json | null
          fee: number | null
          id: string
          image_url: string | null
          instructions: string | null
          instructions_file_name: string | null
          instructions_file_path: string | null
          kind: string
          max_team_size: number | null
          min_team_size: number | null
          name: string
          opens_at: string | null
          organizer_id: string | null
          policies: string | null
          prize_pool: string | null
          registration_closes_at: string | null
          roster_locks_at: string | null
          rubric: Json | null
          rules_file_name: string | null
          rules_file_path: string | null
          rules_text: string | null
          status: string
          submission_deadline_at: string | null
          updated_at: string | null
        }
        Insert: {
          closes_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_round?: number | null
          description?: string | null
          discount_expires_at?: string | null
          discount_note?: string | null
          discount_percent?: number | null
          ended_at?: string | null
          event_id: string
          extra?: Json | null
          fee?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          instructions_file_name?: string | null
          instructions_file_path?: string | null
          kind?: string
          max_team_size?: number | null
          min_team_size?: number | null
          name: string
          opens_at?: string | null
          organizer_id?: string | null
          policies?: string | null
          prize_pool?: string | null
          registration_closes_at?: string | null
          roster_locks_at?: string | null
          rubric?: Json | null
          rules_file_name?: string | null
          rules_file_path?: string | null
          rules_text?: string | null
          status?: string
          submission_deadline_at?: string | null
          updated_at?: string | null
        }
        Update: {
          closes_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_round?: number | null
          description?: string | null
          discount_expires_at?: string | null
          discount_note?: string | null
          discount_percent?: number | null
          ended_at?: string | null
          event_id?: string
          extra?: Json | null
          fee?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          instructions_file_name?: string | null
          instructions_file_path?: string | null
          kind?: string
          max_team_size?: number | null
          min_team_size?: number | null
          name?: string
          opens_at?: string | null
          organizer_id?: string | null
          policies?: string | null
          prize_pool?: string | null
          registration_closes_at?: string | null
          roster_locks_at?: string | null
          rubric?: Json | null
          rules_file_name?: string | null
          rules_file_path?: string | null
          rules_text?: string | null
          status?: string
          submission_deadline_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_tracks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_tracks_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      integration_capabilities: {
        Row: {
          capability: string
          connection_id: string
          enabled: boolean
          settings: Json
        }
        Insert: {
          capability: string
          connection_id: string
          enabled?: boolean
          settings?: Json
        }
        Update: {
          capability?: string
          connection_id?: string
          enabled?: boolean
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "integration_capabilities_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          avatar_url: string | null
          connected_at: string
          connected_by: string | null
          daily_limit: number
          display_name: string | null
          granted_scopes: string[]
          id: string
          is_workspace: boolean
          last_error: string | null
          last_error_at: string | null
          last_used_at: string | null
          owner_id: string
          owner_type: string
          per_minute_limit: number
          provider: string
          provider_account_id: string
          provider_email: string
          quota_exhausted_until: string | null
          sending_paused_reason: string | null
          sending_paused_until: string | null
          status: string
        }
        Insert: {
          avatar_url?: string | null
          connected_at?: string
          connected_by?: string | null
          daily_limit?: number
          display_name?: string | null
          granted_scopes?: string[]
          id?: string
          is_workspace?: boolean
          last_error?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          owner_id: string
          owner_type: string
          per_minute_limit?: number
          provider: string
          provider_account_id: string
          provider_email: string
          quota_exhausted_until?: string | null
          sending_paused_reason?: string | null
          sending_paused_until?: string | null
          status?: string
        }
        Update: {
          avatar_url?: string | null
          connected_at?: string
          connected_by?: string | null
          daily_limit?: number
          display_name?: string | null
          granted_scopes?: string[]
          id?: string
          is_workspace?: boolean
          last_error?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          owner_id?: string
          owner_type?: string
          per_minute_limit?: number
          provider?: string
          provider_account_id?: string
          provider_email?: string
          quota_exhausted_until?: string | null
          sending_paused_reason?: string | null
          sending_paused_until?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_secrets: {
        Row: {
          connection_id: string
          encrypted_refresh_token: string
          key_version: number
          rotated_at: string | null
        }
        Insert: {
          connection_id: string
          encrypted_refresh_token: string
          key_version?: number
          rotated_at?: string | null
        }
        Update: {
          connection_id?: string
          encrypted_refresh_token?: string
          key_version?: number
          rotated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_secrets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_versions: {
        Row: {
          body_md: string
          change_summary: string | null
          document_id: string
          effective_date: string | null
          id: string
          published_at: string
          published_by: string | null
          version: number
        }
        Insert: {
          body_md?: string
          change_summary?: string | null
          document_id: string
          effective_date?: string | null
          id?: string
          published_at?: string
          published_by?: string | null
          version: number
        }
        Update: {
          body_md?: string
          change_summary?: string | null
          document_id?: string
          effective_date?: string | null
          id?: string
          published_at?: string
          published_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_document_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          current_version_id: string | null
          id: string
          slug: string
          title: string
        }
        Insert: {
          current_version_id?: string | null
          id?: string
          slug: string
          title: string
        }
        Update: {
          current_version_id?: string | null
          id?: string
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      linked_files: {
        Row: {
          added_at: string
          added_by: string | null
          connection_id: string
          entity_id: string
          entity_type: string
          icon_url: string | null
          id: string
          last_checked_at: string | null
          mime_type: string
          owner_id: string
          owner_type: string
          provider_file_id: string
          provider_modified_at: string | null
          status: string
          title: string
          web_url: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          connection_id: string
          entity_id: string
          entity_type: string
          icon_url?: string | null
          id?: string
          last_checked_at?: string | null
          mime_type: string
          owner_id: string
          owner_type: string
          provider_file_id: string
          provider_modified_at?: string | null
          status?: string
          title: string
          web_url?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          connection_id?: string
          entity_id?: string
          entity_type?: string
          icon_url?: string | null
          id?: string
          last_checked_at?: string | null
          mime_type?: string
          owner_id?: string
          owner_type?: string
          provider_file_id?: string
          provider_modified_at?: string | null
          status?: string
          title?: string
          web_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linked_files_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_consents: {
        Row: {
          email: string
          granted_at: string
          id: string
          scope: string
          source: string | null
          unsubscribe_token_hash: string | null
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          email: string
          granted_at?: string
          id?: string
          scope: string
          source?: string | null
          unsubscribe_token_hash?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          email?: string
          granted_at?: string
          id?: string
          scope?: string
          source?: string | null
          unsubscribe_token_hash?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          created_at: string | null
          extra: Json | null
          id: string
          reason: string | null
          target_id: string
          target_label: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          extra?: Json | null
          id?: string
          reason?: string | null
          target_id: string
          target_label?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          extra?: Json | null
          id?: string
          reason?: string | null
          target_id?: string
          target_label?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      module_catalog: {
        Row: {
          category: string
          description: string
          key: string
          label: string
          sort: number
        }
        Insert: {
          category: string
          description?: string
          key: string
          label: string
          sort?: number
        }
        Update: {
          category?: string
          description?: string
          key?: string
          label?: string
          sort?: number
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          default_channels: string[] | null
          extra: Json | null
          id: string
          key: string
          subject: string | null
        }
        Insert: {
          body: string
          default_channels?: string[] | null
          extra?: Json | null
          id?: string
          key: string
          subject?: string | null
        }
        Update: {
          body?: string
          default_channels?: string[] | null
          extra?: Json | null
          id?: string
          key?: string
          subject?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action: string | null
          channel: string | null
          created_at: string | null
          deep_link: string | null
          event_id: string | null
          extra: Json | null
          id: string
          message: string
          notification_id: string | null
          priority: string | null
          read_at: string | null
          registration_id: string | null
          related_event_id: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          channel?: string | null
          created_at?: string | null
          deep_link?: string | null
          event_id?: string | null
          extra?: Json | null
          id?: string
          message: string
          notification_id?: string | null
          priority?: string | null
          read_at?: string | null
          registration_id?: string | null
          related_event_id?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          channel?: string | null
          created_at?: string | null
          deep_link?: string | null
          event_id?: string | null
          extra?: Json | null
          id?: string
          message?: string
          notification_id?: string | null
          priority?: string | null
          read_at?: string | null
          registration_id?: string | null
          related_event_id?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          capability: string
          code_verifier_enc: string
          created_at: string
          expires_at: string
          id: string
          owner_id: string
          owner_type: string
          return_to: string
          state_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          capability: string
          code_verifier_enc: string
          created_at?: string
          expires_at: string
          id?: string
          owner_id: string
          owner_type: string
          return_to: string
          state_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          capability?: string
          code_verifier_enc?: string
          created_at?: string
          expires_at?: string
          id?: string
          owner_id?: string
          owner_type?: string
          return_to?: string
          state_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_announcements: {
        Row: {
          audience: string | null
          body: string
          broadcast_to_all: boolean | null
          channels: string[]
          club_ids: string[]
          created_at: string | null
          created_by: string | null
          department_id: string | null
          id: string
          org_id: string | null
          title: string
        }
        Insert: {
          audience?: string | null
          body: string
          broadcast_to_all?: boolean | null
          channels?: string[]
          club_ids?: string[]
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          org_id?: string | null
          title: string
        }
        Update: {
          audience?: string | null
          body?: string
          broadcast_to_all?: boolean | null
          channels?: string[]
          club_ids?: string[]
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          org_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_announcements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          extra: Json | null
          id: string
          joined_at: string | null
          org_id: string
          role: string
          title: string | null
          user_id: string
        }
        Insert: {
          extra?: Json | null
          id?: string
          joined_at?: string | null
          org_id: string
          role: string
          title?: string | null
          user_id: string
        }
        Update: {
          extra?: Json | null
          id?: string
          joined_at?: string | null
          org_id?: string
          role?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_module_access: {
        Row: {
          enabled: boolean | null
          granted_by: string | null
          id: string
          module_key: string
          org_id: string
        }
        Insert: {
          enabled?: boolean | null
          granted_by?: string | null
          id?: string
          module_key: string
          org_id: string
        }
        Update: {
          enabled?: boolean | null
          granted_by?: string | null
          id?: string
          module_key?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_module_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_module_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_requests: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_url: string | null
          created_at: string | null
          details: string | null
          id: string
          org_id: string
          request_type: string
          requested_amount: number | null
          requested_by: string | null
          review_note: string | null
          reviewed_by: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_url?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          org_id: string
          request_type: string
          requested_amount?: number | null
          requested_by?: string | null
          review_note?: string | null
          reviewed_by?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_url?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          org_id?: string
          request_type?: string
          requested_amount?: number | null
          requested_by?: string | null
          review_note?: string | null
          reviewed_by?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_tenures: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          label: string
          org_id: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          label: string
          org_id: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          label?: string
          org_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_tenures_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          connections_google_disabled: boolean
          connections_google_disabled_reason: string | null
          contact_email: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          established_year: number | null
          extra: Json | null
          id: string
          institute_id: string | null
          is_demo: boolean
          is_verified: boolean | null
          logo_url: string | null
          name: string
          org_type: string
          owner_user_id: string | null
          parent_org_id: string | null
          social_links: Json | null
          updated_at: string | null
          verification_level: string | null
          website_url: string | null
        }
        Insert: {
          address?: Json | null
          connections_google_disabled?: boolean
          connections_google_disabled_reason?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          established_year?: number | null
          extra?: Json | null
          id?: string
          institute_id?: string | null
          is_demo?: boolean
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          org_type: string
          owner_user_id?: string | null
          parent_org_id?: string | null
          social_links?: Json | null
          updated_at?: string | null
          verification_level?: string | null
          website_url?: string | null
        }
        Update: {
          address?: Json | null
          connections_google_disabled?: boolean
          connections_google_disabled_reason?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          established_year?: number | null
          extra?: Json | null
          id?: string
          institute_id?: string | null
          is_demo?: boolean
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          org_type?: string
          owner_user_id?: string | null
          parent_org_id?: string | null
          social_links?: Json | null
          updated_at?: string | null
          verification_level?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_email_connections: {
        Row: {
          created_at: string
          created_by: string
          from_email: string
          from_name: string | null
          google_account_email: string | null
          id: string
          last_error: string | null
          last_tested_at: string | null
          organizer_id: string
          provider: string
          provisioned_by: string | null
          secrets_ciphertext: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          from_email: string
          from_name?: string | null
          google_account_email?: string | null
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          organizer_id: string
          provider: string
          provisioned_by?: string | null
          secrets_ciphertext?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          from_email?: string
          from_name?: string | null
          google_account_email?: string | null
          id?: string
          last_error?: string | null
          last_tested_at?: string | null
          organizer_id?: string
          provider?: string
          provisioned_by?: string | null
          secrets_ciphertext?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_email_connections_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_email_connections_provisioned_by_fkey"
            columns: ["provisioned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_profiles: {
        Row: {
          account_number: string | null
          account_title: string | null
          auto_publish_events: boolean | null
          average_rating: number | null
          bank_name: string | null
          cancelled_events: number | null
          completed_events: number | null
          default_allow_waitlist: boolean | null
          default_certificate_template_id: string | null
          default_require_approval: boolean | null
          extra: Json | null
          iban: string | null
          is_verified: boolean | null
          minimum_payout: number | null
          org_id: string | null
          org_name: string | null
          payout_schedule: string | null
          plan_auto_renew: boolean | null
          plan_expires_at: string | null
          plan_features: string[] | null
          plan_type: string | null
          published_events: number | null
          recovery_contact: string | null
          review_status: string | null
          specialties: string[] | null
          timezone: string | null
          total_attendees: number | null
          total_events_created: number | null
          total_revenue: number | null
          total_spent_on_vendors: number | null
          total_vendors_hired: number | null
          updated_at: string | null
          user_id: string
          username: string | null
          verification_level: string | null
        }
        Insert: {
          account_number?: string | null
          account_title?: string | null
          auto_publish_events?: boolean | null
          average_rating?: number | null
          bank_name?: string | null
          cancelled_events?: number | null
          completed_events?: number | null
          default_allow_waitlist?: boolean | null
          default_certificate_template_id?: string | null
          default_require_approval?: boolean | null
          extra?: Json | null
          iban?: string | null
          is_verified?: boolean | null
          minimum_payout?: number | null
          org_id?: string | null
          org_name?: string | null
          payout_schedule?: string | null
          plan_auto_renew?: boolean | null
          plan_expires_at?: string | null
          plan_features?: string[] | null
          plan_type?: string | null
          published_events?: number | null
          recovery_contact?: string | null
          review_status?: string | null
          specialties?: string[] | null
          timezone?: string | null
          total_attendees?: number | null
          total_events_created?: number | null
          total_revenue?: number | null
          total_spent_on_vendors?: number | null
          total_vendors_hired?: number | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          verification_level?: string | null
        }
        Update: {
          account_number?: string | null
          account_title?: string | null
          auto_publish_events?: boolean | null
          average_rating?: number | null
          bank_name?: string | null
          cancelled_events?: number | null
          completed_events?: number | null
          default_allow_waitlist?: boolean | null
          default_certificate_template_id?: string | null
          default_require_approval?: boolean | null
          extra?: Json | null
          iban?: string | null
          is_verified?: boolean | null
          minimum_payout?: number | null
          org_id?: string | null
          org_name?: string | null
          payout_schedule?: string | null
          plan_auto_renew?: boolean | null
          plan_expires_at?: string | null
          plan_features?: string[] | null
          plan_type?: string | null
          published_events?: number | null
          recovery_contact?: string | null
          review_status?: string | null
          specialties?: string[] | null
          timezone?: string | null
          total_attendees?: number | null
          total_events_created?: number | null
          total_revenue?: number | null
          total_spent_on_vendors?: number | null
          total_vendors_hired?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          verification_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizer_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_profiles_plan_type_fkey"
            columns: ["plan_type"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "organizer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_types: {
        Row: {
          created_at: string
          description: string
          id: string
          label: string
          organizer_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          label: string
          organizer_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          label?: string
          organizer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_types_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string | null
          currency: string | null
          exchange_rate: number | null
          extra: Json | null
          id: string
          payer_id: string | null
          payment_method_details: Json | null
          payment_method_type: string | null
          platform_fee: number | null
          purpose: string
          receiver_id: string | null
          reference_id: string | null
          reference_type: string | null
          screenshot_uploaded_at: string | null
          screenshot_url: string | null
          screenshot_verified: boolean | null
          status: string
          subtotal: number | null
          tax: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          exchange_rate?: number | null
          extra?: Json | null
          id?: string
          payer_id?: string | null
          payment_method_details?: Json | null
          payment_method_type?: string | null
          platform_fee?: number | null
          purpose: string
          receiver_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          screenshot_uploaded_at?: string | null
          screenshot_url?: string | null
          screenshot_verified?: boolean | null
          status?: string
          subtotal?: number | null
          tax?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          exchange_rate?: number | null
          extra?: Json | null
          id?: string
          payer_id?: string | null
          payment_method_details?: Json | null
          payment_method_type?: string | null
          platform_fee?: number | null
          purpose?: string
          receiver_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          screenshot_uploaded_at?: string | null
          screenshot_url?: string | null
          screenshot_verified?: boolean | null
          status?: string
          subtotal?: number | null
          tax?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          extra: Json | null
          id: string
          invited_by: string | null
          org_type: string
          parent_org_id: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          extra?: Json | null
          id?: string
          invited_by?: string | null
          org_type: string
          parent_org_id?: string | null
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          extra?: Json | null
          id?: string
          invited_by?: string | null
          org_type?: string
          parent_org_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invites_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_changes: {
        Row: {
          changed_by: string | null
          created_at: string | null
          from_plan: string | null
          id: string
          organizer_id: string | null
          reason: string | null
          to_plan: string
          vendor_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          from_plan?: string | null
          id?: string
          organizer_id?: string | null
          reason?: string | null
          to_plan: string
          vendor_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          from_plan?: string | null
          id?: string
          organizer_id?: string | null
          reason?: string | null
          to_plan?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_changes_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_changes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_email_limits: {
        Row: {
          daily_cap: number
          max_per_send: number
          monthly_cap: number
          plan_key: string
        }
        Insert: {
          daily_cap: number
          max_per_send?: number
          monthly_cap: number
          plan_key: string
        }
        Update: {
          daily_cap?: number
          max_per_send?: number
          monthly_cap?: number
          plan_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_email_limits_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: true
            referencedRelation: "subscription_plans"
            referencedColumns: ["key"]
          },
        ]
      }
      platform_alerts: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          kind: string
          read_at: string | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          read_at?: string | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          target_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_alerts_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_billing_settings: {
        Row: {
          account_number: string | null
          account_title: string | null
          bank_name: string | null
          branch: string | null
          currency: string
          easypaisa: string | null
          iban: string | null
          id: number
          instructions: string | null
          jazzcash: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_number?: string | null
          account_title?: string | null
          bank_name?: string | null
          branch?: string | null
          currency?: string
          easypaisa?: string | null
          iban?: string | null
          id?: number
          instructions?: string | null
          jazzcash?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_number?: string | null
          account_title?: string | null
          bank_name?: string | null
          branch?: string | null
          currency?: string
          easypaisa?: string | null
          iban?: string | null
          id?: number
          instructions?: string | null
          jazzcash?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_billing_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean | null
          code: string
          discount_type: string | null
          event_id: string
          expires_at: string | null
          extra: Json | null
          id: string
          per_email_limit: number | null
          track_id: string | null
          usage_count: number | null
          usage_limit: number | null
          value: number
        }
        Insert: {
          active?: boolean | null
          code: string
          discount_type?: string | null
          event_id: string
          expires_at?: string | null
          extra?: Json | null
          id?: string
          per_email_limit?: number | null
          track_id?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          value: number
        }
        Update: {
          active?: boolean | null
          code?: string
          discount_type?: string | null
          event_id?: string
          expires_at?: string | null
          extra?: Json | null
          id?: string
          per_email_limit?: number | null
          track_id?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_redemptions: {
        Row: {
          created_at: string
          discount_amount: number
          group_id: string | null
          id: string
          promo_id: string
          registration_id: string | null
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          group_id?: string | null
          id?: string
          promo_id: string
          registration_id?: string | null
        }
        Update: {
          created_at?: string
          discount_amount?: number
          group_id?: string | null
          id?: string
          promo_id?: string
          registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "registration_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_templates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_forms: {
        Row: {
          created_at: string | null
          extra: Json | null
          fields: Json
          id: string
          is_open: boolean | null
          position_id: string | null
          public_token: string
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          extra?: Json | null
          fields?: Json
          id?: string
          is_open?: boolean | null
          position_id?: string | null
          public_token: string
          team_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          extra?: Json | null
          fields?: Json
          id?: string
          is_open?: boolean | null
          position_id?: string | null
          public_token?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_forms_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "team_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruitment_forms_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_groups: {
        Row: {
          created_at: string
          event_id: string
          extra: Json
          group_name: string
          id: string
          lead_registration_id: string | null
          payment_proof_path: string | null
          payment_status: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          extra?: Json
          group_name: string
          id?: string
          lead_registration_id?: string | null
          payment_proof_path?: string | null
          payment_status?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          extra?: Json
          group_name?: string
          id?: string
          lead_registration_id?: string | null
          payment_proof_path?: string | null
          payment_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_groups_lead_registration_id_fkey"
            columns: ["lead_registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          amount_paid: number | null
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          cancelled_at: string | null
          certificate_id: string | null
          certificate_issued: boolean | null
          check_in_method: string | null
          check_in_time: string | null
          checked_in: boolean | null
          checked_in_by: string | null
          communications: Json | null
          created_at: string | null
          custom_responses: Json | null
          event_id: string
          extra: Json | null
          feedback_submitted: boolean | null
          final_price: number | null
          group_id: string | null
          hackathon_access_code_hash: string | null
          id: string
          invite_id: string | null
          organizer_id: string | null
          payment_proof_path: string | null
          payment_status: string | null
          pricing_tier: string | null
          promo_code_used: string | null
          qr_code_data: string | null
          qr_code_image_url: string | null
          rating: number | null
          registration_source: string | null
          review_id: string | null
          status: string
          status_history: Json | null
          ticket_tier_id: string | null
          tier: string | null
          updated_at: string | null
          user_id: string | null
          waitlist_position: number | null
        }
        Insert: {
          amount_paid?: number | null
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          cancelled_at?: string | null
          certificate_id?: string | null
          certificate_issued?: boolean | null
          check_in_method?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          checked_in_by?: string | null
          communications?: Json | null
          created_at?: string | null
          custom_responses?: Json | null
          event_id: string
          extra?: Json | null
          feedback_submitted?: boolean | null
          final_price?: number | null
          group_id?: string | null
          hackathon_access_code_hash?: string | null
          id?: string
          invite_id?: string | null
          organizer_id?: string | null
          payment_proof_path?: string | null
          payment_status?: string | null
          pricing_tier?: string | null
          promo_code_used?: string | null
          qr_code_data?: string | null
          qr_code_image_url?: string | null
          rating?: number | null
          registration_source?: string | null
          review_id?: string | null
          status?: string
          status_history?: Json | null
          ticket_tier_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string | null
          waitlist_position?: number | null
        }
        Update: {
          amount_paid?: number | null
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          cancelled_at?: string | null
          certificate_id?: string | null
          certificate_issued?: boolean | null
          check_in_method?: string | null
          check_in_time?: string | null
          checked_in?: boolean | null
          checked_in_by?: string | null
          communications?: Json | null
          created_at?: string | null
          custom_responses?: Json | null
          event_id?: string
          extra?: Json | null
          feedback_submitted?: boolean | null
          final_price?: number | null
          group_id?: string | null
          hackathon_access_code_hash?: string | null
          id?: string
          invite_id?: string | null
          organizer_id?: string | null
          payment_proof_path?: string | null
          payment_status?: string | null
          pricing_tier?: string | null
          promo_code_used?: string | null
          qr_code_data?: string | null
          qr_code_image_url?: string | null
          rating?: number | null
          registration_source?: string | null
          review_id?: string | null
          status?: string
          status_history?: Json | null
          ticket_tier_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string | null
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_certificate_fk"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "registration_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_invite_fk"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "event_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          attended_event: boolean | null
          booking_id: string | null
          comment: string | null
          created_at: string | null
          event_id: string | null
          extra: Json | null
          helpful_count: number | null
          helpful_user_ids: string[] | null
          id: string
          rating: number
          registration_id: string | null
          reviewer_id: string | null
          reviewer_type: string | null
          tags: string[] | null
          target_id: string
          target_type: string
          title: string | null
          updated_at: string | null
          used_service: boolean | null
          verified_purchase: boolean | null
          visibility: string | null
        }
        Insert: {
          attended_event?: boolean | null
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          event_id?: string | null
          extra?: Json | null
          helpful_count?: number | null
          helpful_user_ids?: string[] | null
          id?: string
          rating: number
          registration_id?: string | null
          reviewer_id?: string | null
          reviewer_type?: string | null
          tags?: string[] | null
          target_id: string
          target_type: string
          title?: string | null
          updated_at?: string | null
          used_service?: boolean | null
          verified_purchase?: boolean | null
          visibility?: string | null
        }
        Update: {
          attended_event?: boolean | null
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          event_id?: string | null
          extra?: Json | null
          helpful_count?: number | null
          helpful_user_ids?: string[] | null
          id?: string
          rating?: number
          registration_id?: string | null
          reviewer_id?: string | null
          reviewer_type?: string | null
          tags?: string[] | null
          target_id?: string
          target_type?: string
          title?: string | null
          updated_at?: string | null
          used_service?: boolean | null
          verified_purchase?: boolean | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sender_preferences: {
        Row: {
          connection_id: string
          event_id: string | null
          id: string
          owner_id: string
          owner_type: string
        }
        Insert: {
          connection_id: string
          event_id?: string | null
          id?: string
          owner_id: string
          owner_type: string
        }
        Update: {
          connection_id?: string
          event_id?: string | null
          id?: string
          owner_id?: string
          owner_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sender_preferences_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sender_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_syncs: {
        Row: {
          connection_id: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          keep_in_sync: boolean
          kind: string
          last_error: string | null
          last_synced_at: string | null
          linked_file_id: string | null
          row_fingerprint: string | null
          sheet_title: string
          spreadsheet_id: string
          status: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          keep_in_sync?: boolean
          kind: string
          last_error?: string | null
          last_synced_at?: string | null
          linked_file_id?: string | null
          row_fingerprint?: string | null
          sheet_title?: string
          spreadsheet_id: string
          status?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          keep_in_sync?: boolean
          kind?: string
          last_error?: string | null
          last_synced_at?: string | null
          linked_file_id?: string | null
          row_fingerprint?: string | null
          sheet_title?: string
          spreadsheet_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_syncs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_syncs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_syncs_linked_file_id_fkey"
            columns: ["linked_file_id"]
            isOneToOne: false
            referencedRelation: "linked_files"
            referencedColumns: ["id"]
          },
        ]
      }
      site_blocks: {
        Row: {
          draft: Json
          id: string
          page_id: string
          published: Json | null
          sort: number
          type: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          draft?: Json
          id?: string
          page_id: string
          published?: Json | null
          sort?: number
          type: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          draft?: Json
          id?: string
          page_id?: string
          published?: Json | null
          sort?: number
          type?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "site_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      site_faqs: {
        Row: {
          answer_md: string
          id: string
          question: string
          scope: string
          sort: number
          visible: boolean
        }
        Insert: {
          answer_md?: string
          id?: string
          question: string
          scope?: string
          sort?: number
          visible?: boolean
        }
        Update: {
          answer_md?: string
          id?: string
          question?: string
          scope?: string
          sort?: number
          visible?: boolean
        }
        Relationships: []
      }
      site_media: {
        Row: {
          alt: string
          created_at: string
          height: number | null
          id: string
          mime: string | null
          path: string
          size: number | null
          tags: string[]
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt?: string
          created_at?: string
          height?: number | null
          id?: string
          mime?: string | null
          path: string
          size?: number | null
          tags?: string[]
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt?: string
          created_at?: string
          height?: number | null
          id?: string
          mime?: string | null
          path?: string
          size?: number | null
          tags?: string[]
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          id: string
          published_at: string | null
          seo: Json
          slug: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          published_at?: string | null
          seo?: Json
          slug: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          published_at?: string | null
          seo?: Json
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_partners: {
        Row: {
          category: string | null
          consent_at: string | null
          consent_source: string | null
          consent_status: string
          description: string | null
          featured: boolean
          id: string
          logo_media_id: string | null
          name: string
          organizer_id: string | null
          sort: number
          url: string | null
          visible: boolean
        }
        Insert: {
          category?: string | null
          consent_at?: string | null
          consent_source?: string | null
          consent_status?: string
          description?: string | null
          featured?: boolean
          id?: string
          logo_media_id?: string | null
          name: string
          organizer_id?: string | null
          sort?: number
          url?: string | null
          visible?: boolean
        }
        Update: {
          category?: string | null
          consent_at?: string | null
          consent_source?: string | null
          consent_status?: string
          description?: string | null
          featured?: boolean
          id?: string
          logo_media_id?: string | null
          name?: string
          organizer_id?: string | null
          sort?: number
          url?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "site_partners_logo_media_id_fkey"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "site_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_partners_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_revisions: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          snapshot?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_stats_settings: {
        Row: {
          format: string
          key: string
          label: string
          min_threshold: number
          visible: boolean
        }
        Insert: {
          format?: string
          key: string
          label: string
          min_threshold?: number
          visible?: boolean
        }
        Update: {
          format?: string
          key?: string
          label?: string
          min_threshold?: number
          visible?: boolean
        }
        Relationships: []
      }
      site_testimonials: {
        Row: {
          avatar_media_id: string | null
          consent_confirmed: boolean
          id: string
          name: string
          organization: string | null
          quote: string
          role: string | null
          sort: number
          visible: boolean
        }
        Insert: {
          avatar_media_id?: string | null
          consent_confirmed?: boolean
          id?: string
          name: string
          organization?: string | null
          quote: string
          role?: string | null
          sort?: number
          visible?: boolean
        }
        Update: {
          avatar_media_id?: string | null
          consent_confirmed?: boolean
          id?: string
          name?: string
          organization?: string | null
          quote?: string
          role?: string | null
          sort?: number
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "site_testimonials_avatar_media_id_fkey"
            columns: ["avatar_media_id"]
            isOneToOne: false
            referencedRelation: "site_media"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          audience: string
          badge_text: string | null
          billing_note: string | null
          created_at: string | null
          cta_href: string | null
          cta_label: string | null
          currency: string
          description: string | null
          email_daily_cap: number | null
          email_monthly_cap: number | null
          highlight_features: string[]
          id: string
          included_modules: string[] | null
          is_active: boolean
          is_public: boolean
          is_recommended: boolean
          key: string
          name: string
          price_monthly: number | null
          price_yearly: number | null
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          audience?: string
          badge_text?: string | null
          billing_note?: string | null
          created_at?: string | null
          cta_href?: string | null
          cta_label?: string | null
          currency?: string
          description?: string | null
          email_daily_cap?: number | null
          email_monthly_cap?: number | null
          highlight_features?: string[]
          id?: string
          included_modules?: string[] | null
          is_active?: boolean
          is_public?: boolean
          is_recommended?: boolean
          key: string
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string
          badge_text?: string | null
          billing_note?: string | null
          created_at?: string | null
          cta_href?: string | null
          cta_label?: string | null
          currency?: string
          description?: string | null
          email_daily_cap?: number | null
          email_monthly_cap?: number | null
          highlight_features?: string[]
          id?: string
          included_modules?: string[] | null
          is_active?: boolean
          is_public?: boolean
          is_recommended?: boolean
          key?: string
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_ticket_attachments: {
        Row: {
          bytes: number
          created_at: string
          filename: string
          id: string
          message_id: string
          mime: string
          storage_path: string
        }
        Insert: {
          bytes?: number
          created_at?: string
          filename?: string
          id?: string
          message_id: string
          mime?: string
          storage_path: string
        }
        Update: {
          bytes?: number
          created_at?: string
          filename?: string
          id?: string
          message_id?: string
          mime?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_note: string | null
          body: string
          created_at: string | null
          extra: Json | null
          from_email: string | null
          from_role: string | null
          from_user_id: string | null
          id: string
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          admin_note?: string | null
          body: string
          created_at?: string | null
          extra?: Json | null
          from_email?: string | null
          from_role?: string | null
          from_user_id?: string | null
          id?: string
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          admin_note?: string | null
          body?: string
          created_at?: string | null
          extra?: Json | null
          from_email?: string | null
          from_role?: string | null
          from_user_id?: string | null
          id?: string
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_activity_pings: {
        Row: {
          created_at: string
          event_id: string
          id: string
          registration_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          registration_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          registration_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_activity_pings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_activity_pings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_integrity_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          flagged: boolean
          id: string
          registration_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          flagged?: boolean
          id?: string
          registration_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          flagged?: boolean
          id?: string
          registration_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_integrity_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_integrity_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          display_name: string | null
          email: string | null
          extra: Json | null
          id: string
          joined_at: string | null
          phone: string | null
          position_id: string | null
          role: string | null
          source: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          display_name?: string | null
          email?: string | null
          extra?: Json | null
          id?: string
          joined_at?: string | null
          phone?: string | null
          position_id?: string | null
          role?: string | null
          source?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          display_name?: string | null
          email?: string | null
          extra?: Json | null
          id?: string
          joined_at?: string | null
          phone?: string | null
          position_id?: string | null
          role?: string | null
          source?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "team_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_positions: {
        Row: {
          extra: Json | null
          id: string
          permissions: string[] | null
          team_id: string
          title: string
        }
        Insert: {
          extra?: Json | null
          id?: string
          permissions?: string[] | null
          team_id: string
          title: string
        }
        Update: {
          extra?: Json | null
          id?: string
          permissions?: string[] | null
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_positions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          context_type: string
          created_at: string | null
          created_by: string | null
          event_id: string | null
          extra: Json | null
          id: string
          join_code: string | null
          name: string
          org_id: string | null
          organizer_id: string | null
          tenure_id: string | null
        }
        Insert: {
          context_type: string
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          extra?: Json | null
          id?: string
          join_code?: string | null
          name: string
          org_id?: string | null
          organizer_id?: string | null
          tenure_id?: string | null
        }
        Update: {
          context_type?: string
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          extra?: Json | null
          id?: string
          join_code?: string | null
          name?: string
          org_id?: string | null
          organizer_id?: string | null
          tenure_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tenure_id_fkey"
            columns: ["tenure_id"]
            isOneToOne: false
            referencedRelation: "org_tenures"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          active: boolean
          available_until: string | null
          created_at: string | null
          description: string | null
          event_id: string
          extra: Json | null
          group_discount_enabled: boolean | null
          group_discount_pct: number | null
          group_min_size: number | null
          id: string
          is_early_bird: boolean | null
          name: string
          price: number | null
          seats_available: number | null
          seats_sold: number | null
          student_discount_enabled: boolean | null
          student_discount_pct: number | null
        }
        Insert: {
          active?: boolean
          available_until?: string | null
          created_at?: string | null
          description?: string | null
          event_id: string
          extra?: Json | null
          group_discount_enabled?: boolean | null
          group_discount_pct?: number | null
          group_min_size?: number | null
          id?: string
          is_early_bird?: boolean | null
          name: string
          price?: number | null
          seats_available?: number | null
          seats_sold?: number | null
          student_discount_enabled?: boolean | null
          student_discount_pct?: number | null
        }
        Update: {
          active?: boolean
          available_until?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string
          extra?: Json | null
          group_discount_enabled?: boolean | null
          group_discount_pct?: number | null
          group_min_size?: number | null
          id?: string
          is_early_bird?: boolean | null
          name?: string
          price?: number | null
          seats_available?: number | null
          seats_sold?: number | null
          student_discount_enabled?: boolean | null
          student_discount_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_tier_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_tier_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_tier_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_tier_id_fkey"
            columns: ["badge_tier_id"]
            isOneToOne: false
            referencedRelation: "badge_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          accepted_at: string
          context: string | null
          document_slug: string
          email_hash: string
          id: string
          ip_hash: string | null
          user_id: string | null
          version: number
        }
        Insert: {
          accepted_at?: string
          context?: string | null
          document_slug: string
          email_hash: string
          id?: string
          ip_hash?: string | null
          user_id?: string | null
          version: number
        }
        Update: {
          accepted_at?: string
          context?: string | null
          document_slug?: string
          email_hash?: string
          id?: string
          ip_hash?: string | null
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_status: string
          admin_permissions: string[] | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          email_notifications: boolean | null
          email_verified: boolean | null
          email_verified_at: string | null
          extra: Json | null
          failed_login_attempts: number | null
          full_name: string | null
          gender: string | null
          id: string
          is_owner: boolean | null
          language: string | null
          last_active_at: string | null
          last_login_at: string | null
          login_count: number | null
          mfa_enabled: boolean | null
          must_reset_password: boolean | null
          onboarding_status: string
          pending_plan_key: string | null
          phone_number: string | null
          phone_verified: boolean | null
          push_notifications: boolean | null
          setup_complete: boolean | null
          tenant_provisioned: boolean
          theme: string | null
          updated_at: string | null
          user_type: string
          welcome_email_sent_at: string | null
        }
        Insert: {
          account_status?: string
          admin_permissions?: string[] | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          email_notifications?: boolean | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          extra?: Json | null
          failed_login_attempts?: number | null
          full_name?: string | null
          gender?: string | null
          id: string
          is_owner?: boolean | null
          language?: string | null
          last_active_at?: string | null
          last_login_at?: string | null
          login_count?: number | null
          mfa_enabled?: boolean | null
          must_reset_password?: boolean | null
          onboarding_status?: string
          pending_plan_key?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          push_notifications?: boolean | null
          setup_complete?: boolean | null
          tenant_provisioned?: boolean
          theme?: string | null
          updated_at?: string | null
          user_type: string
          welcome_email_sent_at?: string | null
        }
        Update: {
          account_status?: string
          admin_permissions?: string[] | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          email_notifications?: boolean | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          extra?: Json | null
          failed_login_attempts?: number | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_owner?: boolean | null
          language?: string | null
          last_active_at?: string | null
          last_login_at?: string | null
          login_count?: number | null
          mfa_enabled?: boolean | null
          must_reset_password?: boolean | null
          onboarding_status?: string
          pending_plan_key?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          push_notifications?: boolean | null
          setup_complete?: boolean | null
          tenant_provisioned?: boolean
          theme?: string | null
          updated_at?: string | null
          user_type?: string
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      vendor_profiles: {
        Row: {
          auto_accept_quotes: boolean | null
          average_rating: number | null
          avg_response_time: string | null
          business_email: string | null
          business_name: string
          cancellation_rate: number | null
          commission_rate: number | null
          completed_bookings: number | null
          cover_image_url: string | null
          extra: Json | null
          featured: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          org_id: string | null
          plan_type: string
          portfolio: Json | null
          repeat_clients: number | null
          service_categories: string[] | null
          status: string | null
          total_bookings: number | null
          total_revenue: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          auto_accept_quotes?: boolean | null
          average_rating?: number | null
          avg_response_time?: string | null
          business_email?: string | null
          business_name: string
          cancellation_rate?: number | null
          commission_rate?: number | null
          completed_bookings?: number | null
          cover_image_url?: string | null
          extra?: Json | null
          featured?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          org_id?: string | null
          plan_type?: string
          portfolio?: Json | null
          repeat_clients?: number | null
          service_categories?: string[] | null
          status?: string | null
          total_bookings?: number | null
          total_revenue?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          auto_accept_quotes?: boolean | null
          average_rating?: number | null
          avg_response_time?: string | null
          business_email?: string | null
          business_name?: string
          cancellation_rate?: number | null
          commission_rate?: number | null
          completed_bookings?: number | null
          cover_image_url?: string | null
          extra?: Json | null
          featured?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          org_id?: string | null
          plan_type?: string
          portfolio?: Json | null
          repeat_clients?: number | null
          service_categories?: string[] | null
          status?: string | null
          total_bookings?: number | null
          total_revenue?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_profiles_plan_type_fkey"
            columns: ["plan_type"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "vendor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          extra: Json | null
          id: string
          images: string[] | null
          inclusions: string[] | null
          min_order: number | null
          name: string
          price: number | null
          pricing_packages: Json | null
          vendor_id: string
          videos: string[] | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          extra?: Json | null
          id?: string
          images?: string[] | null
          inclusions?: string[] | null
          min_order?: number | null
          name: string
          price?: number | null
          pricing_packages?: Json | null
          vendor_id: string
          videos?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          extra?: Json | null
          id?: string
          images?: string[] | null
          inclusions?: string[] | null
          min_order?: number | null
          name?: string
          price?: number | null
          pricing_packages?: Json | null
          vendor_id?: string
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_event_registration_counts: {
        Row: {
          awaiting_payment_count: number | null
          confirmed_count: number | null
          event_id: string | null
          last_registration_at: string | null
          total_registrations: number | null
          waitlisted_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_purge_event: { Args: { target: string }; Returns: undefined }
      admin_purge_org: { Args: { target: string }; Returns: undefined }
      admin_purge_user: { Args: { target: string }; Returns: undefined }
      event_expense_totals: {
        Args: { p_event_id: string }
        Returns: {
          budget: number
          category: string
          category_spent: number
          remaining: number
          spent: number
        }[]
      }
      get_marketing_insights: { Args: never; Returns: Json }
      get_public_stats: {
        Args: never
        Returns: {
          active_organizers_count: number
          certificates_count: number
          events_count: number
          institutions_count: number
          registrations_count: number
        }[]
      }
      is_platform_admin: { Args: never; Returns: boolean }
      organizer_teams_stats: {
        Args: { p_organizer_id: string }
        Returns: {
          in_interview: number
          leads_with_access: number
          members_count: number
          new_applicants_7d: number
          open_forms: number
          pending_invites: number
          teams_count: number
        }[]
      }
      redeem_promo: {
        Args: {
          p_email: string
          p_event_id: string
          p_group_id: string
          p_list_price: number
          p_promo_id: string
          p_registration_id: string
          p_track_id: string
        }
        Returns: {
          discount_amount: number
          original_amount: number
          promo_code: string
          total_amount: number
        }[]
      }
      reset_wipe_all_public_data: { Args: never; Returns: undefined }
      start_org_tenure: {
        Args: {
          p_club_id: string
          p_copy_roster?: boolean
          p_end: string
          p_label: string
          p_start: string
        }
        Returns: string
      }
      user_is_event_staff: { Args: { p_event_id: string }; Returns: boolean }
      user_org_ids: { Args: never; Returns: string[] }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

/** App alias for `public.users` row (kept across `types:db` regenerations). */
export type UserRow = Database["public"]["Tables"]["users"]["Row"]

