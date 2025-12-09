import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { supabase, Tenant, Reservation, Event, EventReservation } from '@/lib/supabase'

interface AdminPageProps {
  tenant: Tenant | null
  error?: string
}

export default function AdminPage({ tenant, error }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<'reservations' | 'events' | 'settings'>('reservations')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [eventReservations, setEventReservations] = useState<EventReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // 簡易認証（実運用では適切な認証システムを使用してください）
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 実際のパスワード認証を実装
    if (password === 'admin123') {
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
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
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
