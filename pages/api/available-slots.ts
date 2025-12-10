import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant_slug, reservation_type } = req.query

    if (!tenant_slug) {
      return res.status(400).json({ error: 'tenant_slug is required' })
    }

    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // 受付可能日を取得
    let query = supabase
      .from('available_slots')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_available', true)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    // 予約タイプでフィルター（指定がある場合）
    if (reservation_type && reservation_type !== 'all') {
      query = query.or(`reservation_type.eq.${reservation_type},reservation_type.eq.all`)
    }

    const { data: slots, error: slotsError } = await query

    if (slotsError) {
      console.error('Available slots fetch error:', slotsError)
      return res.status(500).json({ error: 'Failed to fetch available slots' })
    }

    return res.status(200).json({ data: slots || [] })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
