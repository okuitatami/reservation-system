// Supabase クライアント初期化
let supabaseClient = null;

function initSupabase() {
  if (typeof window !== 'undefined' && window.supabase && window.SUPABASE_CONFIG) {
    const SUPABASE_URL = window.SUPABASE_CONFIG.url;
    const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG.anonKey;
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ Supabase環境変数が設定されていません');
      console.error('SUPABASE_URL:', SUPABASE_URL);
      console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '(設定済み)' : '(未設定)');
      return;
    }
    
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase クライアント初期化成功');
    console.log('   URL:', SUPABASE_URL);
  } else {
    console.error('❌ Supabase CDN または設定が読み込まれていません');
    console.error('   window.supabase:', typeof window.supabase);
    console.error('   window.SUPABASE_CONFIG:', window.SUPABASE_CONFIG);
  }
}

// ページ読み込み時にSupabaseを初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}

// フォームデータを保持
let formData = {};
let currentStep = 1;
const totalSteps = 4;

// ステップ切り替え
function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > totalSteps) return;
    
    // 前のステップを非表示
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // 新しいステップを表示
    document.querySelector(`.form-step[data-step="${stepNumber}"]`).classList.add('active');
    
    // ステップインジケーター更新
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < stepNumber) {
            step.classList.add('completed');
        } else if (index + 1 === stepNumber) {
            step.classList.add('active');
        }
    });
    
    currentStep = stepNumber;
    
    // ページトップにスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 次へボタン
document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', async () => {
        if (await validateCurrentStep()) {
            goToStep(currentStep + 1);
            
            // ステップ3に進んだらカレンダーを初期化
            if (currentStep === 3) {
                await initCalendar();
            }
            
            // ステップ4に進んだら確認内容を表示
            if (currentStep === 4) {
                displayConfirmation();
            }
        }
    });
});

// 戻るボタン
document.querySelectorAll('.btn-prev').forEach(btn => {
    btn.addEventListener('click', () => {
        goToStep(currentStep - 1);
    });
});

// 現在のステップのバリデーション
async function validateCurrentStep() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    
    // ステップ1: 予約種別
    if (currentStep === 1) {
        const selectedType = document.querySelector('input[name="reservation_type"]:checked');
        if (!selectedType) {
            alert('予約種別を選択してください');
            return false;
        }
        formData.reservation_type = selectedType.value;
        
        // ステップ2のフィールド表示を制御
        updateStep2Fields(selectedType.value);
        return true;
    }
    
    // ステップ2: 詳細入力
    if (currentStep === 2) {
        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const address = document.getElementById('address').value.trim();
        
        if (!name || !phone || !email) {
            alert('必須項目を入力してください');
            return false;
        }
        
        // 見積の場合は住所必須
        if (formData.reservation_type === 'estimate' && !address) {
            alert('見積依頼の場合は住所を入力してください');
            return false;
        }
        
        // メールアドレスの簡易バリデーション
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('有効なメールアドレスを入力してください');
            return false;
        }
        
        formData.name = name;
        formData.phone = phone;
        formData.email = email;
        formData.address = address;
        formData.request_content = document.getElementById('request_content').value.trim();
        formData.concerns = document.getElementById('concerns').value.trim();
        
        // ワークショップの場合
        if (formData.reservation_type === 'workshop') {
            const workshopType = document.querySelector('input[name="workshop_type"]:checked');
            if (!workshopType) {
                alert('ワークショップの種類を選択してください');
                return false;
            }
            formData.workshop_type = workshopType.value;
            
            // オプションが必要な場合
            if (workshopType.value === 'mini_tatami' || workshopType.value === 'hand_sewing') {
                const option = document.querySelector('input[name="workshop_option"]:checked');
                if (!option) {
                    alert('オプションを選択してください');
                    return false;
                }
                formData.workshop_option = option.value;
            } else {
                formData.workshop_option = null;
            }
            
            // 参加人数のバリデーション
            const childrenCount = parseInt(document.getElementById('participants_children').value) || 0;
            const adultsCount = parseInt(document.getElementById('participants_adults').value) || 0;
            
            if (childrenCount + adultsCount === 0) {
                alert('参加人数を入力してください（子どもまたは大人のいずれかを1名以上）');
                return false;
            }
            
            formData.participants_children = childrenCount;
            formData.participants_adults = adultsCount;
        } else if (formData.reservation_type === 'visit') {
            // 来店の場合も参加人数を記録
            const childrenCount = parseInt(document.getElementById('participants_children').value) || 0;
            const adultsCount = parseInt(document.getElementById('participants_adults').value) || 0;
            
            formData.participants_children = childrenCount;
            formData.participants_adults = adultsCount;
        }
        
        return true;
    }
    
    // ステップ3: 日時選択
    if (currentStep === 3) {
        const date = document.getElementById('reservation_date').value;
        const selectedTime = document.querySelector('input[name="reservation_time"]:checked');
        
        if (!date) {
            alert('日付を選択してください');
            return false;
        }
        
        if (!selectedTime) {
            alert('時間を選択してください');
            return false;
        }
        
        formData.reservation_date = date;
        formData.reservation_time = selectedTime.value;
        
        return true;
    }
    
    return true;
}

// ステップ2のフィールド表示制御
function updateStep2Fields(reservationType) {
    const workshopSection = document.getElementById('workshopSection');
    const requestContentLabel = document.getElementById('requestContentLabel');
    const addressLabel = document.getElementById('addressLabel');
    const addressInput = document.getElementById('address');
    
    if (reservationType === 'workshop') {
        workshopSection.style.display = 'block';
        requestContentLabel.textContent = 'ご希望・ご要望';
        addressLabel.innerHTML = 'ご住所';
        addressInput.removeAttribute('required');
    } else if (reservationType === 'visit') {
        workshopSection.style.display = 'none';
        requestContentLabel.textContent = 'ご用件';
        addressLabel.innerHTML = 'ご住所';
        addressInput.removeAttribute('required');
    } else {
        // 見積の場合
        workshopSection.style.display = 'none';
        requestContentLabel.textContent = '依頼内容';
        addressLabel.innerHTML = 'ご住所<span style="color: #dc3545;"> *</span>';
        addressInput.setAttribute('required', 'required');
    }
}

// ワークショップタイプの変更時
document.querySelectorAll('input[name="workshop_type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const miniTatamiOptions = document.getElementById('miniTatamiOptions');
        const handSewingOptions = document.getElementById('handSewingOptions');
        
        // すべてのオプションを非表示
        miniTatamiOptions.style.display = 'none';
        handSewingOptions.style.display = 'none';
        
        // 選択されたワークショップに応じてオプションを表示
        if (e.target.value === 'mini_tatami') {
            miniTatamiOptions.style.display = 'block';
        } else if (e.target.value === 'hand_sewing') {
            handSewingOptions.style.display = 'block';
        }
        
        // オプションのラジオボタンをリセット
        document.querySelectorAll('input[name="workshop_option"]').forEach(opt => {
            opt.checked = false;
        });
    });
});

// カレンダー関連の変数
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let availableDatesCache = [];
let selectedDate = null;

// カレンダーを初期化
async function initCalendar() {
    // 利用可能日を取得
    await loadAvailableDates();
    // カレンダーを描画
    renderCalendar();
    
    // 月送りボタンのイベント
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
}

// カレンダー用のデータキャッシュ
let availableSlotsData = [];
let allReservationsData = [];

// 利用可能な日付を取得（Supabase直接接続版）
async function loadAvailableDates() {
    try {
        const tenantInfo = window.TENANT_INFO;
        if (!tenantInfo || !tenantInfo.slug) {
            console.error('テナント情報が見つかりません');
            return;
        }

        if (!supabaseClient) {
            console.error('Supabaseクライアントが初期化されていません');
            return;
        }

        console.log('🔍 利用可能日を取得中...');
        console.log('   - テナント:', tenantInfo.tenant_name, `(ID: ${tenantInfo.id})`);
        console.log('   - 予約種別:', formData.reservation_type || 'all');

        // tenantsテーブルからtenants.idを確認（デバッグ用）
        const { data: tenantData, error: tenantError } = await supabaseClient
            .from('tenants')
            .select('id, tenant_name')
            .eq('slug', tenantInfo.slug)
            .single();

        if (tenantError) {
            console.error('❌ テナント情報取得エラー:', tenantError);
        } else {
            console.log('✅ テナント確認:', tenantData);
        }

        const tenantId = tenantData?.id || tenantInfo.id;

        // 利用可能スロットを取得
        let slotsQuery = supabaseClient
            .from('available_slots')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('is_available', true);
        
        // 予約種別でフィルタ（'all'または指定された種別のスロットを取得）
        if (formData.reservation_type && formData.reservation_type !== 'all') {
            slotsQuery = slotsQuery.or(`reservation_type.eq.${formData.reservation_type},reservation_type.eq.all`);
        }
        
        const { data: slotsData, error: slotsError } = await slotsQuery;
        
        if (slotsError) {
            console.error('❌ スロット取得エラー:', slotsError);
            availableSlotsData = [];
        } else {
            availableSlotsData = slotsData || [];
            console.log('✅ 利用可能スロット取得成功:', availableSlotsData.length, '件');
        }
        
        // 既存予約を取得
        const { data: reservationsData, error: reservationsError } = await supabaseClient
            .from('reservations')
            .select('*')
            .eq('tenant_id', tenantId)
            .neq('status', 'cancelled');
        
        if (reservationsError) {
            console.error('❌ 予約取得エラー:', reservationsError);
            allReservationsData = [];
        } else {
            allReservationsData = reservationsData || [];
            console.log('✅ 既存予約取得成功:', allReservationsData.length, '件');
        }
        
        // 日付ごとにグループ化（重複を排除）
        const dateSet = new Set(availableSlotsData.map(slot => slot.date));
        availableDatesCache = Array.from(dateSet);
        
        console.log('📅 利用可能日数:', availableDatesCache.length);
        console.log('🕒 利用可能スロット数:', availableSlotsData.length);
        
    } catch (error) {
        console.error('❌ 利用可能日取得エラー:', error);
        availableDatesCache = [];
        availableSlotsData = [];
        allReservationsData = [];
    }
}

// カレンダーを描画
function renderCalendar() {
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    document.getElementById('calendarMonth').textContent = `${currentYear}年 ${monthNames[currentMonth]}`;
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const prevLastDay = new Date(currentYear, currentMonth, 0);
    
    const firstDayIndex = firstDay.getDay();
    const lastDayDate = lastDay.getDate();
    const prevLastDayDate = prevLastDay.getDate();
    
    const daysContainer = document.getElementById('calendarDays');
    let daysHTML = '';
    
    // 前月の日付
    for (let i = firstDayIndex; i > 0; i--) {
        daysHTML += `<div class="calendar-day other-month">${prevLastDayDate - i + 1}</div>`;
    }
    
    // 今月の日付
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (let day = 1; day <= lastDayDate; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isAvailable = availableDatesCache.includes(dateStr);
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedDate;
        const isPast = new Date(dateStr) < new Date(todayStr);
        
        // この日の満員判定
        let isFull = false;
        if (isAvailable && !isPast) {
            // この日の利用可能スロット
            const daySlots = availableSlotsData.filter(slot => {
                return slot.date === dateStr && 
                       slot.is_available && 
                       (slot.reservation_type === 'all' || slot.reservation_type === formData.reservation_type);
            });
            
            // この日の予約済み時間
            const bookedTimes = allReservationsData
                .filter(r => r.reservation_date === dateStr)
                .map(r => r.reservation_time);
            
            // すべてのスロットが予約済みか確認
            const availableSlotTimes = daySlots.map(s => s.time);
            isFull = availableSlotTimes.length > 0 && 
                     availableSlotTimes.every(time => bookedTimes.includes(time));
        }
        
        let classes = 'calendar-day';
        let dayContent = day;
        
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        
        if (isFull) {
            classes += ' full';
            dayContent = `${day}<span class="full-badge">満員御礼</span>`;
        } else if (isAvailable && !isPast) {
            classes += ' available';
        } else {
            classes += ' unavailable';
        }
        
        daysHTML += `<div class="${classes}" data-date="${dateStr}">${dayContent}</div>`;
    }
    
    // 次月の日付
    const remainingDays = 42 - (firstDayIndex + lastDayDate); // 6週間分
    for (let day = 1; day <= remainingDays; day++) {
        daysHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    daysContainer.innerHTML = daysHTML;
    
    // 日付クリックイベント（満員の日は除外）
    daysContainer.querySelectorAll('.calendar-day.available:not(.full)').forEach(dayElement => {
        dayElement.addEventListener('click', () => {
            const dateStr = dayElement.dataset.date;
            selectDate(dateStr);
        });
    });
}

// 日付を選択
function selectDate(dateStr) {
    selectedDate = dateStr;
    document.getElementById('reservation_date').value = dateStr;
    
    // カレンダーの選択状態を更新
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    document.querySelector(`.calendar-day[data-date="${dateStr}"]`)?.classList.add('selected');
    
    // 時間枠を表示
    document.getElementById('timeSlotsGroup').style.display = 'block';
    loadAvailableTimeSlots(dateStr);
    
    // 時間枠までスクロール
    setTimeout(() => {
        document.getElementById('timeSlotsGroup').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// 利用可能時間枠を読み込む
async function loadAvailableTimeSlots(selectedDate) {
    const container = document.getElementById('availableTimeSlots');
    container.innerHTML = '<div class="loading">読み込み中...</div>';
    
    try {
        // 当日予約かどうかを判定
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const isSameDay = selectedDate === todayStr;
        
        // 当日予約の場合は電話対応メッセージを表示
        if (isSameDay) {
            container.innerHTML = `
                <div class="same-day-notice">
                    <i class="fas fa-phone-alt"></i>
                    <h3>当日のご予約はお電話でのみ承っております</h3>
                    <p>お手数ですが、下記までお電話にてご連絡ください</p>
                    <a href="tel:0123456789" class="phone-number">
                        <i class="fas fa-phone"></i> 012-345-6789
                    </a>
                    <p class="business-hours">営業時間: 9:00〜18:00</p>
                    <button type="button" class="btn-back-to-calendar" onclick="selectedDate = ''; document.getElementById('timeSlotsGroup').style.display = 'none'; document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));">
                        別の日付を選択
                    </button>
                </div>
            `;
            return;
        }
        
        const tenantInfo = window.TENANT_INFO;
        if (!tenantInfo || !tenantInfo.slug) {
            console.error('テナント情報が見つかりません');
            return;
        }

        // 日付とタイプでフィルター
        const availableSlots = availableSlotsData.filter(slot => {
            return slot.date === selectedDate && 
                   slot.is_available && 
                   (slot.reservation_type === 'all' || slot.reservation_type === formData.reservation_type);
        });
        
        // 時間順にソート（早い順）
        availableSlots.sort((a, b) => {
            return a.time.localeCompare(b.time);
        });
        
        if (availableSlots.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>この日は予約可能な時間がありません<br>別の日付をお選びください</p></div>';
            return;
        }
        
        // 既存の予約を確認（既にloadAvailableDatesで取得済み）
        const existingReservations = allReservationsData;
        
        // この日付の予約済み時間を取得
        const bookedTimes = existingReservations
            .filter(r => r.reservation_date === selectedDate && r.status !== 'cancelled')
            .map(r => r.reservation_time);
        
        // 時間枠を表示
        container.innerHTML = availableSlots.map(slot => {
            const isBooked = bookedTimes.includes(slot.time);
            const unavailableClass = isBooked ? ' unavailable' : '';
            const disabled = isBooked ? 'disabled' : '';
            
            return `
                <div class="time-slot${unavailableClass}">
                    <input type="radio" id="time-${slot.time}" name="reservation_time" value="${slot.time}" ${disabled}>
                    <label for="time-${slot.time}">${slot.time}</label>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('時間枠読み込みエラー:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>時間枠の読み込みに失敗しました</p></div>';
    }
}

// 確認内容を表示
function displayConfirmation() {
    const container = document.getElementById('confirmationContent');
    
    const typeLabels = {
        estimate: '見積依頼',
        workshop: 'ワークショップ',
        visit: '来店予約'
    };
    
    const workshopLabels = {
        // 池田畳店のワークショップ
        tatami_doctor: 'たたみ博士になろう！',
        half_day_craftsman: '半日畳職人体験',
        morimori_experience: 'もりもり体験会',
        mini_tatami: 'ミニ畳作り体験',
        // 奥井畳店のワークショップ
        rose: '畳縁で薔薇づくり体験',
        hand_sewing: '畳手縫い体験',
        mat_sewing: 'ゴザ手縫い体験'
    };
    
    const optionLabels = {
        tacker: 'タッカー',
        hand_sewing: '手縫い',
        onsite: 'その場で体験',
        takeaway: '畳を持ち帰る'
    };
    
    let html = `
        <div class="confirmation-item">
            <strong>予約種別</strong>
            <p>${typeLabels[formData.reservation_type]}</p>
        </div>
        <div class="confirmation-item">
            <strong>予約日時</strong>
            <p>${formData.reservation_date} ${formData.reservation_time}</p>
        </div>
        <div class="confirmation-item">
            <strong>お名前</strong>
            <p>${formData.name}</p>
        </div>
        <div class="confirmation-item">
            <strong>電話番号</strong>
            <p>${formData.phone}</p>
        </div>
        <div class="confirmation-item">
            <strong>メールアドレス</strong>
            <p>${formData.email}</p>
        </div>
    `;
    
    if (formData.address) {
        html += `
            <div class="confirmation-item">
                <strong>ご住所</strong>
                <p>${formData.address}</p>
            </div>
        `;
    }
    
    if (formData.workshop_type) {
        html += `
            <div class="confirmation-item">
                <strong>ワークショップ種類</strong>
                <p>${workshopLabels[formData.workshop_type]}</p>
            </div>
        `;
        
        if (formData.workshop_option) {
            html += `
                <div class="confirmation-item">
                    <strong>オプション</strong>
                    <p>${optionLabels[formData.workshop_option]}</p>
                </div>
            `;
        }
        
        // 参加人数
        if (formData.participants_children !== undefined || formData.participants_adults !== undefined) {
            html += `
                <div class="confirmation-item">
                    <strong>参加人数</strong>
                    <p>子ども（小学4年生以上）: ${formData.participants_children || 0}名<br>大人（中学生以上）: ${formData.participants_adults || 0}名</p>
                </div>
            `;
        }
    }
    
    // 来店の場合の参加人数
    if (formData.reservation_type === 'visit' && (formData.participants_children || formData.participants_adults)) {
        html += `
            <div class="confirmation-item">
                <strong>来店人数</strong>
                <p>子ども: ${formData.participants_children || 0}名<br>大人: ${formData.participants_adults || 0}名</p>
            </div>
        `;
    }
    
    if (formData.request_content) {
        html += `
            <div class="confirmation-item">
                <strong>${formData.reservation_type === 'estimate' ? '依頼内容' : 'ご希望・ご要望'}</strong>
                <p>${formData.request_content}</p>
            </div>
        `;
    }
    
    if (formData.concerns) {
        html += `
            <div class="confirmation-item">
                <strong>懸念点・聞いてみたいこと</strong>
                <p>${formData.concerns}</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// フォーム送信
document.getElementById('reservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
    
    try {
        const tenantInfo = window.TENANT_INFO;
        if (!tenantInfo || !tenantInfo.id) {
            throw new Error('テナント情報が見つかりません');
        }

        // 予約データを作成
        const reservationData = {
            tenant_id: tenantInfo.id,
            ...formData,
            status: 'pending'
        };
        
        // データベースに保存（Supabase直接接続版）
        console.log('💾 予約データを保存中...', reservationData);
        const { data: savedReservation, error: saveError } = await supabaseClient
            .from('reservations')
            .insert([reservationData])
            .select()
            .single();
        
        if (saveError) {
            console.error('❌ 予約保存エラー:', saveError);
            throw new Error('予約の登録に失敗しました');
        }
        
        console.log('✅ 予約保存成功:', savedReservation);
        
        if (savedReservation) {
            // LINE通知送信
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中…';
            try {
                await sendLineNotification(reservationData);
            } catch (lineError) {
                console.warn('LINE通知に失敗しましたが、予約は完了しています', lineError);
            }
            
            // 成功ページに遷移（テナントのslugを使用）
            const tenantSlug = window.TENANT_INFO?.slug || 'ikeda-tatami';
            window.location.href = `/${tenantSlug}/success`;
        } else {
            throw new Error('予約の登録に失敗しました');
        }
    } catch (error) {
        console.error('予約送信エラー:', error);
        alert('予約の送信に失敗しました。もう一度お試しください。');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> 予約を確定する';
    }
});

// EmailJS初期化
(function() {
    console.log('=== EmailJS初期化開始 ===');
    try {
        emailjs.init("BgmMY1s2iEbsrZaFj");
        console.log('✅ EmailJS初期化成功');
        console.log('Public Key:', 'BgmMY1s2iEbsrZaFj');
    } catch (error) {
        console.error('❌ EmailJS初期化エラー:', error);
    }
})();

// メール送信関数
let emailSendCount = 0;
async function sendEmails(reservationData) {
    emailSendCount++;
    console.log('🔵🔵🔵 sendEmails関数が呼び出されました（呼び出し回数: ' + emailSendCount + '回目）');
    console.log('🔵 reservationData:', reservationData);
    
    const typeLabels = {
        estimate: '見積依頼',
        workshop: 'ワークショップ',
        visit: '来店予約'
    };
    
    const workshopLabels = {
        // 池田畳店のワークショップ
        tatami_doctor: 'たたみ博士になろう！',
        half_day_craftsman: '半日畳職人体験',
        morimori_experience: 'もりもり体験会',
        mini_tatami: 'ミニ畳作り体験',
        // 奥井畳店のワークショップ
        rose: '畳縁で薔薇づくり体験',
        hand_sewing: '畳手縫い体験',
        mat_sewing: 'ゴザ手縫い体験'
    };
    
    const optionLabels = {
        tacker: 'タッカー',
        hand_sewing: '手縫い',
        onsite: 'その場で体験',
        takeaway: '畳を持ち帰る'
    };
    
    // メール用のデータを整形
    const emailData = {
        to_name: reservationData.name || '',
        to_email: reservationData.email || '',
        reservation_type: typeLabels[reservationData.reservation_type] || '',
        reservation_date: reservationData.reservation_date || '',
        reservation_time: reservationData.reservation_time || '',
        customer_name: reservationData.name || '',
        customer_phone: reservationData.phone || '',
        customer_email: reservationData.email || '',
        customer_address: reservationData.address || '未入力',
        request_content: reservationData.request_content || '未入力',
        concerns: reservationData.concerns || '未入力',
        workshop_type: reservationData.workshop_type ? workshopLabels[reservationData.workshop_type] : '未入力',
        workshop_option: reservationData.workshop_option ? optionLabels[reservationData.workshop_option] : '未入力',
        participants_children: (reservationData.participants_children !== undefined && reservationData.participants_children !== null) ? reservationData.participants_children : 0,
        participants_adults: (reservationData.participants_adults !== undefined && reservationData.participants_adults !== null) ? reservationData.participants_adults : 0
    };
    
    console.log('📧 送信するメールデータ:', JSON.stringify(emailData, null, 2));
    console.log('📧 customer_name:', emailData.customer_name);
    console.log('📧 customer_phone:', emailData.customer_phone);
    console.log('📧 customer_email:', emailData.customer_email);
    console.log('📧 customer_address:', emailData.customer_address);
    
    try {
        console.log('=== メール送信開始 ===');
        console.log('Service ID:', 'okui__yoyaku');
        console.log('Customer Template ID:', 'template_ie7u3tm');
        console.log('Admin Template ID:', 'template_040mq6p');
        
        // お客様へのメール送信
        console.log('お客様へメール送信中...');
        const customerResponse = await emailjs.send(
            'okui__yoyaku',
            'template_ie7u3tm',
            emailData
        );
        console.log('✅ お客様メール送信成功:', customerResponse);
        
        // 管理者へのメール送信
        console.log('📧📧 管理者へメール送信中... (Service: okui__yoyaku, Template: template_040mq6p)');
        console.log('📧📧 送信データ:', JSON.stringify(emailData, null, 2));
        const adminResponse = await emailjs.send(
            'okui__yoyaku',
            'template_040mq6p',
            emailData
        );
        console.log('✅✅ 管理者メール送信成功:', adminResponse);
        console.log('=== メール送信完了 ===');
        
        return true;
    } catch (error) {
        console.error('❌ メール送信エラー:', error);
        console.error('エラー詳細:', error.text || error.message);
        return false;
    }
}

// LINE通知送信（Cloudflare Worker経由）
async function sendLineNotification(reservationData) {
    console.log('📱 LINE通知送信開始...');
    
    try {
        const tenantInfo = window.TENANT_INFO;
        
        if (!tenantInfo || !tenantInfo.id) {
            console.error('❌ テナント情報が見つかりません');
            return false;
        }

        // テナントのslugに基づいてWorker URLを決定
        const workerUrls = {
            'ikeda-tatami': 'https://ikeda-tatami-line-notify.okuitatami.workers.dev/',
            'okui-tatami': 'https://okui-tatami-line-notify.okuitatami.workers.dev/'
        };
        
        const API_ENDPOINT = workerUrls[tenantInfo.slug] || workerUrls['ikeda-tatami'];
        
        console.log('🏢 テナント:', tenantInfo.slug);
        console.log('📤 API呼び出し中:', API_ENDPOINT);

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tenantId: tenantInfo.id,
                type: 'reservation',
                data: {
                    name: reservationData.name,
                    phone: reservationData.phone,
                    email: reservationData.email,
                    reservationType: reservationData.reservation_type,
                    reservationDate: reservationData.reservation_date,
                    reservationTime: reservationData.reservation_time,
                    address: reservationData.address,
                    requestContent: reservationData.request_content,
                    concerns: reservationData.concerns,
                    workshopType: reservationData.workshop_type,
                    participantsChildren: reservationData.participants_children,
                    participantsAdults: reservationData.participants_adults
                }
            })
        });

        console.log('📥 API応答:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API エラーレスポンス:', errorText);
            return false;
        }
        
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

// 初期化（カレンダーは動的に生成されるため、ここでは何もしない）
document.addEventListener('DOMContentLoaded', () => {
    console.log('🟢 ページ読み込み完了');
    console.log('🟢 script.js が正常に読み込まれました');
    // カレンダーはステップ3で初期化される
});
