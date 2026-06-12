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
      announcement_comments: {
        Row: {
          announcement_id: string
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          announcement_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          announcement_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          archived: boolean
          author_id: string | null
          body: string
          category: Database["public"]["Enums"]["announcement_category"]
          created_at: string
          id: string
          published_at: string
          title: string
        }
        Insert: {
          archived?: boolean
          author_id?: string | null
          body: string
          category?: Database["public"]["Enums"]["announcement_category"]
          created_at?: string
          id?: string
          published_at?: string
          title: string
        }
        Update: {
          archived?: boolean
          author_id?: string | null
          body?: string
          category?: Database["public"]["Enums"]["announcement_category"]
          created_at?: string
          id?: string
          published_at?: string
          title?: string
        }
        Relationships: []
      }
      dispatcher_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          meta: Json
          target_id: string | null
          target_kind: string | null
          target_label: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_kind?: string | null
          target_label?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_kind?: string | null
          target_label?: string | null
        }
        Relationships: []
      }
      driver_availability: {
        Row: {
          created_at: string
          day: string
          id: string
          note: string | null
          type: Database["public"]["Enums"]["availability_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          note?: string | null
          type: Database["public"]["Enums"]["availability_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          note?: string | null
          type?: Database["public"]["Enums"]["availability_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_live: {
        Row: {
          created_at: string
          duty_number: string | null
          live_status: string | null
          live_status_note: string | null
          live_status_updated_at: string | null
          pis_current_stop: string | null
          pis_delay_sec: number | null
          pis_headsign: string | null
          pis_next_stop: string | null
          pis_route: string | null
          pis_updated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duty_number?: string | null
          live_status?: string | null
          live_status_note?: string | null
          live_status_updated_at?: string | null
          pis_current_stop?: string | null
          pis_delay_sec?: number | null
          pis_headsign?: string | null
          pis_next_stop?: string | null
          pis_route?: string | null
          pis_updated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duty_number?: string | null
          live_status?: string | null
          live_status_note?: string | null
          live_status_updated_at?: string | null
          pis_current_stop?: string | null
          pis_delay_sec?: number | null
          pis_headsign?: string | null
          pis_next_stop?: string | null
          pis_route?: string | null
          pis_updated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_positions: {
        Row: {
          heading: number | null
          speed_kmh: number | null
          updated_at: string
          user_id: string
          x: number
          y: number
          z: number | null
        }
        Insert: {
          heading?: number | null
          speed_kmh?: number | null
          updated_at?: string
          user_id: string
          x: number
          y: number
          z?: number | null
        }
        Update: {
          heading?: number | null
          speed_kmh?: number | null
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
          z?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_presence: {
        Row: {
          note: string | null
          status: Database["public"]["Enums"]["driver_presence_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          note?: string | null
          status?: Database["public"]["Enums"]["driver_presence_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          note?: string | null
          status?: Database["public"]["Enums"]["driver_presence_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_reports: {
        Row: {
          archived: boolean
          assigned_dispatcher_id: string | null
          attachments: Json
          category: Database["public"]["Enums"]["report_category"]
          created_at: string
          description: string
          driver_id: string
          duty_id: string | null
          duty_number: string | null
          id: string
          report_code: string | null
          route: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
          vehicle_id: string | null
          vehicle_label: string | null
        }
        Insert: {
          archived?: boolean
          assigned_dispatcher_id?: string | null
          attachments?: Json
          category: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description: string
          driver_id: string
          duty_id?: string | null
          duty_number?: string | null
          id?: string
          report_code?: string | null
          route?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          vehicle_id?: string | null
          vehicle_label?: string | null
        }
        Update: {
          archived?: boolean
          assigned_dispatcher_id?: string | null
          attachments?: Json
          category?: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string
          driver_id?: string
          duty_id?: string | null
          duty_number?: string | null
          id?: string
          report_code?: string | null
          route?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          vehicle_id?: string | null
          vehicle_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_reports_duty_id_fkey"
            columns: ["duty_id"]
            isOneToOne: false
            referencedRelation: "duties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      duties: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          depot: string
          division: string | null
          duty_date: string
          duty_number: string
          end_time: string
          id: string
          live_status: Database["public"]["Enums"]["duty_status"] | null
          live_status_note: string | null
          live_status_updated_at: string | null
          notes: string | null
          pis_current_stop: string | null
          pis_delay_sec: number | null
          pis_headsign: string | null
          pis_next_stop: string | null
          pis_route: string | null
          pis_updated_at: string | null
          priority: Database["public"]["Enums"]["duty_priority"]
          route: string
          start_time: string
          status: Database["public"]["Enums"]["duty_status"]
          vehicle_id: string | null
          vehicle_label: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          depot: string
          division?: string | null
          duty_date: string
          duty_number: string
          end_time: string
          id?: string
          live_status?: Database["public"]["Enums"]["duty_status"] | null
          live_status_note?: string | null
          live_status_updated_at?: string | null
          notes?: string | null
          pis_current_stop?: string | null
          pis_delay_sec?: number | null
          pis_headsign?: string | null
          pis_next_stop?: string | null
          pis_route?: string | null
          pis_updated_at?: string | null
          priority?: Database["public"]["Enums"]["duty_priority"]
          route: string
          start_time: string
          status?: Database["public"]["Enums"]["duty_status"]
          vehicle_id?: string | null
          vehicle_label?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          depot?: string
          division?: string | null
          duty_date?: string
          duty_number?: string
          end_time?: string
          id?: string
          live_status?: Database["public"]["Enums"]["duty_status"] | null
          live_status_note?: string | null
          live_status_updated_at?: string | null
          notes?: string | null
          pis_current_stop?: string | null
          pis_delay_sec?: number | null
          pis_headsign?: string | null
          pis_next_stop?: string | null
          pis_route?: string | null
          pis_updated_at?: string | null
          priority?: Database["public"]["Enums"]["duty_priority"]
          route?: string
          start_time?: string
          status?: Database["public"]["Enums"]["duty_status"]
          vehicle_id?: string | null
          vehicle_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duties_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duties_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      incident_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          incident_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          incident_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_notes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          attachments: Json
          created_at: string
          description: string
          duty_id: string | null
          duty_number: string | null
          escalated: boolean
          id: string
          incident_code: string | null
          location: string | null
          occurred_at: string | null
          priority: Database["public"]["Enums"]["incident_priority"]
          reporter_id: string
          route: string | null
          source: string
          status: Database["public"]["Enums"]["incident_status"]
          type: Database["public"]["Enums"]["incident_type"]
          updated_at: string
          vehicle_id: string | null
          vehicle_label: string | null
        }
        Insert: {
          attachments?: Json
          created_at?: string
          description: string
          duty_id?: string | null
          duty_number?: string | null
          escalated?: boolean
          id?: string
          incident_code?: string | null
          location?: string | null
          occurred_at?: string | null
          priority?: Database["public"]["Enums"]["incident_priority"]
          reporter_id: string
          route?: string | null
          source?: string
          status?: Database["public"]["Enums"]["incident_status"]
          type: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
          vehicle_id?: string | null
          vehicle_label?: string | null
        }
        Update: {
          attachments?: Json
          created_at?: string
          description?: string
          duty_id?: string | null
          duty_number?: string | null
          escalated?: boolean
          id?: string
          incident_code?: string | null
          location?: string | null
          occurred_at?: string | null
          priority?: Database["public"]["Enums"]["incident_priority"]
          reporter_id?: string
          route?: string | null
          source?: string
          status?: Database["public"]["Enums"]["incident_status"]
          type?: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
          vehicle_id?: string | null
          vehicle_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_duty_id_fkey"
            columns: ["duty_id"]
            isOneToOne: false
            referencedRelation: "duties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          audience: Json
          audience_kind: Database["public"]["Enums"]["message_audience_kind"]
          author_id: string
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          subject: string
        }
        Insert: {
          audience?: Json
          audience_kind: Database["public"]["Enums"]["message_audience_kind"]
          author_id: string
          body: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          subject: string
        }
        Update: {
          audience?: Json
          audience_kind?: Database["public"]["Enums"]["message_audience_kind"]
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          subject?: string
        }
        Relationships: []
      }
      line_frequency_windows: {
        Row: {
          created_at: string
          end_time: string
          headway_min: number
          id: string
          start_time: string
          timetable_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          headway_min: number
          id?: string
          start_time: string
          timetable_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          headway_min?: number
          id?: string
          start_time?: string
          timetable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_frequency_windows_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "line_timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      line_interline_pairs: {
        Row: {
          created_at: string
          id: string
          line_a_id: string
          line_b_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_a_id: string
          line_b_id: string
        }
        Update: {
          created_at?: string
          id?: string
          line_a_id?: string
          line_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_interline_pairs_line_a_id_fkey"
            columns: ["line_a_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_interline_pairs_line_b_id_fkey"
            columns: ["line_b_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      line_stops: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["line_direction"]
          id: string
          line_id: string
          position: number
          stop_id: string
          travel_time_to_next_min: number
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["line_direction"]
          id?: string
          line_id: string
          position: number
          stop_id: string
          travel_time_to_next_min?: number
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["line_direction"]
          id?: string
          line_id?: string
          position?: number
          stop_id?: string
          travel_time_to_next_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "line_stops_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_stops_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "stops"
            referencedColumns: ["id"]
          },
        ]
      }
      line_timetables: {
        Row: {
          created_at: string
          day_type: Database["public"]["Enums"]["planning_day_type"]
          first_departure: string
          id: string
          last_departure: string
          layover_a_min: number
          layover_b_min: number
          line_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_type: Database["public"]["Enums"]["planning_day_type"]
          first_departure?: string
          id?: string
          last_departure?: string
          layover_a_min?: number
          layover_b_min?: number
          line_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_type?: Database["public"]["Enums"]["planning_day_type"]
          first_departure?: string
          id?: string
          last_departure?: string
          layover_a_min?: number
          layover_b_min?: number
          line_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_timetables_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      lines: {
        Row: {
          active: boolean
          created_at: string
          custom_return: boolean
          depot: string
          id: string
          interlining_enabled: boolean
          line_number: string
          min_interline_layover_min: number
          terminus_a: string
          terminus_b: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          custom_return?: boolean
          depot?: string
          id?: string
          interlining_enabled?: boolean
          line_number: string
          min_interline_layover_min?: number
          terminus_a: string
          terminus_b: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          custom_return?: boolean
          depot?: string
          id?: string
          interlining_enabled?: boolean
          line_number?: string
          min_interline_layover_min?: number
          terminus_a?: string
          terminus_b?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_recipients: {
        Row: {
          created_at: string
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "internal_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          related_duty_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          related_duty_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          related_duty_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_duty_id_fkey"
            columns: ["related_duty_id"]
            isOneToOne: false
            referencedRelation: "duties"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "popup_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "popup_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_announcements: {
        Row: {
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          author_id: string | null
          body: string
          created_at: string
          id: string
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          depot: string | null
          discord_username: string | null
          email_notifications: boolean
          employee_id: string | null
          full_name: string
          id: string
          phone: string | null
          roblox_username: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          depot?: string | null
          discord_username?: string | null
          email_notifications?: boolean
          employee_id?: string | null
          full_name: string
          id: string
          phone?: string | null
          roblox_username?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          depot?: string | null
          discord_username?: string | null
          email_notifications?: boolean
          employee_id?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          roblox_username?: string | null
        }
        Relationships: []
      }
      recruitment_applications: {
        Row: {
          created_at: string
          discord_username: string | null
          email: string
          experience: string | null
          id: string
          motivation: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          roblox_username: string
          status: Database["public"]["Enums"]["recruitment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_username?: string | null
          email: string
          experience?: string | null
          id?: string
          motivation: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          roblox_username: string
          status?: Database["public"]["Enums"]["recruitment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_username?: string | null
          email?: string
          experience?: string | null
          id?: string
          motivation?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          roblox_username?: string
          status?: Database["public"]["Enums"]["recruitment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      report_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          report_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          report_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "driver_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      roblox_commands: {
        Row: {
          acked_at: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          id: string
          payload: Json
          target_user_id: string
          type: string
        }
        Insert: {
          acked_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          payload?: Json
          target_user_id: string
          type: string
        }
        Update: {
          acked_at?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          id?: string
          payload?: Json
          target_user_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "roblox_commands_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stops: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacation_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["vacation_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          end_date: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["vacation_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["vacation_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_block_trips: {
        Row: {
          arrival_time: string
          block_id: string
          created_at: string
          departure_time: string
          direction: Database["public"]["Enums"]["line_direction"]
          id: string
          line_id: string
          line_number: string
          trip_order: number
        }
        Insert: {
          arrival_time: string
          block_id: string
          created_at?: string
          departure_time: string
          direction: Database["public"]["Enums"]["line_direction"]
          id?: string
          line_id: string
          line_number: string
          trip_order: number
        }
        Update: {
          arrival_time?: string
          block_id?: string
          created_at?: string
          departure_time?: string
          direction?: Database["public"]["Enums"]["line_direction"]
          id?: string
          line_id?: string
          line_number?: string
          trip_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_block_trips_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "vehicle_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_block_trips_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_blocks: {
        Row: {
          block_number: number
          created_at: string
          day_type: Database["public"]["Enums"]["planning_day_type"]
          depot: string
          end_time: string
          id: string
          line_ids: string[]
          line_numbers: string[]
          start_time: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          block_number: number
          created_at?: string
          day_type: Database["public"]["Enums"]["planning_day_type"]
          depot: string
          end_time: string
          id?: string
          line_ids: string[]
          line_numbers: string[]
          start_time: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          block_number?: number
          created_at?: string
          day_type?: Database["public"]["Enums"]["planning_day_type"]
          depot?: string
          end_time?: string
          id?: string
          line_ids?: string[]
          line_numbers?: string[]
          start_time?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_blocks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          performed_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          performed_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          performed_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          capacity: number | null
          created_at: string
          depot: string
          fuel: Database["public"]["Enums"]["fuel_type"]
          id: string
          model: string
          notes: string | null
          production_year: number | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vehicle_number: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          depot: string
          fuel: Database["public"]["Enums"]["fuel_type"]
          id?: string
          model: string
          notes?: string | null
          production_year?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_number: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          depot?: string
          fuel?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          model?: string
          notes?: string | null
          production_year?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_any_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      announcement_category:
        | "operations"
        | "service_changes"
        | "events"
        | "training"
        | "general"
      app_role: "admin" | "driver" | "dyspozytor"
      availability_type: "unavailable" | "preferred"
      driver_presence_status: "active" | "break" | "offline" | "unavailable"
      duty_priority: "low" | "normal" | "high"
      duty_status:
        | "unassigned"
        | "pending"
        | "assigned"
        | "on_route"
        | "on_break"
        | "delayed"
        | "vehicle_failure"
        | "emergency"
        | "completed"
      fuel_type: "Diesel" | "Elektryczny" | "Hybrydowy" | "Wodorowy"
      incident_priority: "critical" | "high" | "medium" | "low"
      incident_status: "reported" | "in_progress" | "resolved" | "closed"
      incident_type:
        | "collision"
        | "breakdown"
        | "blockage"
        | "major_delay"
        | "passenger_emergency"
        | "security"
        | "infrastructure"
        | "other"
      leave_type:
        | "wypoczynkowy"
        | "na_zadanie"
        | "okolicznosciowy"
        | "bezplatny"
        | "chorobowy"
        | "opieka"
        | "macierzynski"
        | "ojcowski"
        | "szkoleniowy"
        | "inny"
      line_direction: "AB" | "BA"
      message_audience_kind:
        | "all_drivers"
        | "drivers"
        | "routes"
        | "vehicles"
        | "divisions"
        | "dispatchers"
      message_kind:
        | "announcement"
        | "urgent"
        | "service_change"
        | "diversion"
        | "driver_message"
      planning_day_type: "weekday" | "saturday" | "sunday"
      recruitment_status: "new" | "reviewing" | "accepted" | "rejected"
      report_category:
        | "operational"
        | "complaint"
        | "infrastructure"
        | "vehicle"
        | "schedule"
        | "info"
      report_status: "new" | "in_review" | "action_taken" | "closed"
      vacation_status: "pending" | "approved" | "rejected"
      vehicle_status:
        | "available"
        | "assigned"
        | "out_of_service"
        | "reserve"
        | "in_service"
        | "under_repair"
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
      announcement_category: [
        "operations",
        "service_changes",
        "events",
        "training",
        "general",
      ],
      app_role: ["admin", "driver", "dyspozytor"],
      availability_type: ["unavailable", "preferred"],
      driver_presence_status: ["active", "break", "offline", "unavailable"],
      duty_priority: ["low", "normal", "high"],
      duty_status: [
        "unassigned",
        "pending",
        "assigned",
        "on_route",
        "on_break",
        "delayed",
        "vehicle_failure",
        "emergency",
        "completed",
      ],
      fuel_type: ["Diesel", "Elektryczny", "Hybrydowy", "Wodorowy"],
      incident_priority: ["critical", "high", "medium", "low"],
      incident_status: ["reported", "in_progress", "resolved", "closed"],
      incident_type: [
        "collision",
        "breakdown",
        "blockage",
        "major_delay",
        "passenger_emergency",
        "security",
        "infrastructure",
        "other",
      ],
      leave_type: [
        "wypoczynkowy",
        "na_zadanie",
        "okolicznosciowy",
        "bezplatny",
        "chorobowy",
        "opieka",
        "macierzynski",
        "ojcowski",
        "szkoleniowy",
        "inny",
      ],
      line_direction: ["AB", "BA"],
      message_audience_kind: [
        "all_drivers",
        "drivers",
        "routes",
        "vehicles",
        "divisions",
        "dispatchers",
      ],
      message_kind: [
        "announcement",
        "urgent",
        "service_change",
        "diversion",
        "driver_message",
      ],
      planning_day_type: ["weekday", "saturday", "sunday"],
      recruitment_status: ["new", "reviewing", "accepted", "rejected"],
      report_category: [
        "operational",
        "complaint",
        "infrastructure",
        "vehicle",
        "schedule",
        "info",
      ],
      report_status: ["new", "in_review", "action_taken", "closed"],
      vacation_status: ["pending", "approved", "rejected"],
      vehicle_status: [
        "available",
        "assigned",
        "out_of_service",
        "reserve",
        "in_service",
        "under_repair",
      ],
    },
  },
} as const
