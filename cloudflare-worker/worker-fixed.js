/**
 * Cloudflare Worker for Ikeda Tatami LINE Notification
 * 池田畳店 LINE通知用 Cloudflare Worker
 */

// Supabase設定
const SUPABASE_URL = 'https://uqnwtzgtzhvysuhjkrul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbnd0emd0emh2eXN1aGprcnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODk1ODAsImV4cCI6MjA3ODk2NTU4MH0.MaoWGBfBT1zjySV286LeevqeeHy2g6xCtLdRNztn8SQ';

// LINE Messaging API エンドポイント
const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * CORSヘッダーを追加
 */
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * メッセージをフォーマット
 */
function formatMessage(data) {
  const typeLabels = {
    estimate: '見積依頼',
    workshop: 'ワークショップ',
    visit: '見学・体験予約'
  };

  let message = '【新規予約】池田畳店\n\n';
  message += '予約種別: ' + (typeLabels[data.reservationType] || data.reservationType) + '\n';
  message += 'お名前: ' + (data.name || '未入力') + '\n';
  message += '電話番号: ' + (data.phone || '未入力') + '\n';
  message += 'メールアドレス: ' + (data.email || '未入力') + '\n';

  if (data.address) {
    message += '住所: ' + data.address + '\n';
  }

  if (data.reservationDate && data.reservationTime) {
    message += '予約日時: ' + data.reservationDate + ' ' + data.reservationTime + '\n';
  }

  if (data.requestContent) {
    message += '依頼内容: ' + data.requestContent + '\n';
  }

  if (data.concerns) {
    message += '懸念点: ' + data.concerns + '\n';
  }

  if (data.workshopType) {
    message += 'ワークショップ種別: ' + data.workshopType + '\n';
  }

  if (data.participantsAdults || data.participantsChildren) {
    message += '参加人数: 大人' + (data.participantsAdults || 0) + '名、子ども' + (data.participantsChildren || 0) + '名\n';
  }

  return message;
}

/**
 * Supabaseからテナント情報を取得
 */
async function getTenantInfo(tenantId) {
  const url = SUPABASE_URL + '/rest/v1/tenants?id=eq.' + tenantId + '&select=*';
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tenant info');
  }

  const data = await response.json();
  return data[0] || null;
}

/**
 * LINE APIにメッセージを送信
 */
async function sendLineMessage(accessToken, userId, message) {
  const response = await fetch(LINE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
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
  });

  return response.ok;
}

/**
 * メインハンドラー
 */
export default {
  async fetch(request) {
    const origin = request.headers.get('Origin');

    // OPTIONSリクエスト（プリフライト）の処理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin)
      });
    }

    // POSTリクエストのみ受け付ける
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      });
    }

    try {
      // リクエストボディを取得
      const body = await request.json();

      if (!body.tenantId) {
        return new Response(JSON.stringify({ success: false, message: 'Tenant ID is required' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin)
          }
        });
      }

      // テナント情報を取得
      const tenant = await getTenantInfo(body.tenantId);

      if (!tenant) {
        return new Response(JSON.stringify({ success: false, message: 'Tenant not found' }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin)
          }
        });
      }

      // LINE設定を確認
      if (!tenant.line_channel_access_token || !tenant.line_user_id) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'LINE notification is not configured' 
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin)
          }
        });
      }

      // メッセージを作成
      const message = formatMessage(body.data);

      // LINE APIに送信
      const success = await sendLineMessage(
        tenant.line_channel_access_token,
        tenant.line_user_id,
        message
      );

      if (success) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Notification sent successfully' 
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin)
          }
        });
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Failed to send LINE notification' 
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin)
          }
        });
      }

    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin)
        }
      });
    }
  }
};
