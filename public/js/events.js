// イベント一覧表示JavaScript

let allEvents = [];

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', async () => {
    await loadEvents();
});

// イベント一覧を読み込み
async function loadEvents() {
    const loading = document.getElementById('loading');
    const noEvents = document.getElementById('noEvents');
    const eventsList = document.getElementById('eventsList');

    try {
        loading.style.display = 'flex';
        
        const response = await fetch('tables/events?limit=100&sort=-created_at');
        const data = await response.json();
        
        allEvents = data.data || [];
        
        loading.style.display = 'none';
        
        if (allEvents.length === 0) {
            noEvents.style.display = 'flex';
            return;
        }
        
        // 現在時刻
        const now = new Date();
        
        // イベントを分類
        const newEvents = [];
        const recruitingEvents = [];
        const fullEvents = [];
        const closedEvents = [];
        const completedEvents = [];
        
        for (const event of allEvents) {
            // 予約数を取得
            const reservationCount = await getReservationCount(event.id);
            const availableSlots = event.capacity - reservationCount;
            
            // イベント日時
            const eventDate = new Date(event.event_date);
            const recruitmentStart = new Date(event.recruitment_start);
            const recruitmentEnd = new Date(event.recruitment_end);
            
            // ステータス判定
            if (event.status === 'completed' || eventDate < now) {
                completedEvents.push({ ...event, availableSlots, reservationCount });
            } else if (event.status === 'closed' || now > recruitmentEnd) {
                closedEvents.push({ ...event, availableSlots, reservationCount });
            } else if (event.status === 'full' || availableSlots <= 0) {
                fullEvents.push({ ...event, availableSlots, reservationCount });
            } else if (now >= recruitmentStart && now <= recruitmentEnd && event.status === 'published') {
                // 新着判定（公開後7日以内）
                const daysSincePublished = (now - new Date(event.created_at)) / (1000 * 60 * 60 * 24);
                if (daysSincePublished <= 7) {
                    newEvents.push({ ...event, availableSlots, reservationCount });
                } else {
                    recruitingEvents.push({ ...event, availableSlots, reservationCount });
                }
            }
        }
        
        // イベントを描画
        let html = '';
        
        // 新着イベント
        if (newEvents.length > 0) {
            html += renderEventSection('新着', 'new', newEvents);
        }
        
        // 募集中イベント
        if (recruitingEvents.length > 0) {
            html += renderEventSection('募集中', 'recruiting', recruitingEvents);
        }
        
        // 満員イベント
        if (fullEvents.length > 0) {
            html += renderEventSection('募集締切（満員）', 'full', fullEvents);
        }
        
        // 募集終了イベント
        if (closedEvents.length > 0) {
            html += renderEventSection('募集締切', 'closed', closedEvents);
        }
        
        // 終了イベント
        if (completedEvents.length > 0) {
            html += renderEventSection('終了', 'completed', completedEvents);
        }
        
        eventsList.innerHTML = html;
        
        // イベントなし
        if (newEvents.length === 0 && recruitingEvents.length === 0 && fullEvents.length === 0 && closedEvents.length === 0 && completedEvents.length === 0) {
            noEvents.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('イベント読み込みエラー:', error);
        loading.style.display = 'none';
        noEvents.style.display = 'flex';
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
        
        // 大人と子供の合計人数
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

// イベントセクションを描画
function renderEventSection(title, type, events) {
    let html = `
        <div class="event-section">
            <h3 class="event-section-title">${title}</h3>
            <div class="event-cards">
    `;
    
    events.forEach(event => {
        html += renderEventCard(event, type);
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// イベントカードを描画
function renderEventCard(event, type) {
    const eventDate = new Date(event.event_date);
    const recruitmentEnd = new Date(event.recruitment_end);
    
    // 日付フォーマット
    const eventDateStr = formatDate(eventDate);
    const recruitmentStr = `${formatDate(new Date(event.recruitment_start))} 〜 ${formatDate(recruitmentEnd)}`;
    
    // ステータスバッジ
    let statusBadge = '';
    let clickable = true;
    
    if (type === 'new') {
        statusBadge = '<span class="event-badge new">新着</span>';
    } else if (type === 'recruiting') {
        statusBadge = '<span class="event-badge recruiting">募集中</span>';
    } else if (type === 'full') {
        statusBadge = '<span class="event-badge full">満員御礼</span>';
        clickable = false;
    } else if (type === 'closed') {
        statusBadge = '<span class="event-badge closed">募集締切</span>';
        clickable = false;
    } else if (type === 'completed') {
        statusBadge = '<span class="event-badge completed">終了</span>';
        clickable = false;
    }
    
    // 残席表示
    let slotsInfo = '';
    if (type === 'new' || type === 'recruiting') {
        if (event.availableSlots <= 5 && event.availableSlots > 0) {
            slotsInfo = `<p class="slots-warning"><i class="fas fa-exclamation-triangle"></i> 残り${event.availableSlots}席</p>`;
        } else if (event.availableSlots > 5) {
            slotsInfo = `<p class="slots-available"><i class="fas fa-check-circle"></i> 残り${event.availableSlots}席</p>`;
        }
    }
    
    return `
        <div class="event-card ${clickable ? 'clickable' : 'not-clickable'}" ${clickable ? `onclick="location.href='event-detail.html?id=${event.id}'"` : ''}>
            ${event.image_url ? `
                <div class="event-card-image">
                    <img src="${event.image_url}" alt="${event.event_name}">
                </div>
            ` : ''}
            <div class="event-card-content">
                <div class="event-card-header">
                    <h4 class="event-card-title">${event.event_name}</h4>
                    ${statusBadge}
                </div>
                <div class="event-card-description">
                    ${truncateText(stripHtml(event.description || ''), 100)}
                </div>
                <div class="event-card-info">
                    <p><i class="fas fa-calendar-alt"></i> <strong>開催日時：</strong>${eventDateStr}</p>
                    <p><i class="fas fa-clock"></i> <strong>所要時間：</strong>${event.duration || '未定'}</p>
                    <p><i class="fas fa-hourglass-half"></i> <strong>募集期間：</strong>${recruitmentStr}</p>
                    ${slotsInfo}
                </div>
                ${clickable ? `
                    <button class="btn btn-primary btn-event-detail">
                        詳細を見る <i class="fas fa-arrow-right"></i>
                    </button>
                ` : `
                    <div class="event-closed-notice">
                        ${type === 'completed' ? 'このイベントは終了しました' : 'このイベントは募集を締め切りました'}
                    </div>
                `}
            </div>
        </div>
    `;
}

// 日付フォーマット
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日(${weekday}) ${hours}:${minutes}`;
}

// HTMLタグを除去
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// テキストを切り詰め
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
