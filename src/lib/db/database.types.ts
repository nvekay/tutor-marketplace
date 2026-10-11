
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "availability_exceptions": {
                  Row: {
                    "date": string,"end_minute": number | null,"id": number,"start_minute": number | null,"tutor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "date": string,"end_minute"?: number | null,"id"?: never,"start_minute"?: number | null,"tutor_id": string
                  }
                  Update: {
                    "date"?: string,"end_minute"?: number | null,"id"?: never,"start_minute"?: number | null,"tutor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_exceptions_tutor_id_fkey"
      columns: ["tutor_id"]
isOneToOne: false
      referencedRelation: "tutors"
      referencedColumns: ["profile_id"]
    }
                  ]
                },"availability_rules": {
                  Row: {
                    "end_minute": number,"id": number,"start_minute": number,"tutor_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "end_minute": number,"id"?: never,"start_minute": number,"tutor_id": string,"weekday": number
                  }
                  Update: {
                    "end_minute"?: number,"id"?: never,"start_minute"?: number,"tutor_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_rules_tutor_id_fkey"
      columns: ["tutor_id"]
isOneToOne: false
      referencedRelation: "tutors"
      referencedColumns: ["profile_id"]
    }
                  ]
                },"booking_events": {
                  Row: {
                    "actor_id": string | null,"actor_role": string,"booking_id": string,"created_at": string,"data": NonNullable<Json>,"id": number,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_role": string,"booking_id": string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_role"?: string,"booking_id"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_events_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_by": string | null,"charge_id": string | null,"checkout_session_id": string | null,"created_at": string,"currency": string,"dispute_reason": string | null,"ends_at": string,"hold_expires_at": string | null,"id": string,"payment_intent_id": string | null,"payout_cents": number | null,"payout_due_at": string | null,"payout_status": Database["public"]['Enums']["payout_status"],"platform_fee_cents": number,"price_cents": number,"refunded_cents": number,"reminder_sent_at": string | null,"resolution": string | null,"seeded": boolean,"starts_at": string,"status": Database["public"]['Enums']["booking_status"],"stripe_dispute_id": string | null,"student_id": string,"transfer_id": string | null,"tutor_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_by"?: string | null,"charge_id"?: string | null,"checkout_session_id"?: string | null,"created_at"?: string,"currency"?: string,"dispute_reason"?: string | null,"ends_at": string,"hold_expires_at"?: string | null,"id"?: string,"payment_intent_id"?: string | null,"payout_cents"?: number | null,"payout_due_at"?: string | null,"payout_status"?: Database["public"]['Enums']["payout_status"],"platform_fee_cents": number,"price_cents": number,"refunded_cents"?: number,"reminder_sent_at"?: string | null,"resolution"?: string | null,"seeded"?: boolean,"starts_at": string,"status"?: Database["public"]['Enums']["booking_status"],"stripe_dispute_id"?: string | null,"student_id": string,"transfer_id"?: string | null,"tutor_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_by"?: string | null,"charge_id"?: string | null,"checkout_session_id"?: string | null,"created_at"?: string,"currency"?: string,"dispute_reason"?: string | null,"ends_at"?: string,"hold_expires_at"?: string | null,"id"?: string,"payment_intent_id"?: string | null,"payout_cents"?: number | null,"payout_due_at"?: string | null,"payout_status"?: Database["public"]['Enums']["payout_status"],"platform_fee_cents"?: number,"price_cents"?: number,"refunded_cents"?: number,"reminder_sent_at"?: string | null,"resolution"?: string | null,"seeded"?: boolean,"starts_at"?: string,"status"?: Database["public"]['Enums']["booking_status"],"stripe_dispute_id"?: string | null,"student_id"?: string,"transfer_id"?: string | null,"tutor_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_tutor_id_fkey"
      columns: ["tutor_id"]
isOneToOne: false
      referencedRelation: "tutors"
      referencedColumns: ["profile_id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"booking_id": string | null,"created_at": string,"id": number,"kind": string,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"booking_id"?: string | null,"created_at"?: string,"id"?: never,"kind": string,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"booking_id"?: string | null,"created_at"?: string,"id"?: never,"kind"?: string,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"full_name": string,"id": string,"is_demo": boolean,"role": Database["public"]['Enums']["user_role"],"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id": string,"is_demo"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"is_demo"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reviews": {
                  Row: {
                    "booking_id": string,"comment": string,"created_at": string,"rating": number,"student_id": string,"tutor_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"comment"?: string,"created_at"?: string,"rating": number,"student_id": string,"tutor_id": string
                  }
                  Update: {
                    "booking_id"?: string,"comment"?: string,"created_at"?: string,"rating"?: number,"student_id"?: string,"tutor_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_tutor_id_fkey"
      columns: ["tutor_id"]
isOneToOne: false
      referencedRelation: "tutors"
      referencedColumns: ["profile_id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "error": string | null,"id": string,"livemode": boolean,"payload": NonNullable<Json>,"processed_at": string | null,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"id": string,"livemode": boolean,"payload": NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"type": string
                  }
                  Update: {
                    "error"?: string | null,"id"?: string,"livemode"?: boolean,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tutors": {
                  Row: {
                    "bio": string,"created_at": string,"headline": string,"hourly_rate_cents": number,"lesson_minutes": number,"listed": boolean | null,"payouts_enabled": boolean,"profile_id": string,"rating_avg": number | null,"rating_count": number,"stripe_account_id": string | null,"stripe_requirements": (string)[],"stripe_synced_at": string | null,"subjects": (string)[],"transfers_enabled": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string,"created_at"?: string,"headline"?: string,"hourly_rate_cents"?: number,"lesson_minutes"?: number,"listed"?: never,"payouts_enabled"?: boolean,"profile_id": string,"rating_avg"?: number | null,"rating_count"?: number,"stripe_account_id"?: string | null,"stripe_requirements"?: (string)[],"stripe_synced_at"?: string | null,"subjects"?: (string)[],"transfers_enabled"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "bio"?: string,"created_at"?: string,"headline"?: string,"hourly_rate_cents"?: number,"lesson_minutes"?: number,"listed"?: never,"payouts_enabled"?: boolean,"profile_id"?: string,"rating_avg"?: number | null,"rating_count"?: number,"stripe_account_id"?: string | null,"stripe_requirements"?: (string)[],"stripe_synced_at"?: string | null,"subjects"?: (string)[],"transfers_enabled"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tutors_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"replace_availability_rules":
{ Args: { "p_rules": Json }; Returns: undefined
                           }
          }
          Enums: {
            "booking_status": "pending_payment"|"confirmed"|"completed"|"disputed"|"cancelled"|"expired","payout_status": "none"|"scheduled"|"held"|"paid"|"reversed"|"not_due","user_role": "student"|"tutor"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "booking_status": ["pending_payment", "confirmed", "completed", "disputed", "cancelled", "expired"],"payout_status": ["none", "scheduled", "held", "paid", "reversed", "not_due"],"user_role": ["student", "tutor", "admin"]
          }
        }
} as const
