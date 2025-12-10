import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // 予約情報を取得
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (reservationsError) {
      console.error('Reservations fetch error:', reservationsError)
      return res.status(500).json({ error: 'Failed to fetch reservations' })
    }

    return res.status(200).json({ data: reservations || [] })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const reservationData = req.body

    if (!reservationData || !reservationData.tenant_id) {
      return res.status(400).json({ error: 'Invalid reservation data' })
    }

    // 予約データを挿入
    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert([reservationData])
      .select()
      .single()

    if (insertError) {
      console.error('Reservation insert error:', insertError)
      return res.status(500).json({ error: 'Failed to create reservation' })
    }

    return res.status(201).json({ data: reservation })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
