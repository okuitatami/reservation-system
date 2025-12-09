import type { NextApiRequest, NextApiResponse } from 'next'

// LINE Webhookを受信してUser IDをログに出力
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const body = req.body

    console.log('=== LINE Webhook received ===')
    console.log('Full body:', JSON.stringify(body, null, 2))

    // イベントからUser IDを抽出
    if (body.events && body.events.length > 0) {
      for (const event of body.events) {
        if (event.source && event.source.userId) {
          console.log('🎯 User ID found:', event.source.userId)
          console.log('=========================')
        }
      }
    }

    // LINEには常に200を返す
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(200).json({ success: true })
  }
}
