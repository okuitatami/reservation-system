import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'
import { sendLineNotification, formatReservationMessage, LineNotificationRequest, LineNotificationResponse } from '@/api/send-line-notification'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LineNotificationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const body = req.body as LineNotificationRequest

    if (!body.tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' })
    }

    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', body.tenantId)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' })
    }

    // LINE設定が有効か確認
    if (!tenant.line_channel_access_token || !tenant.line_user_id) {
      console.log('LINE notification disabled for tenant:', tenant.slug)
      return res.status(200).json({ 
        success: true, 
        message: 'LINE notification is not configured for this tenant' 
      })
    }

    // メッセージを作成
    const message = formatReservationMessage(body)

    // LINE通知を送信
    const success = await sendLineNotification(
      tenant.line_channel_access_token,
      tenant.line_user_id,
      message
    )

    if (success) {
      return res.status(200).json({ success: true, message: 'Notification sent' })
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send notification' })
    }
  } catch (error) {
    console.error('LINE notification error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
