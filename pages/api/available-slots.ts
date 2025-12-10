import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant_slug, reservation_type } = req.query

    if (!tenant_slug || typeof tenant_slug !== 'string') {
      return res.status(400).json({ error: 'tenant_slug is required' })
    }

    console.log('[Available Slots API] Query:', { tenant_slug, reservation_type })

    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .single()

    if (tenantError) {
      console.error('[Available Slots API] Tenant fetch error:', tenantError)
      return res.status(404).json({ error: 'Tenant not found', details: tenantError.message })
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    console.log('[Available Slots API] Tenant ID:', tenant.id)

    // 受付可能日を取得
    let query = supabase
      .from('available_slots')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_available', true)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    // 予約タイプでフィルター（指定がある場合）
    if (reservation_type && reservation_type !== 'all' && typeof reservation_type === 'string') {
      query = query.or(`reservation_type.eq.${reservation_type},reservation_type.eq.all`)
    }

    const { data: slots, error: slotsError } = await query

    if (slotsError) {
      console.error('[Available Slots API] Slots fetch error:', slotsError)
      return res.status(500).json({ error: 'Failed to fetch available slots', details: slotsError.message })
    }

    console.log('[Available Slots API] Found slots:', slots?.length || 0)

    return res.status(200).json({ data: slots || [] })
  } catch (error: any) {
    console.error('[Available Slots API] Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
