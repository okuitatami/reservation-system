import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { supabase, Tenant, Reservation, Event, EventReservation } from '@/lib/supabase'

interface AdminPageProps {
  tenant: Tenant | null
  error?: string
}

export default function AdminPage({ tenant, error }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<'reservations' | 'events' | 'schedule' | 'settings'>('reservations')
  
  // 池田畳店はイベント機能を非表示
  const showEvents = tenant?.slug !== 'ikeda-tatami'
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [eventReservations, setEventReservations] = useState<EventReservation[]>([])
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // 受付可能日設定用の状態
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [selectedReservationType, setSelectedReservationType] = useState<'all' | 'estimate' | 'workshop' | 'visit'>('all')
  const [autoDeleteMessage, setAutoDeleteMessage] = useState<string>('')
  
  // カレンダー表示用の状態
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const [showTraditionalList, setShowTraditionalList] = useState(false)
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])

  // 簡易認証（実運用では適切な認証システムを使用してください）
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // テナントごとにパスワードを設定
    const correctPassword = tenant?.slug === 'ikeda-tatami' ? 'narito1231' : 'admin123';
    
    if (password === correctPassword) {
      setIsAuthenticated(true)
    } else {
      alert('パスワードが正しくありません')
    }
  }

  useEffect(() => {
    if (tenant && isAuthenticated) {
      fetchData()
    }
  }, [tenant, isAuthenticated, activeTab])

  // 管理画面アクセス時に過去日を自動削除
  useEffect(() => {
    if (tenant && isAuthenticated && activeTab === 'schedule') {
      deletePastAvailableSlots()
    }
  }, [tenant, isAuthenticated, activeTab])

  // 過去日（昨日以前）の受付可能日を自動削除
  const deletePastAvailableSlots = async () => {
    if (!tenant) return

    try {
      // 今日の日付を取得（YYYY-MM-DD形式）
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      // テナントの全受付可能日を取得
      const { data: allSlots, error: fetchError } = await supabase
        .from('available_slots')
        .select('*')
        .eq('tenant_id', tenant.id)

      if (fetchError) {
        console.error('過去日の取得エラー:', fetchError)
        return
      }

      if (allSlots && allSlots.length > 0) {
        // JavaScript側で昨日以前のデータをフィルタリング
        const pastSlots = allSlots.filter((slot: any) => {
          return slot.date < todayStr
        })

        if (pastSlots.length > 0) {
          // 過去日のIDリストを作成
          const pastSlotIds = pastSlots.map((slot: any) => slot.id)

          // 過去日を削除
          const { error: deleteError } = await supabase
            .from('available_slots')
            .delete()
            .in('id', pastSlotIds)

          if (deleteError) {
            console.error('過去日の削除エラー:', deleteError)
            return
          }

          // 削除件数を通知
          const message = `過去の受付可能日 ${pastSlots.length} 件を自動削除しました`
          setAutoDeleteMessage(message)
          console.log(message)

          // データを再取得して画面を更新
          await fetchData()

          // 5秒後にメッセージを非表示
          setTimeout(() => {
            setAutoDeleteMessage('')
          }, 5000)
        }
      }
    } catch (err) {
      console.error('自動削除エラー:', err)
    }
  }

  const fetchData = async () => {
    if (!tenant) return

    setLoading(true)
    try {
      if (activeTab === 'reservations') {
        const { data: resData } = await supabase
          .from('reservations')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false })
        
        const { data: eventResData } = await supabase
          .from('event_reservations')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false })

        setReservations(resData || [])
        setEventReservations(eventResData || [])
      } else if (activeTab === 'events') {
        const { data } = await supabase
          .from('events')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('event_date', { ascending: true })
        
        setEvents(data || [])
      } else if (activeTab === 'schedule') {
        const { data } = await supabase
          .from('available_slots')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('date', { ascending: false })
          .order('time', { ascending: true })
        
        setAvailableSlots(data || [])
      }
    } catch (err) {
      console.error('データ取得エラー:', err)
    }
    setLoading(false)
  }

  const updateReservationStatus = async (id: string, status: string) => {
    try {
      await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id)
      
      fetchData()
      alert('ステータスを更新しました')
    } catch (err) {
      alert('更新に失敗しました')
    }
  }

  const updateEventReservationStatus = async (id: string, status: string) => {
    try {
      await supabase
        .from('event_reservations')
        .update({ status })
        .eq('id', id)
      
      fetchData()
      alert('ステータスを更新しました')
    } catch (err) {
      alert('更新に失敗しました')
    }
  }

  // 受付可能日を追加
  const addAvailableSlots = async () => {
    if (!tenant || !selectedDate || selectedTimes.length === 0) {
      alert('日付と時間を選択してください')
      return
    }

    try {
      const slotsToAdd = selectedTimes.map(time => ({
        tenant_id: tenant.id,
        reservation_type: selectedReservationType,
        date: selectedDate,
        time: time,
        is_available: true
      }))

      const { error } = await supabase
        .from('available_slots')
        .insert(slotsToAdd)

      if (error) throw error

      alert(`${selectedTimes.length}件の受付可能時間を追加しました`)
      setSelectedDate('')
      setSelectedTimes([])
      fetchData()
    } catch (err) {
      console.error('追加エラー:', err)
      alert('追加に失敗しました')
    }
  }

  // 受付可能日を削除（画面位置を維持）
  const deleteAvailableSlot = async (id: string) => {
    if (!confirm('この受付可能時間を削除しますか？')) return

    try {
      const { error } = await supabase
        .from('available_slots')
        .delete()
        .eq('id', id)

      if (error) throw error

      // 削除成功後、選択した日付を保持したままデータを再取得
      const currentSelectedDate = selectedCalendarDate
      await fetchData()
      setSelectedCalendarDate(currentSelectedDate)
      
      // トーストメッセージで通知（アラートの代わり）
      const message = document.createElement('div')
      message.textContent = '✓ 削除しました'
      message.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: bold;
      `
      document.body.appendChild(message)
      setTimeout(() => message.remove(), 2000)
    } catch (err) {
      alert('削除に失敗しました')
    }
  }

  // カレンダー関連の関数
  const generateCalendarDays = (month: Date) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const firstDay = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days: Array<{ date: string; day: number; isCurrentMonth: boolean; isPast: boolean }> = []

    // 前月の日付を埋める
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: '', day: 0, isCurrentMonth: false, isPast: true })
    }

    // 当月の日付
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dateObj = new Date(year, monthIndex, day)
      const isPast = dateObj < today
      days.push({ date: dateStr, day, isCurrentMonth: true, isPast })
    }

    return days
  }

  const hasAvailableSlots = (date: string) => {
    return availableSlots.some((slot: any) => slot.date === date)
  }

  const getSlotsForDate = (date: string) => {
    return availableSlots.filter((slot: any) => slot.date === date)
  }

  const changeMonth = (offset: number) => {
    setCalendarMonth(prevMonth => {
      const newMonth = new Date(prevMonth)
      newMonth.setMonth(newMonth.getMonth() + offset)
      return newMonth
    })
  }

  const handleDateClick = (date: string) => {
    if (date) {
      setSelectedCalendarDate(selectedCalendarDate === date ? null : date)
      // 日付が変わったらチェックボックスをクリア
      setSelectedSlotIds([])
    }
  }

  // チェックボックスの選択/解除
  const toggleSlotSelection = (slotId: string) => {
    if (selectedSlotIds.includes(slotId)) {
      setSelectedSlotIds(selectedSlotIds.filter(id => id !== slotId))
    } else {
      setSelectedSlotIds([...selectedSlotIds, slotId])
    }
  }

  // すべて選択/解除
  const toggleAllSlots = (slots: any[]) => {
    const slotIds = slots.map((slot: any) => slot.id)
    if (selectedSlotIds.length === slotIds.length) {
      // すべて選択済みの場合は解除
      setSelectedSlotIds([])
    } else {
      // すべて選択
      setSelectedSlotIds(slotIds)
    }
  }

  // まとめて削除
  const deleteBulkSlots = async () => {
    if (selectedSlotIds.length === 0) {
      alert('削除する時間を選択してください')
      return
    }

    if (!confirm(`選択した${selectedSlotIds.length}件の受付可能時間を削除しますか？`)) return

    try {
      const { error } = await supabase
        .from('available_slots')
        .delete()
        .in('id', selectedSlotIds)

      if (error) throw error

      // 削除成功後、選択した日付を保持したままデータを再取得
      const currentSelectedDate = selectedCalendarDate
      await fetchData()
      setSelectedCalendarDate(currentSelectedDate)
      setSelectedSlotIds([])
      
      // トーストメッセージで通知
      const message = document.createElement('div')
      message.textContent = `✓ ${selectedSlotIds.length}件を削除しました`
      message.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: bold;
      `
      document.body.appendChild(message)
      setTimeout(() => message.remove(), 2000)
    } catch (err) {
      alert('削除に失敗しました')
    }
  }

  // 時間スロットの選択/解除
  const toggleTimeSlot = (time: string) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter(t => t !== time))
    } else {
      setSelectedTimes([...selectedTimes, time])
    }
  }

  // 利用可能な時間スロット（9:00〜18:00、30分刻み）
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  if (error || !tenant) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>テナントが見つかりませんでした</h1>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <form onSubmit={handleLogin} style={{
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>管理画面ログイン</h1>
          <p style={{ marginBottom: '20px', color: '#666', textAlign: 'center' }}>{tenant.tenant_name}</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '20px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
          <button type="submit" style={{
            width: '100%',
            padding: '12px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}>
            ログイン
          </button>
        </form>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{tenant.tenant_name} - 管理画面</title>
        {tenant.slug === 'ikeda-tatami' && <link rel="stylesheet" href="/css/ikeda-tatami-admin-theme.css" />}
      </Head>
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }} data-tenant={tenant.slug}>
        <header style={{
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0 }}>{tenant.tenant_name} - 管理画面</h1>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '30px',
          borderBottom: '2px solid #e0e0e0'
        }}>
          <button
            onClick={() => setActiveTab('reservations')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'reservations' ? '#4CAF50' : 'transparent',
              color: activeTab === 'reservations' ? 'white' : '#333',
              border: 'none',
              borderBottom: activeTab === 'reservations' ? '2px solid #4CAF50' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'reservations' ? 'bold' : 'normal'
            }}
          >
            予約一覧
          </button>
          {showEvents && (
            <button
              onClick={() => setActiveTab('events')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'events' ? '#4CAF50' : 'transparent',
                color: activeTab === 'events' ? 'white' : '#333',
                border: 'none',
                borderBottom: activeTab === 'events' ? '2px solid #4CAF50' : 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: activeTab === 'events' ? 'bold' : 'normal'
              }}
            >
              イベント管理
            </button>
          )}
          <button
            onClick={() => setActiveTab('schedule')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'schedule' ? '#4CAF50' : 'transparent',
              color: activeTab === 'schedule' ? 'white' : '#333',
              border: 'none',
              borderBottom: activeTab === 'schedule' ? '2px solid #4CAF50' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'schedule' ? 'bold' : 'normal'
            }}
          >
            受付可能日設定
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'settings' ? '#4CAF50' : 'transparent',
              color: activeTab === 'settings' ? 'white' : '#333',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid #4CAF50' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'settings' ? 'bold' : 'normal'
            }}
          >
            設定
          </button>
        </div>

        {loading ? (
          <p>読み込み中...</p>
        ) : (
          <>
            {activeTab === 'reservations' && (
              <div>
                <h2>一般予約</h2>
                {reservations.length === 0 ? (
                  <p>予約がありません</p>
                ) : (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {reservations.map((res) => (
                      <div key={res.id} style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                          <h3 style={{ margin: 0 }}>{res.name}</h3>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            background: res.status === 'confirmed' ? '#4CAF50' : res.status === 'cancelled' ? '#f44336' : '#ff9800',
                            color: 'white'
                          }}>
                            {res.status === 'pending' ? '保留中' : res.status === 'confirmed' ? '確認済み' : 'キャンセル'}
                          </span>
                        </div>
                        <p><strong>予約種別:</strong> {res.reservation_type === 'estimate' ? '下見依頼' : res.reservation_type === 'workshop' ? '見学・体験' : '来店予約'}</p>
                        <p><strong>日時:</strong> {res.reservation_date} {res.reservation_time}</p>
                        <p><strong>電話:</strong> {res.phone}</p>
                        <p><strong>メール:</strong> {res.email}</p>
                        {res.address && <p><strong>住所:</strong> {res.address}</p>}
                        {res.request_content && <p><strong>依頼内容:</strong> {res.request_content}</p>}
                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                          <button onClick={() => updateReservationStatus(res.id, 'confirmed')} style={{
                            padding: '8px 16px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}>
                            確認済みにする
                          </button>
                          <button onClick={() => updateReservationStatus(res.id, 'cancelled')} style={{
                            padding: '8px 16px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}>
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h2 style={{ marginTop: '40px' }}>イベント予約</h2>
                {eventReservations.length === 0 ? (
                  <p>イベント予約がありません</p>
                ) : (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {eventReservations.map((res) => (
                      <div key={res.id} style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                          <h3 style={{ margin: 0 }}>{res.name}</h3>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            background: res.status === 'confirmed' ? '#4CAF50' : res.status === 'cancelled' ? '#f44336' : '#ff9800',
                            color: 'white'
                          }}>
                            {res.status === 'pending' ? '保留中' : res.status === 'confirmed' ? '確認済み' : 'キャンセル'}
                          </span>
                        </div>
                        <p><strong>イベント:</strong> {res.event_name}</p>
                        <p><strong>日時:</strong> {res.event_date}</p>
                        <p><strong>電話:</strong> {res.phone}</p>
                        <p><strong>メール:</strong> {res.email}</p>
                        <p><strong>大人:</strong> {res.adult_count}名 / <strong>子ども:</strong> {res.child_count}名</p>
                        {res.child_ages && <p><strong>お子様の年齢:</strong> {res.child_ages}</p>}
                        <p><strong>合計金額:</strong> ¥{res.total_price?.toLocaleString()}</p>
                        {res.notes && <p><strong>備考:</strong> {res.notes}</p>}
                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                          <button onClick={() => updateEventReservationStatus(res.id, 'confirmed')} style={{
                            padding: '8px 16px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}>
                            確認済みにする
                          </button>
                          <button onClick={() => updateEventReservationStatus(res.id, 'cancelled')} style={{
                            padding: '8px 16px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}>
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div>
                <h2>イベント一覧</h2>
                <a href={`/${tenant.slug}/events`} style={{
                  display: 'inline-block',
                  marginBottom: '20px',
                  padding: '10px 20px',
                  background: '#2196F3',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}>
                  イベント一覧ページを見る
                </a>
                {events.length === 0 ? (
                  <p>イベントがありません</p>
                ) : (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {events.map((event) => (
                      <div key={event.id} style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <h3>{event.title}</h3>
                        <p>{event.description}</p>
                        <p><strong>日時:</strong> {event.event_date} {event.event_time}</p>
                        <p><strong>場所:</strong> {event.location}</p>
                        <p><strong>定員:</strong> 大人 {event.adult_capacity}名 / 子ども {event.child_capacity}名</p>
                        <p><strong>料金:</strong> 大人 ¥{event.adult_price?.toLocaleString()} / 子ども ¥{event.child_price?.toLocaleString()}</p>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          background: event.status === 'active' ? '#4CAF50' : event.status === 'completed' ? '#9e9e9e' : '#f44336',
                          color: 'white'
                        }}>
                          {event.status === 'active' ? '開催予定' : event.status === 'completed' ? '終了' : 'キャンセル'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schedule' && (
              <div>
                <h2 style={{ marginBottom: '30px' }}>受付可能日設定</h2>
                
                {/* 自動削除メッセージ */}
                {autoDeleteMessage && (
                  <div style={{
                    background: '#e8f5e9',
                    border: '1px solid #4caf50',
                    color: '#2e7d32',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '20px' }}>✅</span>
                    <span style={{ fontWeight: 'bold' }}>{autoDeleteMessage}</span>
                  </div>
                )}
                
                <div style={{
                  background: 'white',
                  padding: '30px',
                  borderRadius: '8px',
                  marginBottom: '30px'
                }}>
                  <h3 style={{ marginBottom: '20px' }}>新しい受付可能日時を追加</h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      日付を選択
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      予約種別
                    </label>
                    <select
                      value={selectedReservationType}
                      onChange={(e) => setSelectedReservationType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '16px'
                      }}
                    >
                      <option value="all">すべて（見積・体験・来店）</option>
                      <option value="estimate">見積依頼のみ</option>
                      <option value="workshop">見学・体験のみ</option>
                      <option value="visit">来店予約のみ</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>
                      受付可能時間を選択（複数選択可）
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: '10px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}>
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => toggleTimeSlot(time)}
                          style={{
                            padding: '10px',
                            background: selectedTimes.includes(time) ? '#4CAF50' : 'white',
                            color: selectedTimes.includes(time) ? 'white' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: selectedTimes.includes(time) ? 'bold' : 'normal'
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                      選択中: {selectedTimes.length}件
                    </p>
                  </div>

                  <button
                    onClick={addAvailableSlots}
                    disabled={!selectedDate || selectedTimes.length === 0}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: (!selectedDate || selectedTimes.length === 0) ? '#ccc' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: (!selectedDate || selectedTimes.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    受付可能日時を追加
                  </button>
                </div>

                {/* カレンダー形式の表示 */}
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '30px'
                }}>
                  <h3 style={{ marginBottom: '20px' }}>📅 予約可能日カレンダー</h3>
                  
                  {/* 月送りボタン */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <button
                      onClick={() => changeMonth(-1)}
                      style={{
                        padding: '8px 16px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      ← 前月
                    </button>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {calendarMonth.getFullYear()}年 {calendarMonth.getMonth() + 1}月
                    </span>
                    <button
                      onClick={() => changeMonth(1)}
                      style={{
                        padding: '8px 16px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      翌月 →
                    </button>
                  </div>

                  {/* カレンダーグリッド */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px',
                    marginBottom: '20px'
                  }}>
                    {/* 曜日ヘッダー */}
                    {['日', '月', '火', '水', '木', '金', '土'].map((day, idx) => (
                      <div key={day} style={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        padding: '8px',
                        color: idx === 0 ? '#f44336' : idx === 6 ? '#2196F3' : '#333',
                        fontSize: '14px'
                      }}>
                        {day}
                      </div>
                    ))}

                    {/* 日付セル */}
                    {generateCalendarDays(calendarMonth).map((dayInfo, idx) => {
                      const isToday = dayInfo.date === new Date().toISOString().split('T')[0]
                      const hasSlots = dayInfo.date && hasAvailableSlots(dayInfo.date)
                      const isSelected = dayInfo.date === selectedCalendarDate

                      return (
                        <div
                          key={idx}
                          onClick={() => handleDateClick(dayInfo.date)}
                          style={{
                            position: 'relative',
                            minHeight: '44px',
                            padding: '8px',
                            textAlign: 'center',
                            cursor: dayInfo.isCurrentMonth && !dayInfo.isPast ? 'pointer' : 'default',
                            background: isSelected ? '#E3F2FD' : isToday ? '#FFF9C4' : 'transparent',
                            border: isSelected ? '2px solid #2196F3' : '1px solid #e0e0e0',
                            borderRadius: '4px',
                            opacity: dayInfo.isPast || !dayInfo.isCurrentMonth ? 0.3 : 1,
                            color: idx % 7 === 0 ? '#f44336' : idx % 7 === 6 ? '#2196F3' : '#333',
                            fontSize: '16px',
                            fontWeight: isToday ? 'bold' : 'normal'
                          }}
                        >
                          {dayInfo.day || ''}
                          {hasSlots && (
                            <div style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#000'
                            }} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* 翌月のカレンダー */}
                  <div style={{ marginTop: '30px' }}>
                    <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>
                      {calendarMonth.getFullYear()}年 {calendarMonth.getMonth() + 2}月
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px'
                    }}>
                      {/* 曜日ヘッダー */}
                      {['日', '月', '火', '水', '木', '金', '土'].map((day, idx) => (
                        <div key={day} style={{
                          textAlign: 'center',
                          fontWeight: 'bold',
                          padding: '8px',
                          color: idx === 0 ? '#f44336' : idx === 6 ? '#2196F3' : '#333',
                          fontSize: '14px'
                        }}>
                          {day}
                        </div>
                      ))}

                      {/* 日付セル */}
                      {generateCalendarDays(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)).map((dayInfo, idx) => {
                        const hasSlots = dayInfo.date && hasAvailableSlots(dayInfo.date)
                        const isSelected = dayInfo.date === selectedCalendarDate

                        return (
                          <div
                            key={idx}
                            onClick={() => handleDateClick(dayInfo.date)}
                            style={{
                              position: 'relative',
                              minHeight: '44px',
                              padding: '8px',
                              textAlign: 'center',
                              cursor: dayInfo.isCurrentMonth ? 'pointer' : 'default',
                              background: isSelected ? '#E3F2FD' : 'transparent',
                              border: isSelected ? '2px solid #2196F3' : '1px solid #e0e0e0',
                              borderRadius: '4px',
                              opacity: !dayInfo.isCurrentMonth ? 0.3 : 1,
                              color: idx % 7 === 0 ? '#f44336' : idx % 7 === 6 ? '#2196F3' : '#333',
                              fontSize: '16px'
                            }}
                          >
                            {dayInfo.day || ''}
                            {hasSlots && (
                              <div style={{
                                position: 'absolute',
                                bottom: '4px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#000'
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 選択日の時間リスト */}
                  {selectedCalendarDate && getSlotsForDate(selectedCalendarDate).length > 0 && (
                    <div style={{
                      marginTop: '30px',
                      padding: '20px',
                      background: '#f5f5f5',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px'
                      }}>
                        <h4 style={{ margin: 0, fontSize: '16px' }}>
                          {selectedCalendarDate} の予約可能時間
                        </h4>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => toggleAllSlots(getSlotsForDate(selectedCalendarDate))}
                            style={{
                              padding: '8px 16px',
                              background: '#2196F3',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            {selectedSlotIds.length === getSlotsForDate(selectedCalendarDate).length ? '全解除' : '全選択'}
                          </button>
                          <button
                            onClick={deleteBulkSlots}
                            disabled={selectedSlotIds.length === 0}
                            style={{
                              padding: '8px 16px',
                              background: selectedSlotIds.length === 0 ? '#ccc' : '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: selectedSlotIds.length === 0 ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            まとめて削除 ({selectedSlotIds.length})
                          </button>
                        </div>
                      </div>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        background: 'white',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <thead>
                          <tr style={{ background: '#e0e0e0' }}>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', width: '50px' }}>選択</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>時間</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 'bold' }}>予約種別</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', width: '80px' }}>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSlotsForDate(selectedCalendarDate)
                            .sort((a: any, b: any) => a.time.localeCompare(b.time))
                            .map((slot: any) => (
                              <tr key={slot.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedSlotIds.includes(slot.id)}
                                    onChange={() => toggleSlotSelection(slot.id)}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      cursor: 'pointer'
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{slot.time}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>
                                  {slot.reservation_type === 'all' ? 'すべて' :
                                   slot.reservation_type === 'estimate' ? '見積' :
                                   slot.reservation_type === 'workshop' ? '体験' :
                                   slot.reservation_type === 'visit' ? '来店' : slot.reservation_type}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                  <button
                                    onClick={() => deleteAvailableSlot(slot.id)}
                                    style={{
                                      padding: '8px 16px',
                                      background: '#f44336',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      fontWeight: 'bold',
                                      minWidth: '60px'
                                    }}
                                  >
                                    削除
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 従来のリスト表示（折りたたみ可能） */}
                <div style={{
                  background: 'white',
                  padding: '30px',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowTraditionalList(!showTraditionalList)}
                  >
                    <h3 style={{ margin: 0 }}>登録済みの受付可能日時（リスト表示）</h3>
                    <span style={{ fontSize: '24px' }}>{showTraditionalList ? '▲' : '▼'}</span>
                  </div>
                  
                  {showTraditionalList && (
                    <>
                      {availableSlots.length === 0 ? (
                        <p style={{ color: '#666' }}>登録されている受付可能日時がありません</p>
                      ) : (
                        <div style={{ display: 'grid', gap: '10px' }}>
                          {/* 日付ごとにグループ化 */}
                          {Object.entries(
                            availableSlots.reduce((acc: any, slot: any) => {
                              if (!acc[slot.date]) acc[slot.date] = []
                              acc[slot.date].push(slot)
                              return acc
                            }, {})
                          ).map(([date, slots]: [string, any]) => (
                            <div key={date} style={{
                              padding: '15px',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px'
                            }}>
                              <h4 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
                                📅 {date}
                              </h4>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: '8px'
                              }}>
                                {slots.map((slot: any) => (
                                  <div key={slot.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    background: '#f5f5f5',
                                    borderRadius: '4px'
                                  }}>
                                    <div>
                                      <div style={{ fontWeight: 'bold' }}>{slot.time}</div>
                                      <div style={{ fontSize: '12px', color: '#666' }}>
                                        {slot.reservation_type === 'all' ? 'すべて' :
                                         slot.reservation_type === 'estimate' ? '見積' :
                                         slot.reservation_type === 'workshop' ? '体験' :
                                         slot.reservation_type === 'visit' ? '来店' : slot.reservation_type}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => deleteAvailableSlot(slot.id)}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                    >
                                      削除
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 従来の登録済み受付可能日時（削除） */}
                <div style={{ display: 'none' }}>
                  <h3 style={{ marginBottom: '20px' }}>登録済みの受付可能日時</h3>
                  {availableSlots.length === 0 ? (
                    <p style={{ color: '#666' }}>登録されている受付可能日時がありません</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {/* 日付ごとにグループ化 */}
                      {Object.entries(
                        availableSlots.reduce((acc: any, slot: any) => {
                          if (!acc[slot.date]) acc[slot.date] = []
                          acc[slot.date].push(slot)
                          return acc
                        }, {})
                      ).map(([date, slots]: [string, any]) => (
                        <div key={date} style={{
                          padding: '15px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px'
                        }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
                            📅 {date}
                          </h4>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '8px'
                          }}>
                            {slots.map((slot: any) => (
                              <div key={slot.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: '#f5f5f5',
                                borderRadius: '4px'
                              }}>
                                <div>
                                  <div style={{ fontWeight: 'bold' }}>{slot.time}</div>
                                  <div style={{ fontSize: '12px', color: '#666' }}>
                                    {slot.reservation_type === 'all' ? 'すべて' :
                                     slot.reservation_type === 'estimate' ? '見積' :
                                     slot.reservation_type === 'workshop' ? '体験' :
                                     slot.reservation_type === 'visit' ? '来店' : slot.reservation_type}
                                  </div>
                                </div>
                                <button
                                  onClick={() => deleteAvailableSlot(slot.id)}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  削除
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px'
              }}>
                <h2>LINE通知設定</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  LINE通知を有効にするには、LINE Messaging APIの設定が必要です。
                </p>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    LINE Channel Access Token:
                  </label>
                  <input
                    type="text"
                    placeholder="設定されていません"
                    value={tenant.line_channel_access_token || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: '#f9f9f9'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    LINE User ID:
                  </label>
                  <input
                    type="text"
                    placeholder="設定されていません"
                    value={tenant.line_user_id || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: '#f9f9f9'
                    }}
                  />
                </div>
                <p style={{ fontSize: '14px', color: '#999' }}>
                  ※ LINE通知設定を変更するには、データベースで直接設定を行ってください。
                </p>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }

  try {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !tenant) {
      return {
        props: {
          tenant: null,
          error: 'テナントが見つかりませんでした'
        }
      }
    }

    return {
      props: {
        tenant
      }
    }
  } catch (err) {
    return {
      props: {
        tenant: null,
        error: 'エラーが発生しました'
      }
    }
  }
}
