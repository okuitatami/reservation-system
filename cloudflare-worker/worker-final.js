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
 * オブジェクトをマージする（スプレッド演算子の代替）
 */
function mergeHeaders(base, additional) {
  const result = {};
  for (const key in base) {
    result[key] = base[key];
  }
  for (const key in additional) {
    result[key] = additional[key];
  }
  return result;
}

/**
 * メッセージをフォーマット
 */
function formatMessage(data, tenantSlug) {
  const typeLabels = {
    estimate: '見積依頼',
    workshop: 'ワークショップ',
    visit: '見学・体験予約'
  };

  const workshopLabels = {
    tatami_doctor: 'たたみ博士になろう！',
    half_day_craftsman: '半日畳職人体験',
    morimori_experience: 'もりもり体験会',
    mini_tatami: 'ミニ畳作り体験'
  };

  // テナント名を決定
  const tenantName = tenantSlug === 'ikeda-tatami' ? '池田畳店' : '奥井畳店';
  
  let message = '【新規予約】' + tenantName + '\n\n';
  
  // 予約種別の表示（ワークショップの場合はコース名も追加）
  if (data.reservationType === 'workshop' && data.workshopType) {
    message += '予約種別: ワークショップ、' + (workshopLabels[data.workshopType] || data.workshopType) + '\n';
  } else {
    message += '予約種別: ' + (typeLabels[data.reservationType] || data.reservationType) + '\n';
  }
  
  message += '予約日時: ' + data.reservationDate + ' ' + data.reservationTime + '\n';
  message += '\n';
  message += '■ お客様情報\n';
  message += 'お名前: ' + (data.name || '未入力') + '\n';
  message += '電話番号: ' + (data.phone || '未入力') + '\n';
  message += 'メールアドレス: ' + (data.email || '未入力') + '\n';

  if (data.address) {
    message += '住所: ' + data.address + '\n';
  }

  // 参加人数（ワークショップの場合）
  if (data.participantsChildren || data.participantsAdults) {
    message += '\n';
    message += '■ 参加人数\n';
    message += '体験参加: ' + (data.participantsChildren || 0) + '名\n';
    message += '保護者: ' + (data.participantsAdults || 0) + '名\n';
  }

  if (data.requestContent) {
    message += '\n';
    message += '■ 依頼内容\n';
    message += data.requestContent + '\n';
  }

  if (data.concerns) {
    message += '\n';
    message += '■ 懸念点\n';
    message += data.concerns + '\n';
  }

  message += '\n';
  message += '━━━━━━━━━━━━━━━\n';
  message += '💡 対応方法\n';
  message += 'お客様から「' + (data.name || '未入力') + '」とLINEメッセージが届いたら、そのトークで返信してください。\n';
  message += '\n';
  message += 'または\n';
  message += '📞 電話: ' + (data.phone || '未入力') + '\n';
  message += '\n';
  message += '━━━━━━━━━━━━━━━\n';
  message += '📋 予約管理画面\n';
  message += 'https://reservation-system-three-murex.vercel.app/' + tenantSlug + '/admin';

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
        headers: mergeHeaders({ 'Content-Type': 'application/json' }, corsHeaders(origin))
      });
    }

    try {
      // リクエストボディを取得
      const body = await request.json();

      if (!body.tenantId) {
        return new Response(JSON.stringify({ success: false, message: 'Tenant ID is required' }), {
          status: 400,
          headers: mergeHeaders({ 'Content-Type': 'application/json' }, corsHeaders(origin))
        });
      }

      // テナント情報を取得
      const tenant = await getTenantInfo(body.tenantId);

      if (!tenant) {
        return new Response(JSON.stringify({ success: false, message: 'Tenant not found' }), {
          status: 404,
          headers: mergeHeaders({ 'Content-Type': 'application/json' }, corsHeaders(origin))
        });
      }

      // LINE設定を確認
      if (!tenant.line_channel_access_token || !tenant.line_user_id) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'LINE notification is not configured' 
        }), {
          status: 200,
          headers: mergeHeaders({ 'Content-Type': 'application/json' }, corsHeaders(origin))
        });
      }

      // メッセージを作成
      const message = formatMessage(body.data, tenant.slug);

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
          headers: mergeHeaders({ 'Content-Type': 'application/json' }, corsHeaders(origin))
        });
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Failed to send LINE notification' 
        }), {
          status: 500,
          headers: mergeHeaders({ 'Content-Type': 'application/json' }, corsHeaders(origin))
        });
      }

    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      }), {
        status: 500,
        headers: mergeHeaders({ 'Content-Type': 'application/json' }, corsHeaders(origin))
      });
    }
  }
};
