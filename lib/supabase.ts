import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface Tenant {
  id: string
  tenant_name: string
  slug: string
  email?: string
  phone?: string
  line_channel_access_token?: string
  line_user_id?: string
  cloudflare_worker_url?: string
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  tenant_id: string
  reservation_type: 'estimate' | 'workshop' | 'visit'
  reservation_date?: string
  reservation_time?: string
  name?: string
  phone?: string
  email?: string
  address?: string
  workshop_type?: 'mini_tatami' | 'rose' | 'hand_sewing' | 'mat_sewing'
  workshop_option?: 'tacker' | 'hand_sewing' | 'onsite' | 'takeaway'
  participants_adults?: number
  participants_children?: number
  request_content?: string
  concerns?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  tenant_id: string
  title: string
  description?: string
  event_date?: string
  event_time?: string
  location?: string
  adult_capacity?: number
  child_capacity?: number
  adult_price?: number
  child_price?: number
  image_url?: string
  status: 'active' | 'cancelled' | 'completed'
  created_at: string
  updated_at: string
}

export interface EventReservation {
  id: string
  tenant_id: string
  event_id: string
  event_name?: string
  event_date?: string
  name?: string
  email?: string
  phone?: string
  adult_count?: number
  child_count?: number
  child_ages?: string
  total_price?: number
  notes?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface AvailableSlot {
  id: string
  tenant_id: string
  reservation_type: 'estimate' | 'workshop' | 'visit'
  date: string
  time: string
  max_capacity?: number
  is_available?: boolean
  created_at: string
  updated_at: string
}
