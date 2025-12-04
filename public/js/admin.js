// タブ切り替え
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // ナビゲーションボタンのアクティブ状態を更新
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // タブコンテンツの表示を切り替え
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // タブごとのデータを読み込み
        if (tabName === 'reservations') {
            loadReservations();
        } else if (tabName === 'calendar') {
            renderCalendarView();
        } else if (tabName === 'schedule') {
            generateTimeSlots();
            loadExistingSchedules();
        } else if (tabName === 'events') {
            loadEventsAdmin();
        } else if (tabName === 'event-reservations') {
            loadEventReservations();
            loadEventsForFilter();
        }
    });
});

// 予約一覧の読み込み
let allReservations = [];

async function loadReservations() {
    const container = document.getElementById('reservationsList');
    container.innerHTML = '<div class="loading">読み込み中...</div>';
    
    try {
        const response = await fetch('tables/reservations?limit=1000&sort=-created_at');
        const data = await response.json();
        allReservations = data.data || [];
        
        displayReservations(allReservations);
    } catch (error) {
        console.error('予約データの読み込みエラー:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>データの読み込みに失敗しました</p></div>';
    }
}

function displayReservations(reservations) {
    const container = document.getElementById('reservationsList');
    
    if (reservations.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>予約はまだありません</p></div>';
        return;
    }
    
    container.innerHTML = reservations.map(reservation => {
        const typeLabel = getTypeLabel(reservation.reservation_type);
        const statusLabel = getStatusLabel(reservation.status || 'pending');
        
        let detailsHtml = '';
        if (reservation.workshop_type) {
            const workshopLabel = getWorkshopLabel(reservation.workshop_type);
            detailsHtml = `
                <div class="info-item">
                    <i class="fas fa-palette"></i>
                    <div>
                        <strong>ワークショップ</strong>
                        ${workshopLabel}${reservation.workshop_option ? ` (${getWorkshopOptionLabel(reservation.workshop_option)})` : ''}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="reservation-card" data-id="${reservation.id}">
                <div class="reservation-header">
                    <div>
                        <span class="reservation-type ${reservation.reservation_type}">${typeLabel}</span>
                        <span class="reservation-status ${reservation.status || 'pending'}">${statusLabel}</span>
                    </div>
                    <button class="btn-delete-small" onclick="deleteReservation('${reservation.id}', event)" title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="reservation-info">
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <strong>予約日時</strong>
                            ${reservation.reservation_date} ${reservation.reservation_time}
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <div>
                            <strong>お客様</strong>
                            ${reservation.name}
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <div>
                            <strong>電話番号</strong>
                            ${reservation.phone}
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <div>
                            <strong>メール</strong>
                            ${reservation.email}
                        </div>
                    </div>
                    ${detailsHtml}
                </div>
            </div>
        `;
    }).join('');
    
    // 予約カードのクリックイベント
    container.querySelectorAll('.reservation-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const reservation = allReservations.find(r => r.id === id);
            showReservationDetails(reservation);
        });
    });
}

// フィルター機能
document.getElementById('typeFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);

function applyFilters() {
    const typeFilter = document.getElementById('typeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = allReservations;
    
    if (typeFilter !== 'all') {
        filtered = filtered.filter(r => r.reservation_type === typeFilter);
    }
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(r => (r.status || 'pending') === statusFilter);
    }
    
    displayReservations(filtered);
}

// 予約詳細モーダル
function showReservationDetails(reservation) {
    const modal = document.getElementById('reservationModal');
    const modalBody = document.getElementById('modalBody');
    const statusSelect = document.getElementById('modalStatusSelect');
    
    const typeLabel = getTypeLabel(reservation.reservation_type);
    let workshopHtml = '';
    
    if (reservation.workshop_type) {
        const workshopLabel = getWorkshopLabel(reservation.workshop_type);
        const optionLabel = reservation.workshop_option ? getWorkshopOptionLabel(reservation.workshop_option) : '';
        workshopHtml = `
            <div class="modal-info-item">
                <strong>ワークショップ種類</strong>
                <p>${workshopLabel}</p>
            </div>
            ${optionLabel ? `
            <div class="modal-info-item">
                <strong>オプション</strong>
                <p>${optionLabel}</p>
            </div>` : ''}
            ${(reservation.participants_children !== undefined || reservation.participants_adults !== undefined) ? `
            <div class="modal-info-item">
                <strong>参加人数</strong>
                <p>子ども（小学4年生以上）: ${reservation.participants_children || 0}名<br>大人（中学生以上）: ${reservation.participants_adults || 0}名</p>
            </div>` : ''}
        `;
    }
    
    // 来店の場合の参加人数
    let visitParticipantsHtml = '';
    if (reservation.reservation_type === 'visit' && (reservation.participants_children || reservation.participants_adults)) {
        visitParticipantsHtml = `
            <div class="modal-info-item">
                <strong>来店人数</strong>
                <p>子ども: ${reservation.participants_children || 0}名<br>大人: ${reservation.participants_adults || 0}名</p>
            </div>
        `;
    }
    
    modalBody.innerHTML = `
        <div class="modal-info-item">
            <strong>予約タイプ</strong>
            <p>${typeLabel}</p>
        </div>
        <div class="modal-info-item">
            <strong>予約日時</strong>
            <p>${reservation.reservation_date} ${reservation.reservation_time}</p>
        </div>
        <div class="modal-info-item">
            <strong>お客様氏名</strong>
            <p>${reservation.name}</p>
        </div>
        <div class="modal-info-item">
            <strong>電話番号</strong>
            <p>${reservation.phone}</p>
        </div>
        <div class="modal-info-item">
            <strong>メールアドレス</strong>
            <p>${reservation.email}</p>
        </div>
        <div class="modal-info-item">
            <strong>住所</strong>
            <p>${reservation.address || '未入力'}</p>
        </div>
        ${workshopHtml}
        ${visitParticipantsHtml}
        ${reservation.request_content ? `
        <div class="modal-info-item">
            <strong>依頼内容</strong>
            <p>${reservation.request_content}</p>
        </div>` : ''}
        ${reservation.concerns ? `
        <div class="modal-info-item">
            <strong>懸念点・聞いてみたいこと</strong>
            <p>${reservation.concerns}</p>
        </div>` : ''}
    `;
    
    statusSelect.value = reservation.status || 'pending';
    
    // ステータス更新ボタン
    document.getElementById('updateStatusBtn').onclick = () => updateReservationStatus(reservation.id);
    
    // 削除ボタン
    document.getElementById('deleteReservationBtn').onclick = () => deleteReservation(reservation.id);
    
    modal.classList.add('active');
}

// モーダルを閉じる
document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('reservationModal').classList.remove('active');
});

document.getElementById('reservationModal').addEventListener('click', (e) => {
    if (e.target.id === 'reservationModal') {
        document.getElementById('reservationModal').classList.remove('active');
    }
});

// ステータス更新
async function updateReservationStatus(reservationId) {
    const newStatus = document.getElementById('modalStatusSelect').value;
    
    try {
        const response = await fetch(`tables/reservations/${reservationId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            alert('ステータスを更新しました');
            document.getElementById('reservationModal').classList.remove('active');
            loadReservations();
        } else {
            alert('更新に失敗しました');
        }
    } catch (error) {
        console.error('ステータス更新エラー:', error);
        alert('エラーが発生しました');
    }
}

// 予約削除
async function deleteReservation(reservationId, event) {
    // カード全体のクリックイベントを防止
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('この予約を削除してもよろしいですか？\nこの操作は取り消せません。')) {
        return;
    }
    
    try {
        const response = await fetch(`tables/reservations/${reservationId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            alert('予約を削除しました');
            // モーダルが開いていれば閉じる
            const modal = document.getElementById('reservationModal');
            if (modal && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
            loadReservations();
        } else {
            alert('削除に失敗しました');
        }
    } catch (error) {
        console.error('予約削除エラー:', error);
        alert('エラーが発生しました');
    }
}

// 時間枠生成（9:00〜18:00、30分刻み）
function generateTimeSlots() {
    const container = document.getElementById('timeSlots');
    const slots = [];
    
    for (let hour = 9; hour <= 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            if (hour === 18 && minute > 0) break; // 18:00まで
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            slots.push(time);
        }
    }
    
    container.innerHTML = slots.map(time => `
        <div class="time-slot">
            <input type="checkbox" id="slot-${time}" value="${time}">
            <label for="slot-${time}">${time}</label>
        </div>
    `).join('');
}

// 日程保存
document.getElementById('saveScheduleBtn').addEventListener('click', async () => {
    const date = document.getElementById('scheduleDate').value;
    const reservationType = document.getElementById('reservationType').value;
    
    if (!date) {
        alert('日付を選択してください');
        return;
    }
    
    const selectedTimes = Array.from(document.querySelectorAll('#timeSlots input:checked'))
        .map(input => input.value);
    
    if (selectedTimes.length === 0) {
        alert('時間枠を選択してください');
        return;
    }
    
    try {
        const slots = selectedTimes.map(time => ({
            date,
            time,
            is_available: true,
            reservation_type: reservationType
        }));
        
        // 複数の時間枠を個別に登録（重複を防ぐため最初のfetchを削除）
        let successCount = 0;
        for (const slot of slots) {
            try {
                await fetch('tables/available_slots', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(slot)
                });
                successCount++;
            } catch (err) {
                console.error('個別登録エラー:', err);
            }
        }
        
        alert(`${successCount}件の時間枠を登録しました`);
        
        // チェックボックスをリセット
        document.querySelectorAll('#timeSlots input:checked').forEach(input => {
            input.checked = false;
        });
        
        loadExistingSchedules();
    } catch (error) {
        console.error('日程保存エラー:', error);
        alert('保存に失敗しました');
    }
});

// 登録済み日程の読み込み
async function loadExistingSchedules() {
    const container = document.getElementById('existingSchedulesList');
    container.innerHTML = '<div class="loading">読み込み中...</div>';
    
    try {
        const response = await fetch('tables/available_slots?limit=1000&sort=date,time');
        const data = await response.json();
        const slots = data.data || [];
        
        if (slots.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>登録済みの日程はありません</p></div>';
            return;
        }
        
        // 日付ごとにグループ化
        const groupedByDate = {};
        slots.forEach(slot => {
            if (!groupedByDate[slot.date]) {
                groupedByDate[slot.date] = [];
            }
            groupedByDate[slot.date].push(slot);
        });
        
        container.innerHTML = Object.keys(groupedByDate).sort().reverse().map(date => {
            const dateSlots = groupedByDate[date];
            return `
                <div class="schedule-date-group">
                    <h4>${date} (${dateSlots.length}件)</h4>
                    <div class="schedule-slots">
                        ${dateSlots.map(slot => {
                            const typeLabel = getReservationTypeLabel(slot.reservation_type);
                            const typeClass = getReservationTypeClass(slot.reservation_type);
                            return `
                                <div class="schedule-slot-item">
                                    <div class="slot-info">
                                        <span class="slot-time">${slot.time}</span>
                                        <span class="slot-type ${typeClass}">${typeLabel}</span>
                                    </div>
                                    <button class="delete-slot" data-id="${slot.id}">削除</button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        // 削除ボタンのイベント
        container.querySelectorAll('.delete-slot').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const slotId = e.target.dataset.id;
                if (confirm('この時間枠を削除しますか？')) {
                    await deleteTimeSlot(slotId);
                }
            });
        });
    } catch (error) {
        console.error('日程読み込みエラー:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>データの読み込みに失敗しました</p></div>';
    }
}

// 時間枠削除
async function deleteTimeSlot(slotId) {
    try {
        await fetch(`tables/available_slots/${slotId}`, {
            method: 'DELETE'
        });
        alert('時間枠を削除しました');
        loadExistingSchedules();
    } catch (error) {
        console.error('削除エラー:', error);
        alert('削除に失敗しました');
    }
}

// ラベル変換関数
function getTypeLabel(type) {
    const labels = {
        estimate: '見積依頼',
        workshop: 'ワークショップ',
        visit: '来店予約'
    };
    return labels[type] || type;
}

function getStatusLabel(status) {
    const labels = {
        pending: '保留中',
        confirmed: '確認済み',
        completed: '完了',
        cancelled: 'キャンセル'
    };
    return labels[status] || status;
}

function getWorkshopLabel(type) {
    const labels = {
        mini_tatami: 'ミニ畳作り体験',
        rose: '畳縁で薔薇づくり体験',
        hand_sewing: '畳手縫い体験',
        mat_sewing: 'ゴザ手縫い体験'
    };
    return labels[type] || type;
}

function getWorkshopOptionLabel(option) {
    const labels = {
        tacker: 'タッカー',
        hand_sewing: '手縫い',
        onsite: 'その場で体験',
        takeaway: '畳を持ち帰る'
    };
    return labels[option] || option;
}

function getReservationTypeLabel(type) {
    const labels = {
        all: 'すべて',
        estimate: '見積のみ',
        workshop: 'ワークショップのみ',
        visit: '来店のみ'
    };
    return labels[type] || type;
}

function getReservationTypeClass(type) {
    return `type-${type}`;
}

// カレンダー表示機能
let calendarViewYear = new Date().getFullYear();
let calendarViewMonth = new Date().getMonth();
let calendarReservations = [];

async function renderCalendarView() {
    // 予約データを取得
    try {
        const response = await fetch('tables/reservations?limit=1000');
        const data = await response.json();
        calendarReservations = (data.data || []).filter(r => r.status !== 'cancelled');
    } catch (error) {
        console.error('予約データ取得エラー:', error);
        calendarReservations = [];
    }
    
    updateCalendarDisplay();
    
    // 月送りボタンのイベント
    document.getElementById('prevMonthBtn').onclick = () => {
        calendarViewMonth--;
        if (calendarViewMonth < 0) {
            calendarViewMonth = 11;
            calendarViewYear--;
        }
        updateCalendarDisplay();
    };
    
    document.getElementById('nextMonthBtn').onclick = () => {
        calendarViewMonth++;
        if (calendarViewMonth > 11) {
            calendarViewMonth = 0;
            calendarViewYear++;
        }
        updateCalendarDisplay();
    };
}

function updateCalendarDisplay() {
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    document.getElementById('currentMonthDisplay').textContent = `${calendarViewYear}年 ${monthNames[calendarViewMonth]}`;
    
    const firstDay = new Date(calendarViewYear, calendarViewMonth, 1);
    const lastDay = new Date(calendarViewYear, calendarViewMonth + 1, 0);
    const prevLastDay = new Date(calendarViewYear, calendarViewMonth, 0);
    
    const firstDayIndex = firstDay.getDay();
    const lastDayDate = lastDay.getDate();
    const prevLastDayDate = prevLastDay.getDate();
    
    const grid = document.getElementById('calendarGrid');
    let gridHTML = '';
    
    // 前月の日付
    for (let i = firstDayIndex; i > 0; i--) {
        gridHTML += `<div class="calendar-day-box other-month">${prevLastDayDate - i + 1}</div>`;
    }
    
    // 今月の日付
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (let day = 1; day <= lastDayDate; day++) {
        const dateStr = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        
        // この日の予約を取得
        const dayReservations = calendarReservations.filter(r => r.reservation_date === dateStr);
        
        let dayClass = 'calendar-day-box';
        if (isToday) dayClass += ' today';
        
        let reservationsHTML = '';
        if (dayReservations.length > 0) {
            reservationsHTML = dayReservations.map(r => {
                const typeClass = r.reservation_type || 'estimate';
                const typeLabel = getTypeLabel(r.reservation_type);
                return `<div class="reservation-badge ${typeClass}" title="${r.name} - ${r.reservation_time}">${r.reservation_time}</div>`;
            }).join('');
        }
        
        gridHTML += `
            <div class="${dayClass}">
                <div class="day-number">${day}</div>
                <div class="day-reservations">${reservationsHTML}</div>
            </div>
        `;
    }
    
    // 次月の日付
    const remainingDays = 42 - (firstDayIndex + lastDayDate);
    for (let day = 1; day <= remainingDays; day++) {
        gridHTML += `<div class="calendar-day-box other-month">${day}</div>`;
    }
    
    grid.innerHTML = gridHTML;
}

// 初期読み込み
loadReservations();

// ========================================
// イベント管理機能
// ========================================

let allEvents = [];
let allEventReservations = [];
let currentEditingEvent = null;

// イベント一覧読み込み
async function loadEventsAdmin() {
    const container = document.getElementById('eventsList');
    container.innerHTML = '<div class="loading">読み込み中...</div>';
    
    try {
        const response = await fetch('tables/events?limit=1000&sort=-created_at');
        const data = await response.json();
        allEvents = data.data || [];
        
        displayEventsAdmin(allEvents);
    } catch (error) {
        console.error('イベント読み込みエラー:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>データの読み込みに失敗しました</p></div>';
    }
}

function displayEventsAdmin(events) {
    const container = document.getElementById('eventsList');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>イベントはまだありません</p></div>';
        return;
    }
    
    container.innerHTML = events.map(event => {
        const statusLabel = getEventStatusLabel(event.status);
        const eventDate = new Date(event.event_date);
        const eventDateStr = formatDateTimeJa(eventDate);
        
        // 予約数取得（非同期だが表示は同期的に）
        getEventReservationCount(event.id).then(count => {
            const countEl = document.querySelector(`[data-event-id="${event.id}"] .reservation-count`);
            if (countEl) countEl.textContent = `${count}/${event.capacity}名`;
        });
        
        return `
            <div class="event-admin-card" data-event-id="${event.id}">
                <div class="event-admin-header">
                    <div class="event-admin-title">
                        <h3>${event.event_name}</h3>
                        <div class="event-admin-badges">
                            <span class="reservation-status ${event.status}">${statusLabel}</span>
                        </div>
                    </div>
                </div>
                <div class="event-admin-info">
                    <div class="event-admin-info-item">
                        <i class="fas fa-calendar-alt"></i>
                        <div>${eventDateStr}</div>
                    </div>
                    <div class="event-admin-info-item">
                        <i class="fas fa-clock"></i>
                        <div>${event.duration || '未設定'}</div>
                    </div>
                    <div class="event-admin-info-item">
                        <i class="fas fa-users"></i>
                        <div>定員: ${event.capacity}名</div>
                    </div>
                    <div class="event-admin-info-item">
                        <i class="fas fa-ticket-alt"></i>
                        <div class="reservation-count">読込中...</div>
                    </div>
                </div>
                <div class="event-admin-actions">
                    <button class="btn btn-primary btn-sm" onclick="editEvent('${event.id}')">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEvent('${event.id}')">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// イベント予約数取得
async function getEventReservationCount(eventId) {
    try {
        const response = await fetch('tables/event_reservations?limit=1000');
        const data = await response.json();
        const reservations = (data.data || []).filter(r => r.event_id === eventId && r.status !== 'cancelled');
        
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

// イベント作成ボタン
document.getElementById('createEventBtn').addEventListener('click', () => {
    openEventModal();
});

// イベントモーダルを開く
function openEventModal(event = null) {
    const modal = document.getElementById('eventModal');
    const title = document.getElementById('eventModalTitle');
    const form = document.getElementById('eventForm');
    
    currentEditingEvent = event;
    
    if (event) {
        // 編集モード
        title.textContent = 'イベント編集';
        document.getElementById('eventFormId').value = event.id;
        document.getElementById('eventFormName').value = event.event_name;
        document.getElementById('eventFormDescription').value = event.description || '';
        document.getElementById('eventFormImage').value = event.image_url || '';
        document.getElementById('eventFormDate').value = event.event_date.substring(0, 16);
        document.getElementById('eventFormDuration').value = event.duration || '';
        document.getElementById('eventFormTargetAge').value = event.target_age || '';
        document.getElementById('eventFormCapacity').value = event.capacity;
        
        // 料金設定の処理
        const separatePrices = event.has_adult_price || event.has_child_price;
        document.getElementById('eventFormSeparatePrices').checked = separatePrices;
        document.getElementById('separatePricesSection').style.display = separatePrices ? 'block' : 'none';
        
        if (separatePrices) {
            document.getElementById('eventFormAdultPrice').value = event.adult_price || '';
            document.getElementById('eventFormChildPrice').value = event.child_price || '';
            document.getElementById('eventFormCommonPrice').value = 0;
        } else {
            document.getElementById('eventFormCommonPrice').value = event.adult_price || 0;
            document.getElementById('eventFormAdultPrice').value = '';
            document.getElementById('eventFormChildPrice').value = '';
        }
        
        document.getElementById('eventFormRecruitmentStart').value = event.recruitment_start.substring(0, 16);
        document.getElementById('eventFormRecruitmentEnd').value = event.recruitment_end.substring(0, 16);
        document.getElementById('eventFormStatus').value = event.status;
    } else {
        // 新規作成モード
        title.textContent = '新規イベント作成';
        form.reset();
        document.getElementById('eventFormId').value = '';
        document.getElementById('separatePricesSection').style.display = 'none';
        document.getElementById('eventFormStatus').value = 'draft';
        document.getElementById('eventFormCommonPrice').value = 0;
    }
    
    modal.classList.add('active');
}

// 料金設定チェックボックスのイベント
document.getElementById('eventFormSeparatePrices').addEventListener('change', (e) => {
    document.getElementById('separatePricesSection').style.display = e.target.checked ? 'block' : 'none';
    if (e.target.checked) {
        // 分ける場合、共通料金をクリア
        document.getElementById('eventFormCommonPrice').value = 0;
    } else {
        // 分けない場合、個別料金をクリア
        document.getElementById('eventFormAdultPrice').value = '';
        document.getElementById('eventFormChildPrice').value = '';
    }
});

// イベントモーダルを閉じる
document.getElementById('eventModalClose').addEventListener('click', () => {
    document.getElementById('eventModal').classList.remove('active');
});

document.getElementById('cancelEventBtn').addEventListener('click', () => {
    document.getElementById('eventModal').classList.remove('active');
});

// イベントフォーム送信
document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const eventId = document.getElementById('eventFormId').value;
    const separatePrices = document.getElementById('eventFormSeparatePrices').checked;
    
    let adultPrice, childPrice, hasAdultPrice, hasChildPrice;
    
    if (separatePrices) {
        // 個別料金
        adultPrice = parseFloat(document.getElementById('eventFormAdultPrice').value) || 0;
        childPrice = parseFloat(document.getElementById('eventFormChildPrice').value) || 0;
        hasAdultPrice = true;
        hasChildPrice = true;
    } else {
        // 共通料金
        const commonPrice = parseFloat(document.getElementById('eventFormCommonPrice').value) || 0;
        adultPrice = commonPrice;
        childPrice = commonPrice;
        hasAdultPrice = commonPrice > 0;
        hasChildPrice = commonPrice > 0;
    }
    
    const eventData = {
        event_name: document.getElementById('eventFormName').value,
        description: document.getElementById('eventFormDescription').value,
        image_url: document.getElementById('eventFormImage').value || null,
        event_date: new Date(document.getElementById('eventFormDate').value).toISOString(),
        duration: document.getElementById('eventFormDuration').value,
        target_age: document.getElementById('eventFormTargetAge').value,
        capacity: parseInt(document.getElementById('eventFormCapacity').value),
        has_adult_price: hasAdultPrice,
        adult_price: adultPrice,
        has_child_price: hasChildPrice,
        child_price: childPrice,
        recruitment_start: new Date(document.getElementById('eventFormRecruitmentStart').value).toISOString(),
        recruitment_end: new Date(document.getElementById('eventFormRecruitmentEnd').value).toISOString(),
        status: document.getElementById('eventFormStatus').value,
        updated_at: new Date().toISOString()
    };
    
    if (!eventId) {
        eventData.created_at = new Date().toISOString();
    }
    
    try {
        let response;
        if (eventId) {
            // 更新
            response = await fetch(`tables/events/${eventId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(eventData)
            });
        } else {
            // 新規作成
            response = await fetch('tables/events', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(eventData)
            });
        }
        
        if (response.ok) {
            alert(eventId ? 'イベントを更新しました' : 'イベントを作成しました');
            document.getElementById('eventModal').classList.remove('active');
            loadEventsAdmin();
        } else {
            alert('保存に失敗しました');
        }
    } catch (error) {
        console.error('イベント保存エラー:', error);
        alert('エラーが発生しました');
    }
});

// イベント編集
async function editEvent(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (event) {
        openEventModal(event);
    }
}

// イベント削除
async function deleteEvent(eventId) {
    if (!confirm('このイベントを削除してもよろしいですか？\n関連する予約も削除されます。')) {
        return;
    }
    
    try {
        const response = await fetch(`tables/events/${eventId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            alert('イベントを削除しました');
            loadEventsAdmin();
        } else {
            alert('削除に失敗しました');
        }
    } catch (error) {
        console.error('イベント削除エラー:', error);
        alert('エラーが発生しました');
    }
}

// イベント予約一覧読み込み
async function loadEventReservations() {
    const container = document.getElementById('eventReservationsList');
    container.innerHTML = '<div class="loading">読み込み中...</div>';
    
    try {
        const response = await fetch('tables/event_reservations?limit=1000&sort=-created_at');
        const data = await response.json();
        allEventReservations = data.data || [];
        
        displayEventReservations(allEventReservations);
    } catch (error) {
        console.error('イベント予約読み込みエラー:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>データの読み込みに失敗しました</p></div>';
    }
}

// フィルター用イベント一覧読み込み
async function loadEventsForFilter() {
    try {
        const response = await fetch('tables/events?limit=1000');
        const data = await response.json();
        const events = data.data || [];
        
        const select = document.getElementById('filterEventSelect');
        select.innerHTML = '<option value="">すべてのイベント</option>';
        events.forEach(event => {
            select.innerHTML += `<option value="${event.id}">${event.event_name}</option>`;
        });
    } catch (error) {
        console.error('イベント読み込みエラー:', error);
    }
}

// フィルター適用
document.getElementById('filterEventSelect')?.addEventListener('change', applyEventReservationFilters);
document.getElementById('filterEventStatus')?.addEventListener('change', applyEventReservationFilters);

function applyEventReservationFilters() {
    const eventFilter = document.getElementById('filterEventSelect').value;
    const statusFilter = document.getElementById('filterEventStatus').value;
    
    let filtered = allEventReservations;
    
    if (eventFilter) {
        filtered = filtered.filter(r => r.event_id === eventFilter);
    }
    
    if (statusFilter) {
        filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    displayEventReservations(filtered);
}

function displayEventReservations(reservations) {
    const container = document.getElementById('eventReservationsList');
    
    if (reservations.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>イベント予約はまだありません</p></div>';
        return;
    }
    
    container.innerHTML = reservations.map(reservation => {
        const statusLabel = getStatusLabel(reservation.status);
        const totalParticipants = (reservation.adult_count || 0) + (reservation.child_count || 0);
        
        return `
            <div class="reservation-card" data-id="${reservation.id}" onclick="showEventReservationDetails('${reservation.id}')">
                <div class="reservation-header">
                    <div>
                        <span class="reservation-type estimate">${reservation.event_name}</span>
                        <span class="reservation-status ${reservation.status}">${statusLabel}</span>
                    </div>
                </div>
                <div class="reservation-info">
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <div>
                            <strong>予約者</strong>
                            ${reservation.customer_name}
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <div>
                            <strong>メール</strong>
                            ${reservation.customer_email}
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <div>
                            <strong>参加人数</strong>
                            合計${totalParticipants}名 (大人:${reservation.adult_count || 0}, 子供:${reservation.child_count || 0})
                        </div>
                    </div>
                    ${reservation.total_price > 0 ? `
                    <div class="info-item">
                        <i class="fas fa-yen-sign"></i>
                        <div>
                            <strong>料金</strong>
                            ¥${reservation.total_price.toLocaleString()}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// イベント予約詳細表示
function showEventReservationDetails(reservationId) {
    const reservation = allEventReservations.find(r => r.id === reservationId);
    if (!reservation) return;
    
    const modal = document.getElementById('eventReservationModal');
    const modalBody = document.getElementById('eventReservationModalBody');
    const statusSelect = document.getElementById('eventReservationStatusSelect');
    
    const totalParticipants = (reservation.adult_count || 0) + (reservation.child_count || 0);
    
    modalBody.innerHTML = `
        <div class="modal-info-item">
            <strong>イベント名</strong>
            <p>${reservation.event_name}</p>
        </div>
        <div class="modal-info-item">
            <strong>予約者名</strong>
            <p>${reservation.customer_name}</p>
        </div>
        <div class="modal-info-item">
            <strong>メールアドレス</strong>
            <p>${reservation.customer_email}</p>
        </div>
        <div class="modal-info-item">
            <strong>参加人数</strong>
            <p>大人: ${reservation.adult_count || 0}名<br>子供: ${reservation.child_count || 0}名<br>合計: ${totalParticipants}名</p>
        </div>
        ${reservation.children_ages ? `
        <div class="modal-info-item">
            <strong>お子様の年齢</strong>
            <p>${reservation.children_ages}</p>
        </div>
        ` : ''}
        ${reservation.total_price > 0 ? `
        <div class="modal-info-item">
            <strong>合計金額</strong>
            <p>¥${reservation.total_price.toLocaleString()}</p>
        </div>
        ` : ''}
        ${reservation.notes ? `
        <div class="modal-info-item">
            <strong>備考</strong>
            <p>${reservation.notes}</p>
        </div>
        ` : ''}
        <div class="modal-info-item">
            <strong>予約日時</strong>
            <p>${new Date(reservation.created_at).toLocaleString('ja-JP')}</p>
        </div>
    `;
    
    statusSelect.value = reservation.status;
    
    document.getElementById('updateEventReservationStatusBtn').onclick = () => updateEventReservationStatus(reservationId);
    document.getElementById('deleteEventReservationBtn').onclick = () => deleteEventReservation(reservationId);
    
    modal.classList.add('active');
}

// イベント予約モーダルを閉じる
document.getElementById('eventReservationModalClose').addEventListener('click', () => {
    document.getElementById('eventReservationModal').classList.remove('active');
});

// イベント予約ステータス更新
async function updateEventReservationStatus(reservationId) {
    const newStatus = document.getElementById('eventReservationStatusSelect').value;
    
    try {
        const response = await fetch(`tables/event_reservations/${reservationId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            alert('ステータスを更新しました');
            document.getElementById('eventReservationModal').classList.remove('active');
            loadEventReservations();
        } else {
            alert('更新に失敗しました');
        }
    } catch (error) {
        console.error('ステータス更新エラー:', error);
        alert('エラーが発生しました');
    }
}

// イベント予約削除
async function deleteEventReservation(reservationId) {
    if (!confirm('この予約を削除してもよろしいですか？')) {
        return;
    }
    
    try {
        const response = await fetch(`tables/event_reservations/${reservationId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            alert('予約を削除しました');
            document.getElementById('eventReservationModal').classList.remove('active');
            loadEventReservations();
        } else {
            alert('削除に失敗しました');
        }
    } catch (error) {
        console.error('予約削除エラー:', error);
        alert('エラーが発生しました');
    }
}

// ユーティリティ関数
function getEventStatusLabel(status) {
    const labels = {
        draft: '下書き',
        published: '公開中',
        full: '満員',
        closed: '募集終了',
        completed: '終了'
    };
    return labels[status] || status;
}

function formatDateTimeJa(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日(${weekday}) ${hours}:${minutes}`;
}
