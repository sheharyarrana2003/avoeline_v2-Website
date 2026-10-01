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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applicants: {
        Row: {
          applied_at: string | null
          extra: Json | null
          form_id: string
          id: string
          interview_at: string | null
          interview_notes: string | null
          responses: Json | null
          status: string | null
          team_id: string
        }
        Insert: {
          applied_at?: string | null
          extra?: Json | null
          form_id: string
          id?: string
          interview_at?: string | null
          interview_notes?: string | null
          responses?: Json | null
          status?: string | null
          team_id: string
        }
        Update: {
          applied_at?: string | null
          extra?: Json | null
          form_id?: string
          id?: string
          interview_at?: string | null
          interview_notes?: string | null
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
      certificate_templates: {
        Row: {
          blockchain_enabled: boolean | null
          blockchain_network: string | null
          border_color: string | null
          border_size: number | null
          border_style: string | null
          canvas: Json | null
          created_at: string | null
          event_id: string | null
          extra: Json | null
          id: string
          layout_fields: Json
          logo_url: string | null
          organizer_id: string
          primary_color: string | null
          secondary_color: string | null
          signature_url: string | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          blockchain_enabled?: boolean | null
          blockchain_network?: string | null
          border_color?: string | null
          border_size?: number | null
          border_style?: string | null
          canvas?: Json | null
          created_at?: string | null
          event_id?: string | null
          extra?: Json | null
          id?: string
          layout_fields?: Json
          logo_url?: string | null
          organizer_id: string
          primary_color?: string | null
          secondary_color?: string | null
          signature_url?: string | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          blockchain_enabled?: boolean | null
          blockchain_network?: string | null
          border_color?: string | null
          border_size?: number | null
          border_style?: string | null
          canvas?: Json | null
          created_at?: string | null
          event_id?: string | null
          extra?: Json | null
          id?: string
          layout_fields?: Json
          logo_url?: string | null
          organizer_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          signature_url?: string | null
          template_name?: string
          updated_at?: string | null
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
          blockchain_contract_address: string | null
          blockchain_ipfs_hash: string | null
          blockchain_minted: boolean | null
          blockchain_network: string | null
          blockchain_token_id: string | null
          blockchain_tx_hash: string | null
          certificate_number: string
          completion_date: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          duration: string | null
          event_id: string
          event_title: string | null
          extra: Json | null
          id: string
          is_verified: boolean | null
          issuer_designation: string | null
          issuer_name: string | null
          last_downloaded_at: string | null
          organizer_id: string
          pdf_url: string | null
          recipient_name: string
          registration_id: string | null
          share_count: number | null
          status: string | null
          template_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          verification_code: string
          verification_count: number | null
        }
        Insert: {
          blockchain_contract_address?: string | null
          blockchain_ipfs_hash?: string | null
          blockchain_minted?: boolean | null
          blockchain_network?: string | null
          blockchain_token_id?: string | null
          blockchain_tx_hash?: string | null
          certificate_number: string
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          duration?: string | null
          event_id: string
          event_title?: string | null
          extra?: Json | null
          id?: string
          is_verified?: boolean | null
          issuer_designation?: string | null
          issuer_name?: string | null
          last_downloaded_at?: string | null
          organizer_id: string
          pdf_url?: string | null
          recipient_name: string
          registration_id?: string | null
          share_count?: number | null
          status?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_code: string
          verification_count?: number | null
        }
        Update: {
          blockchain_contract_address?: string | null
          blockchain_ipfs_hash?: string | null
          blockchain_minted?: boolean | null
          blockchain_network?: string | null
          blockchain_token_id?: string | null
          blockchain_tx_hash?: string | null
          certificate_number?: string
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          duration?: string | null
          event_id?: string
          event_title?: string | null
          extra?: Json | null
          id?: string
          is_verified?: boolean | null
          issuer_designation?: string | null
          issuer_name?: string | null
          last_downloaded_at?: string | null
          organizer_id?: string
          pdf_url?: string | null
          recipient_name?: string
          registration_id?: string | null
          share_count?: number | null
          status?: string | null
          template_id?: string | null
          title?: string | null
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
          created_at: string | null
          decided_at: string | null
          event_id: string
          event_title: string | null
          extra: Json | null
          id: string
          reason: string
          reporter_email: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          decided_at?: string | null
          event_id: string
          event_title?: string | null
          extra?: Json | null
          id?: string
          reason: string
          reporter_email?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          decided_at?: string | null
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
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_value: number | null
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
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_value?: number | null
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
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_value?: number | null
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
      events: {
        Row: {
          access_code: string | null
          address: string | null
          archived_at: string | null
          available_seats: number | null
          banner_image: string | null
          category: string | null
          certificate_template_id: string | null
          certificate_type: string | null
          check_ins_count: number | null
          city: string | null
          completion_rate: number | null
          coordinates: Json | null
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
          id: string
          is_free: boolean | null
          is_recurring: boolean | null
          issue_certificates: boolean | null
          language: string | null
          max_registrations_per_user: number | null
          meeting_id: string | null
          meeting_link: string | null
          meeting_password: string | null
          meeting_platform: string | null
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
          reserved_seats: number | null
          revenue: number | null
          short_description: string | null
          sponsor_tiers: string[] | null
          start_date: string | null
          start_time: string | null
          status: string
          super_category_id: string | null
          timezone: string | null
          title: string
          total_seats: number | null
          updated_at: string | null
          venue_name: string | null
          views: number | null
          visibility: string
          waitlist_capacity: number | null
          waitlist_enabled: boolean | null
        }
        Insert: {
          access_code?: string | null
          address?: string | null
          archived_at?: string | null
          available_seats?: number | null
          banner_image?: string | null
          category?: string | null
          certificate_template_id?: string | null
          certificate_type?: string | null
          check_ins_count?: number | null
          city?: string | null
          completion_rate?: number | null
          coordinates?: Json | null
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
          id?: string
          is_free?: boolean | null
          is_recurring?: boolean | null
          issue_certificates?: boolean | null
          language?: string | null
          max_registrations_per_user?: number | null
          meeting_id?: string | null
          meeting_link?: string | null
          meeting_password?: string | null
          meeting_platform?: string | null
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
          reserved_seats?: number | null
          revenue?: number | null
          short_description?: string | null
          sponsor_tiers?: string[] | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          super_category_id?: string | null
          timezone?: string | null
          title: string
          total_seats?: number | null
          updated_at?: string | null
          venue_name?: string | null
          views?: number | null
          visibility?: string
          waitlist_capacity?: number | null
          waitlist_enabled?: boolean | null
        }
        Update: {
          access_code?: string | null
          address?: string | null
          archived_at?: string | null
          available_seats?: number | null
          banner_image?: string | null
          category?: string | null
          certificate_template_id?: string | null
          certificate_type?: string | null
          check_ins_count?: number | null
          city?: string | null
          completion_rate?: number | null
          coordinates?: Json | null
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
          id?: string
          is_free?: boolean | null
          is_recurring?: boolean | null
          issue_certificates?: boolean | null
          language?: string | null
          max_registrations_per_user?: number | null
          meeting_id?: string | null
          meeting_link?: string | null
          meeting_password?: string | null
          meeting_platform?: string | null
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
          reserved_seats?: number | null
          revenue?: number | null
          short_description?: string | null
          sponsor_tiers?: string[] | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          super_category_id?: string | null
          timezone?: string | null
          title?: string
          total_seats?: number | null
          updated_at?: string | null
          venue_name?: string | null
          views?: number | null
          visibility?: string
          waitlist_capacity?: number | null
          waitlist_enabled?: boolean | null
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
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          event_id: string
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          event_id?: string
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
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
      hackathon_mentor_slots: {
        Row: {
          booked_at: string | null
          booked_by_team_id: string | null
          booked_team_name: string | null
          end_time: string
          extra: Json | null
          id: string
          mentor_id: string
          slot_date: string
          start_time: string
        }
        Insert: {
          booked_at?: string | null
          booked_by_team_id?: string | null
          booked_team_name?: string | null
          end_time: string
          extra?: Json | null
          id?: string
          mentor_id: string
          slot_date: string
          start_time: string
        }
        Update: {
          booked_at?: string | null
          booked_by_team_id?: string | null
          booked_team_name?: string | null
          end_time?: string
          extra?: Json | null
          id?: string
          mentor_id?: string
          slot_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_mentor_slots_booked_by_team_id_fkey"
            columns: ["booked_by_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_mentor_slots_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "hackathon_mentors"
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
          ends_at: string | null
          event_id: string
          extra: Json | null
          id: string
          name: string
          sort_order: number | null
          starts_at: string | null
        }
        Insert: {
          ends_at?: string | null
          event_id: string
          extra?: Json | null
          id?: string
          name: string
          sort_order?: number | null
          starts_at?: string | null
        }
        Update: {
          ends_at?: string | null
          event_id?: string
          extra?: Json | null
          id?: string
          name?: string
          sort_order?: number | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_phases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_sandboxes: {
        Row: {
          challenge_id: string | null
          created_at: string | null
          docker_image: string | null
          extra: Json | null
          hackathon_team_id: string | null
          id: string
          instance_url: string | null
          status: string | null
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string | null
          docker_image?: string | null
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
          instance_url?: string | null
          status?: string | null
        }
        Update: {
          challenge_id?: string | null
          created_at?: string | null
          docker_image?: string | null
          extra?: Json | null
          hackathon_team_id?: string | null
          id?: string
          instance_url?: string | null
          status?: string | null
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
          online_mode: boolean | null
          updated_at: string | null
        }
        Insert: {
          event_id: string
          extra?: Json | null
          livestream_url?: string | null
          online_mode?: boolean | null
          updated_at?: string | null
        }
        Update: {
          event_id?: string
          extra?: Json | null
          livestream_url?: string | null
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
      hackathon_team_phases: {
        Row: {
          completed_at: string | null
          extra: Json | null
          hackathon_team_id: string
          id: string
          phase_id: string
          unlocked: boolean | null
        }
        Insert: {
          completed_at?: string | null
          extra?: Json | null
          hackathon_team_id: string
          id?: string
          phase_id: string
          unlocked?: boolean | null
        }
        Update: {
          completed_at?: string | null
          extra?: Json | null
          hackathon_team_id?: string
          id?: string
          phase_id?: string
          unlocked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_team_phases_hackathon_team_id_fkey"
            columns: ["hackathon_team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_team_phases_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "hackathon_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_teams: {
        Row: {
          created_at: string | null
          eliminated_at_round: number | null
          event_id: string
          extra: Json | null
          fee_proof_path: string | null
          fee_status: string | null
          id: string
          join_code: string
          looking_for_members: boolean | null
          name: string
          needed_skills: string[] | null
          round: number | null
          scores: Json | null
          status: string | null
          track_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          eliminated_at_round?: number | null
          event_id: string
          extra?: Json | null
          fee_proof_path?: string | null
          fee_status?: string | null
          id?: string
          join_code: string
          looking_for_members?: boolean | null
          name: string
          needed_skills?: string[] | null
          round?: number | null
          scores?: Json | null
          status?: string | null
          track_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          eliminated_at_round?: number | null
          event_id?: string
          extra?: Json | null
          fee_proof_path?: string | null
          fee_status?: string | null
          id?: string
          join_code?: string
          looking_for_members?: boolean | null
          name?: string
          needed_skills?: string[] | null
          round?: number | null
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
      hackathon_tracks: {
        Row: {
          created_at: string | null
          currency: string | null
          current_round: number | null
          description: string | null
          event_id: string
          extra: Json | null
          fee: number | null
          id: string
          max_team_size: number | null
          min_team_size: number | null
          name: string
          organizer_id: string | null
          prize_pool: string | null
          roster_lock_date: string | null
          rubric: Json | null
          rules_file_name: string | null
          rules_file_path: string | null
          submission_deadline: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          current_round?: number | null
          description?: string | null
          event_id: string
          extra?: Json | null
          fee?: number | null
          id?: string
          max_team_size?: number | null
          min_team_size?: number | null
          name: string
          organizer_id?: string | null
          prize_pool?: string | null
          roster_lock_date?: string | null
          rubric?: Json | null
          rules_file_name?: string | null
          rules_file_path?: string | null
          submission_deadline?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          current_round?: number | null
          description?: string | null
          event_id?: string
          extra?: Json | null
          fee?: number | null
          id?: string
          max_team_size?: number | null
          min_team_size?: number | null
          name?: string
          organizer_id?: string | null
          prize_pool?: string | null
          roster_lock_date?: string | null
          rubric?: Json | null
          rules_file_name?: string | null
          rules_file_path?: string | null
          submission_deadline?: string | null
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
      organizations: {
        Row: {
          address: Json | null
          contact_email: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          established_year: number | null
          extra: Json | null
          id: string
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
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          established_year?: number | null
          extra?: Json | null
          id?: string
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
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          established_year?: number | null
          extra?: Json | null
          id?: string
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
            foreignKeyName: "organizer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      promo_codes: {
        Row: {
          active: boolean | null
          code: string
          discount_type: string | null
          event_id: string
          expires_at: string | null
          extra: Json | null
          id: string
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
        ]
      }
      recruitment_forms: {
        Row: {
          created_at: string | null
          extra: Json | null
          fields: Json
          id: string
          is_open: boolean | null
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          extra?: Json | null
          fields?: Json
          id?: string
          is_open?: boolean | null
          team_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          extra?: Json | null
          fields?: Json
          id?: string
          is_open?: boolean | null
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_forms_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          comment: string | null
          created_at: string | null
          extra: Json | null
          helpful_count: number | null
          helpful_user_ids: string[] | null
          id: string
          rating: number
          reviewer_id: string
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
          comment?: string | null
          created_at?: string | null
          extra?: Json | null
          helpful_count?: number | null
          helpful_user_ids?: string[] | null
          id?: string
          rating: number
          reviewer_id: string
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
          comment?: string | null
          created_at?: string | null
          extra?: Json | null
          helpful_count?: number | null
          helpful_user_ids?: string[] | null
          id?: string
          rating?: number
          reviewer_id?: string
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
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_participants: {
        Row: {
          created_at: string | null
          event_id: string
          extra: Json | null
          id: string
          skills: string[] | null
          status: string | null
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          extra?: Json | null
          id?: string
          skills?: string[] | null
          status?: string | null
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          extra?: Json | null
          id?: string
          skills?: string[] | null
          status?: string | null
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_participants_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "hackathon_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      team_members: {
        Row: {
          extra: Json | null
          id: string
          joined_at: string | null
          position_id: string | null
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          extra?: Json | null
          id?: string
          joined_at?: string | null
          position_id?: string | null
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          extra?: Json | null
          id?: string
          joined_at?: string | null
          position_id?: string | null
          role?: string | null
          team_id?: string
          user_id?: string
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
        ]
      }
      ticket_tiers: {
        Row: {
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
          phone_number: string | null
          phone_verified: boolean | null
          push_notifications: boolean | null
          setup_complete: boolean | null
          theme: string | null
          updated_at: string | null
          user_type: string
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
          phone_number?: string | null
          phone_verified?: boolean | null
          push_notifications?: boolean | null
          setup_complete?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_type: string
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
          phone_number?: string | null
          phone_verified?: boolean | null
          push_notifications?: boolean | null
          setup_complete?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_type?: string
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
      [_ in never]: never
    }
    Functions: {
      is_platform_admin: { Args: never; Returns: boolean }
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

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
