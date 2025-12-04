// イベント予約フォームJavaScript

let currentEvent = null;
let currentReservationCount = 0;

// EmailJS初期化
emailjs.init('BgmMY1s2iEbsrZaFj');

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', async () => {
    // URLパラメータからイベントIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
    if (!eventId) {
        showError();
        return;
    }
    
    await loadEventDetail(eventId);
    setupCounterButtons();
    setupFormSubmit();
});

// イベント詳細を読み込み
async function loadEventDetail(eventId) {
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const detailContainer = document.getElementById('eventDetailContainer');
    
    try {
        loading.style.display = 'flex';
        
        // イベント情報取得
        const response = await fetch(`tables/events/${eventId}`);
        if (!response.ok) throw new Error('イベントが見つかりません');
        
        currentEvent = await response.json();
        
        // 予約数取得
        currentReservationCount = await getReservationCount(eventId);
        
        loading.style.display = 'none';
        detailContainer.style.display = 'block';
        
        // イベント詳細を表示
        renderEventDetail();
        
    } catch (error) {
        console.error('イベント読み込みエラー:', error);
        loading.style.display = 'none';
        errorMessage.style.display = 'flex';
    }
}

// 予約数を取得
async function getReservationCount(eventId) {
    try {
        const response = await fetch(`tables/event_reservations?limit=1000`);
        const data = await response.json();
        const reservations = (data.data || []).filter(r => 
            r.event_id === eventId && 
            r.status !== 'cancelled'
        );
        
        let totalCount = 0;
        reservations.forEach(r => {
            totalCount += (r.adult_count || 0) + (r.child_count || 0);
        });
        
        return totalCount;
    } catch (error) {
        console.error('予約数取得エラー:', error);
        return 0;
    }
}

// イベント詳細を表示
function renderEventDetail() {
    const now = new Date();
    const eventDate = new Date(currentEvent.event_date);
    const recruitmentEnd = new Date(currentEvent.recruitment_end);
    const availableSlots = currentEvent.capacity - currentReservationCount;
    
    // ステータス判定
    const isCompleted = currentEvent.status === 'completed' || eventDate < now;
    const isClosed = currentEvent.status === 'closed' || now > recruitmentEnd || currentEvent.status === 'full' || availableSlots <= 0;
    const canReserve = !isCompleted && !isClosed && currentEvent.status === 'published';
    
    // ステータスバッジ
    const statusBadgeEl = document.getElementById('eventStatusBadge');
    if (isCompleted) {
        statusBadgeEl.textContent = '終了';
        statusBadgeEl.className = 'status-badge completed';
    } else if (isClosed) {
        statusBadgeEl.textContent = availableSlots <= 0 ? '満員御礼' : '募集締切';
        statusBadgeEl.className = 'status-badge closed';
    } else {
        const daysSincePublished = (now - new Date(currentEvent.created_at)) / (1000 * 60 * 60 * 24);
        if (daysSincePublished <= 7) {
            statusBadgeEl.textContent = '新着';
            statusBadgeEl.className = 'status-badge new';
        } else {
            statusBadgeEl.textContent = '募集中';
            statusBadgeEl.className = 'status-badge recruiting';
        }
    }
    
    // イベント名
    document.getElementById('eventName').textContent = currentEvent.event_name;
    
    // イベント画像
    const imageContainer = document.getElementById('eventImage');
    if (currentEvent.image_url) {
        imageContainer.innerHTML = `<img src="${currentEvent.image_url}" alt="${currentEvent.event_name}">`;
    } else {
        imageContainer.style.display = 'none';
    }
    
    // 説明
    document.getElementById('eventDescription').innerHTML = currentEvent.description || '<p>詳細な説明はありません。</p>';
    
    // 開催日時
    document.getElementById('eventDateTime').textContent = formatDateTime(eventDate);
    
    // 所要時間
    document.getElementById('eventDuration').textContent = currentEvent.duration || '未定';
    
    // 対象年齢
    document.getElementById('eventTargetAge').textContent = currentEvent.target_age || '全年齢';
    
    // 参加費
    const priceEl = document.getElementById('eventPrice');
    let priceHtml = '';
    if (currentEvent.has_adult_price) {
        priceHtml += `<p>大人：<strong>¥${currentEvent.adult_price.toLocaleString()}</strong></p>`;
    }
    if (currentEvent.has_child_price) {
        priceHtml += `<p>子供：<strong>¥${currentEvent.child_price.toLocaleString()}</strong></p>`;
    }
    if (!currentEvent.has_adult_price && !currentEvent.has_child_price) {
        priceHtml = '<p>無料</p>';
        document.getElementById('priceCard').style.display = 'none';
    }
    priceEl.innerHTML = priceHtml;
    
    // 残席
    document.getElementById('eventCapacity').innerHTML = `
        定員：${currentEvent.capacity}名<br>
        ${canReserve ? `<strong style="color: ${availableSlots <= 5 ? '#dc3545' : '#28a745'}">残り${availableSlots}席</strong>` : ''}
    `;
    
    // 募集期間
    document.getElementById('eventRecruitment').textContent = 
        `${formatDate(new Date(currentEvent.recruitment_start))} 〜 ${formatDate(recruitmentEnd)}`;
    
    // フォーム表示制御
    const formContainer = document.getElementById('reservationFormContainer');
    const closedMessage = document.getElementById('closedMessage');
    
    if (canReserve) {
        formContainer.style.display = 'block';
        closedMessage.style.display = 'none';
        
        // hiddenフィールドに値をセット
        document.getElementById('eventId').value = currentEvent.id;
        document.getElementById('eventNameHidden').value = currentEvent.event_name;
        
        // カウンター表示制御
        if (!currentEvent.has_adult_price) {
            document.getElementById('adultCounterGroup').style.display = 'none';
        } else {
            document.getElementById('adultPriceDisplay').textContent = `¥${currentEvent.adult_price.toLocaleString()} / 人`;
        }
        
        if (!currentEvent.has_child_price) {
            document.getElementById('childCounterGroup').style.display = 'none';
        } else {
            document.getElementById('childPriceDisplay').textContent = `¥${currentEvent.child_price.toLocaleString()} / 人`;
        }
        
        // 料金計算を初期化
        updatePriceCalculation();
        
    } else {
        formContainer.style.display = 'none';
        closedMessage.style.display = 'flex';
    }
}

// カウンターボタンのセットアップ
function setupCounterButtons() {
    const counterBtns = document.querySelectorAll('.counter-btn');
    
    counterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            let value = parseInt(input.value) || 0;
            const min = parseInt(input.min) || 0;
            const max = parseInt(input.max) || 20;
            
            if (action === 'increase' && value < max) {
                value++;
            } else if (action === 'decrease' && value > min) {
                value--;
            }
            
            input.value = value;
            
            // 子供の年齢入力欄の表示制御
            const childCount = parseInt(document.getElementById('childCount').value) || 0;
            const childrenAgesSection = document.getElementById('childrenAgesSection');
            if (childCount > 0) {
                childrenAgesSection.style.display = 'block';
            } else {
                childrenAgesSection.style.display = 'none';
            }
            
            // 料金再計算
            updatePriceCalculation();
        });
    });
}

// 料金計算を更新
function updatePriceCalculation() {
    const adultCount = parseInt(document.getElementById('adultCount').value) || 0;
    const childCount = parseInt(document.getElementById('childCount').value) || 0;
    
    const adultPrice = currentEvent.has_adult_price ? currentEvent.adult_price : 0;
    const childPrice = currentEvent.has_child_price ? currentEvent.child_price : 0;
    
    const adultTotal = adultCount * adultPrice;
    const childTotal = childCount * childPrice;
    const total = adultTotal + childTotal;
    
    // 料金表示
    if (total > 0) {
        const priceSummary = document.getElementById('priceSummary');
        const priceBreakdown = document.getElementById('priceBreakdown');
        
        let breakdownHtml = '';
        if (adultCount > 0 && currentEvent.has_adult_price) {
            breakdownHtml += `
                <div class="price-row">
                    <span>大人 × ${adultCount}名</span>
                    <span>¥${adultTotal.toLocaleString()}</span>
                </div>
            `;
        }
        if (childCount > 0 && currentEvent.has_child_price) {
            breakdownHtml += `
                <div class="price-row">
                    <span>子供 × ${childCount}名</span>
                    <span>¥${childTotal.toLocaleString()}</span>
                </div>
            `;
        }
        
        priceBreakdown.innerHTML = breakdownHtml;
        document.getElementById('totalPrice').textContent = `¥${total.toLocaleString()}`;
        priceSummary.style.display = 'block';
    } else {
        document.getElementById('priceSummary').style.display = 'none';
    }
}

// フォーム送信のセットアップ
function setupFormSubmit() {
    const form = document.getElementById('eventReservationForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // バリデーション
        const adultCount = parseInt(document.getElementById('adultCount').value) || 0;
        const childCount = parseInt(document.getElementById('childCount').value) || 0;
        const totalParticipants = adultCount + childCount;
        
        if (totalParticipants === 0) {
            alert('参加人数を1名以上選択してください');
            return;
        }
        
        // 定員チェック
        const availableSlots = currentEvent.capacity - currentReservationCount;
        if (totalParticipants > availableSlots) {
            alert(`申し訳ございません。残席が${availableSlots}席のため、${totalParticipants}名のご予約はお受けできません。`);
            return;
        }
        
        // 子供の年齢チェック
        if (childCount > 0) {
            const childrenAges = document.getElementById('childrenAges').value.trim();
            if (!childrenAges) {
                alert('お子様の年齢を入力してください');
                return;
            }
        }
        
        // 送信確認
        if (!confirm('この内容で予約を送信してもよろしいですか？')) {
            return;
        }
        
        // 送信処理
        await submitReservation();
    });
}

// 予約を送信
async function submitReservation() {
    const submitBtn = document.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
        
        // フォームデータ取得
        const adultCount = parseInt(document.getElementById('adultCount').value) || 0;
        const childCount = parseInt(document.getElementById('childCount').value) || 0;
        const customerName = document.getElementById('customerName').value;
        const customerEmail = document.getElementById('customerEmail').value;
        const childrenAges = document.getElementById('childrenAges').value.trim();
        const notes = document.getElementById('notes').value.trim();
        
        // 料金計算
        const adultPrice = currentEvent.has_adult_price ? currentEvent.adult_price : 0;
        const childPrice = currentEvent.has_child_price ? currentEvent.child_price : 0;
        const totalPrice = (adultCount * adultPrice) + (childCount * childPrice);
        
        // 予約データ
        const reservationData = {
            event_id: currentEvent.id,
            event_name: currentEvent.event_name,
            customer_name: customerName,
            customer_email: customerEmail,
            adult_count: adultCount,
            child_count: childCount,
            children_ages: childrenAges,
            notes: notes,
            total_price: totalPrice,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        // データベースに保存
        const response = await fetch('tables/event_reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reservationData)
        });
        
        if (!response.ok) throw new Error('予約の保存に失敗しました');
        
        // メール送信
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> メール送信中...';
        await sendEmails(reservationData);
        
        // LINE通知送信
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> LINE通知送信中...';
        try {
            await sendLineNotification(reservationData);
        } catch (lineError) {
            console.warn('LINE通知に失敗しましたが、予約は完了しています', lineError);
        }
        
        // 完了ページへ遷移
        window.location.href = 'success.html';
        
    } catch (error) {
        console.error('予約送信エラー:', error);
        alert('予約の送信に失敗しました。もう一度お試しください。');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// メール送信
async function sendEmails(reservationData) {
    try {
        // イベント日時フォーマット
        const eventDateTime = formatDateTime(new Date(currentEvent.event_date));
        
        // 参加者情報
        let participantsInfo = '';
        if (reservationData.adult_count > 0) {
            participantsInfo += `大人：${reservationData.adult_count}名\n`;
        }
        if (reservationData.child_count > 0) {
            participantsInfo += `子供：${reservationData.child_count}名`;
            if (reservationData.children_ages) {
                participantsInfo += `（年齢：${reservationData.children_ages}）`;
            }
        }
        
        // 料金情報
        let priceInfo = '';
        if (reservationData.total_price > 0) {
            priceInfo = `合計金額：¥${reservationData.total_price.toLocaleString()}`;
        } else {
            priceInfo = '参加費：無料';
        }
        
        const emailData = {
            to_name: reservationData.customer_name,
            to_email: reservationData.customer_email,
            event_name: reservationData.event_name,
            event_date_time: eventDateTime,
            customer_name: reservationData.customer_name,
            customer_email: reservationData.customer_email,
            participants_info: participantsInfo,
            price_info: priceInfo,
            notes: reservationData.notes || '特になし'
        };
        
        // 顧客向けメール
        await emailjs.send('okui__yoyaku', 'template_event_customer', emailData);
        
        // 管理者向けメール
        await emailjs.send('okui__yoyaku', 'template_event_admin', emailData);
        
        console.log('メール送信成功');
        
    } catch (error) {
        console.error('メール送信エラー:', error);
        // メール送信失敗してもエラーにしない（予約自体は成功）
    }
}

// LINE通知送信
async function sendLineNotification(reservationData) {
    const WORKER_URL = 'https://okui-tatami-line-notify.okuitatami.workers.dev';
    
    console.log('📱 LINE通知送信開始...');
    
    try {
        // イベント日時フォーマット
        const eventDateTime = formatDateTime(new Date(currentEvent.event_date));
        
        // LINE通知用データ
        const lineData = {
            type: 'event',
            event_name: currentEvent.event_name,
            event_date: eventDateTime,
            name: reservationData.customer_name,
            email: reservationData.customer_email,
            phone: reservationData.customer_phone || '',
            adult_count: reservationData.adult_count,
            child_count: reservationData.child_count,
            child_ages: reservationData.children_ages || '',
            total_price: reservationData.total_price,
            notes: reservationData.notes || ''
        };
        
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(lineData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ LINE通知送信成功:', result);
            return true;
        } else {
            console.error('❌ LINE通知送信失敗:', result);
            return false;
        }
    } catch (error) {
        console.error('❌ LINE通知エラー:', error);
        return false;
    }
}

// 日時フォーマット
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日(${weekday}) ${hours}:${minutes}`;
}

// 日付フォーマット（時間なし）
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}/${month}/${day}`;
}

// エラー表示
function showError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'flex';
}
