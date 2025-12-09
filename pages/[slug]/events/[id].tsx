import { useState } from 'react'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase, Tenant, Event } from '@/lib/supabase'

interface EventDetailPageProps {
  tenant: Tenant | null
  event: Event | null
  error?: string
}

export default function EventDetailPage({ tenant, event, error }: EventDetailPageProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    adult_count: 1,
    child_count: 0,
    child_ages: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tenant || !event) return

    if (!formData.name || !formData.email || !formData.phone) {
      alert('お名前、メールアドレス、電話番号は必須です')
      return
    }

    setSubmitting(true)

    try {
      const totalPrice = 
        (formData.adult_count * (event.adult_price || 0)) + 
        (formData.child_count * (event.child_price || 0))

      const { error } = await supabase
        .from('event_reservations')
        .insert({
          tenant_id: tenant.id,
          event_id: event.id,
          event_name: event.title,
          event_date: `${event.event_date} ${event.event_time}`,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          adult_count: formData.adult_count,
          child_count: formData.child_count,
          child_ages: formData.child_ages || null,
          total_price: totalPrice,
          notes: formData.notes || null,
          status: 'pending'
        })

      if (error) throw error

      // LINE通知を送信
      try {
        await fetch('/api/send-line-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenant.id,
            type: 'event_reservation',
            data: {
              name: formData.name,
              phone: formData.phone,
              email: formData.email,
              eventName: event.title,
              eventDate: `${event.event_date} ${event.event_time}`,
              adultCount: formData.adult_count,
              childCount: formData.child_count,
              childAges: formData.child_ages || undefined,
              totalPrice: totalPrice,
              notes: formData.notes || undefined
            }
          })
        })
      } catch (lineError) {
        console.error('LINE notification error:', lineError)
        // LINE通知が失敗しても予約は完了
      }
      
      router.push(`/${tenant.slug}/success?type=event&event=${encodeURIComponent(event.title)}`)
    } catch (err) {
      console.error('予約エラー:', err)
      alert('予約の送信に失敗しました。もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  if (error || !tenant || !event) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>イベントが見つかりませんでした</h1>
        {tenant && (
          <Link href={`/${tenant.slug}/events`} style={{
            display: 'inline-block',
            marginTop: '20px',
            color: '#2196F3',
            textDecoration: 'none'
          }}>
            ← イベント一覧に戻る
          </Link>
        )}
      </div>
    )
  }

  const totalPrice = 
    (formData.adult_count * (event.adult_price || 0)) + 
    (formData.child_count * (event.child_price || 0))

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 10px 0' }}>{tenant.tenant_name}</h1>
          <p style={{ margin: 0, color: '#666' }}>イベント予約</p>
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px 40px' }}>
        <Link href={`/${tenant.slug}/events`} style={{
          display: 'inline-block',
          marginBottom: '30px',
          color: '#2196F3',
          textDecoration: 'none'
        }}>
          ← イベント一覧に戻る
        </Link>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '30px'
        }}>
          {event.image_url && (
            <div style={{
              width: '100%',
              height: '300px',
              background: `url(${event.image_url}) center/cover`,
              backgroundColor: '#e0e0e0'
            }} />
          )}
          <div style={{ padding: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '28px' }}>{event.title}</h2>
            <p style={{ margin: '0 0 20px 0', lineHeight: '1.8', color: '#333' }}>
              {event.description}
            </p>
            <div style={{ 
              borderTop: '1px solid #e0e0e0',
              paddingTop: '20px',
              display: 'grid',
              gap: '12px'
            }}>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>📅 日時:</span> {event.event_date} {event.event_time}
              </p>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>📍 場所:</span> {event.location}
              </p>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>👥 定員:</span> 大人 {event.adult_capacity}名 / 子ども {event.child_capacity}名
              </p>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>💰 料金:</span> 
                <span>大人 ¥{event.adult_price?.toLocaleString()} / 子ども ¥{event.child_price?.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px'
        }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '22px' }}>予約フォーム</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                お名前 <span style={{ color: '#f44336' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                メールアドレス <span style={{ color: '#f44336' }}>*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                電話番号 <span style={{ color: '#f44336' }}>*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  大人の人数 <span style={{ color: '#f44336' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={event.adult_capacity || 10}
                  value={formData.adult_count}
                  onChange={(e) => setFormData({ ...formData, adult_count: parseInt(e.target.value) })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  子どもの人数
                </label>
                <input
                  type="number"
                  min="0"
                  max={event.child_capacity || 10}
                  value={formData.child_count}
                  onChange={(e) => setFormData({ ...formData, child_count: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>

            {formData.child_count > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  お子様の年齢（複数の場合はカンマ区切りで入力）
                </label>
                <input
                  type="text"
                  value={formData.child_ages}
                  onChange={(e) => setFormData({ ...formData, child_ages: e.target.value })}
                  placeholder="例: 5歳, 7歳"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                備考・ご質問（任意）
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{
              background: '#f0f7ff',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '18px' }}>
                合計金額
              </p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                ¥{totalPrice.toLocaleString()}
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                （大人 {formData.adult_count}名 × ¥{event.adult_price?.toLocaleString()} + 
                子ども {formData.child_count}名 × ¥{event.child_price?.toLocaleString()}）
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '16px',
                background: submitting ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? '送信中...' : '予約を確定する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug, id } = context.params as { slug: string; id: string }

  try {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single()

    if (tenantError || !tenant) {
      return {
        props: {
          tenant: null,
          event: null,
          error: 'テナントが見つかりませんでした'
        }
      }
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (eventError || !event) {
      return {
        props: {
          tenant,
          event: null,
          error: 'イベントが見つかりませんでした'
        }
      }
    }

    return {
      props: {
        tenant,
        event
      }
    }
  } catch (err) {
    return {
      props: {
        tenant: null,
        event: null,
        error: 'エラーが発生しました'
      }
    }
  }
}
