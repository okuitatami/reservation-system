// LINE通知を送信するAPIエンドポイント
// Cloudflare WorkersまたはVercel Functionsで動作します

export interface LineNotificationRequest {
  tenantId: string
  type: 'reservation' | 'event_reservation'
  data: {
    name?: string
    phone?: string
    email?: string
    reservationType?: string
    reservationDate?: string
    reservationTime?: string
    eventName?: string
    eventDate?: string
    adultCount?: number
    childCount?: number
    childAges?: string
    totalPrice?: number
    notes?: string
    requestContent?: string
    concerns?: string
    address?: string
  }
}

export interface LineNotificationResponse {
  success: boolean
  message: string
}

// LINE Messaging API経由で通知を送信
export async function sendLineNotification(
  channelAccessToken: string,
  userId: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
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
    console.error('LINE notification error:', error)
    return false
  }
}

// 予約内容をLINEメッセージに変換
export function formatReservationMessage(req: LineNotificationRequest): string {
  const { type, data } = req

  if (type === 'reservation') {
    let message = '【新しい予約が入りました】\n\n'
    
    const typeLabel = 
      data.reservationType === 'estimate' ? '下見依頼' :
      data.reservationType === 'workshop' ? '見学・体験予約' :
      data.reservationType === 'visit' ? '来店予約' :
      '予約'
    
    message += `種別: ${typeLabel}\n`
    message += `お名前: ${data.name || '-'}\n`
    message += `電話番号: ${data.phone || '-'}\n`
    message += `メール: ${data.email || '-'}\n`
    
    if (data.reservationDate) {
      message += `日時: ${data.reservationDate}`
      if (data.reservationTime) {
        message += ` ${data.reservationTime}`
      }
      message += '\n'
    }
    
    if (data.address) {
      message += `住所: ${data.address}\n`
    }
    
    if (data.requestContent) {
      message += `\nご依頼内容:\n${data.requestContent}\n`
    }
    
    if (data.concerns) {
      message += `\n懸念点・ご質問:\n${data.concerns}\n`
    }
    
    message += '\n管理画面で詳細を確認してください。'
    
    return message
  } else if (type === 'event_reservation') {
    let message = '【イベント予約が入りました】\n\n'
    
    message += `イベント: ${data.eventName || '-'}\n`
    message += `お名前: ${data.name || '-'}\n`
    message += `電話番号: ${data.phone || '-'}\n`
    message += `メール: ${data.email || '-'}\n`
    
    if (data.eventDate) {
      message += `日時: ${data.eventDate}\n`
    }
    
    if (data.adultCount !== undefined) {
      message += `大人: ${data.adultCount}名`
    }
    if (data.childCount !== undefined) {
      message += ` / 子ども: ${data.childCount}名`
    }
    message += '\n'
    
    if (data.childAges) {
      message += `お子様の年齢: ${data.childAges}\n`
    }
    
    if (data.totalPrice !== undefined) {
      message += `合計金額: ¥${data.totalPrice.toLocaleString()}\n`
    }
    
    if (data.notes) {
      message += `\n備考:\n${data.notes}\n`
    }
    
    message += '\n管理画面で詳細を確認してください。'
    
    return message
  }

  return '新しい予約が入りました'
}
