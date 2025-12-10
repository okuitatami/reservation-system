import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tenant_slug } = req.query

    if (!tenant_slug || typeof tenant_slug !== 'string') {
      return res.status(400).json({ error: 'tenant_slug is required' })
    }

    console.log('[Reservations API GET] Query:', { tenant_slug })

    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenant_slug)
      .single()

    if (tenantError) {
      console.error('[Reservations API GET] Tenant fetch error:', tenantError)
      return res.status(404).json({ error: 'Tenant not found', details: tenantError.message })
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    console.log('[Reservations API GET] Tenant ID:', tenant.id)

    // 予約情報を取得
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (reservationsError) {
      console.error('[Reservations API GET] Reservations fetch error:', reservationsError)
      return res.status(500).json({ error: 'Failed to fetch reservations', details: reservationsError.message })
    }

    console.log('[Reservations API GET] Found reservations:', reservations?.length || 0)

    return res.status(200).json({ data: reservations || [] })
  } catch (error: any) {
    console.error('[Reservations API GET] Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const reservationData = req.body

    console.log('[Reservations API POST] Received data:', JSON.stringify(reservationData, null, 2))

    if (!reservationData || !reservationData.tenant_id) {
      return res.status(400).json({ error: 'Invalid reservation data: tenant_id is required' })
    }

    // 予約データを挿入
    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert([reservationData])
      .select()
      .single()

    if (insertError) {
      console.error('[Reservations API POST] Insert error:', insertError)
      return res.status(500).json({ error: 'Failed to create reservation', details: insertError.message })
    }

    console.log('[Reservations API POST] Created reservation:', reservation?.id)

    return res.status(201).json({ data: reservation })
  } catch (error: any) {
    console.error('[Reservations API POST] Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
