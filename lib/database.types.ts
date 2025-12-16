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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      sales_inquiries: {
        Row: {
          contact_id: string
          created_at: string | null
          created_by: string
          credit_limit: number | null
          customer_reference: string | null
          delivery_address: string | null
          grand_total: number | null
          id: string
          inquiry_no: string
          inquiry_type: string | null
          po_number: string | null
          price_group: string | null
          promise_to_pay: string | null
          reference_no: string | null
          remarks: string | null
          sales_date: string
          sales_person: string
          send_by: string | null
          terms: string | null
          updated_at: string | null
          urgency: string | null
          urgency_date: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          created_by: string
          credit_limit?: number | null
          customer_reference?: string | null
          delivery_address?: string | null
          grand_total?: number | null
          id?: string
          inquiry_no: string
          inquiry_type?: string | null
          po_number?: string | null
          price_group?: string | null
          promise_to_pay?: string | null
          reference_no?: string | null
          remarks?: string | null
          sales_date: string
          sales_person: string
          send_by?: string | null
          terms?: string | null
          updated_at?: string | null
          urgency?: string | null
          urgency_date?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          created_by?: string
          credit_limit?: number | null
          customer_reference?: string | null
          delivery_address?: string | null
          grand_total?: number | null
          id?: string
          inquiry_no?: string
          inquiry_type?: string | null
          po_number?: string | null
          price_group?: string | null
          promise_to_pay?: string | null
          reference_no?: string | null
          remarks?: string | null
          sales_date?: string
          sales_person?: string
          send_by?: string | null
          terms?: string | null
          updated_at?: string | null
          urgency?: string | null
          urgency_date?: string | null
        }
        Relationships: []
      }
      sales_inquiry_items: {
        Row: {
          amount: number | null
          approval_status: string | null
          created_at: string | null
          description: string | null
          id: string
          inquiry_id: string
          item_code: string | null
          location: string | null
          part_no: string | null
          qty: number
          remark: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          approval_status?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          inquiry_id: string
          item_code?: string | null
          location?: string | null
          part_no?: string | null
          qty?: number
          remark?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          approval_status?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          inquiry_id?: string
          item_code?: string | null
          location?: string | null
          part_no?: string | null
          qty?: number
          remark?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_inquiry_items_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "sales_inquiries"
            referencedColumns: ["id"]
          },
        ]
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
