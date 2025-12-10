import type { NextApiRequest, NextApiResponse } from 'next'

interface LineNotificationRequest {
  tenantId: string
  type: string
  data: {
    name?: string
    phone?: string
    email?: string
    reservationType?: string
    reservationDate?: string
    reservationTime?: string
    address?: string
    requestContent?: string
    concerns?: string
    workshopType?: string
    workshopOption?: string
    participantsAdults?: number
    participantsChildren?: number
  }
}

interface LineNotificationResponse {
  success: boolean
  message: string
}

// LINE通知を送信
async function sendLineNotification(
  accessToken: string,
  userId: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    })

    return response.ok
  } catch (error) {
    console.error('LINE API error:', error)
    return false
  }
}

// 予約メッセージをフォーマット
function formatReservationMessage(body: LineNotificationRequest): string {
  const { data } = body
  
  const typeLabels: Record<string, string> = {
    estimate: '見積依頼',
    workshop: 'ワークショップ',
    visit: '見学・体験予約'
  }
  
  let message = '【新規予約】\n\n'
  message += `予約種別: ${typeLabels[data.reservationType || ''] || data.reservationType}\n`
  message += `お名前: ${data.name || '未入力'}\n`
  message += `電話番号: ${data.phone || '未入力'}\n`
  message += `メールアドレス: ${data.email || '未入力'}\n`
  
  if (data.address) {
    message += `住所: ${data.address}\n`
  }
  
  if (data.reservationDate && data.reservationTime) {
    message += `予約日時: ${data.reservationDate} ${data.reservationTime}\n`
  }
  
  if (data.requestContent) {
    message += `依頼内容: ${data.requestContent}\n`
  }
  
  if (data.concerns) {
    message += `懸念点: ${data.concerns}\n`
  }
  
  if (data.workshopType) {
    message += `ワークショップ種別: ${data.workshopType}\n`
  }
  
  if (data.participantsAdults || data.participantsChildren) {
    message += `参加人数: 大人${data.participantsAdults || 0}名、子ども${data.participantsChildren || 0}名\n`
  }
  
  return message
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LineNotificationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const body = req.body as LineNotificationRequest

    console.log('📱 LINE通知API呼び出し:', body)

    if (!body.tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' })
    }

    // Supabaseクライアントを動的にインポート
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase環境変数が設定されていません')
      return res.status(500).json({ success: false, message: 'Server configuration error' })
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', body.tenantId)
      .single()

    if (tenantError || !tenant) {
      console.error('❌ テナント取得エラー:', tenantError)
      return res.status(404).json({ success: false, message: 'Tenant not found' })
    }

    console.log('✅ テナント情報取得:', tenant.tenant_name)

    // LINE設定が有効か確認
    if (!tenant.line_channel_access_token || !tenant.line_user_id) {
      console.log('⚠️ LINE通知未設定:', tenant.slug)
      return res.status(200).json({ 
        success: true, 
        message: 'LINE notification is not configured for this tenant' 
      })
    }

    console.log('📤 LINE通知送信中...')

    // メッセージを作成
    const message = formatReservationMessage(body)

    // LINE通知を送信
    const success = await sendLineNotification(
      tenant.line_channel_access_token,
      tenant.line_user_id,
      message
    )

    if (success) {
      console.log('✅ LINE通知送信成功')
      return res.status(200).json({ success: true, message: 'Notification sent' })
    } else {
      console.error('❌ LINE通知送信失敗')
      return res.status(500).json({ success: false, message: 'Failed to send notification' })
    }
  } catch (error) {
    console.error('❌ LINE通知エラー:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
