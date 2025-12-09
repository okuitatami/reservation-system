import { GetServerSideProps } from 'next'
import Link from 'next/link'
import { supabase, Tenant, Event } from '@/lib/supabase'

interface EventsPageProps {
  tenant: Tenant | null
  events: Event[]
  error?: string
}

export default function EventsPage({ tenant, events, error }: EventsPageProps) {
  if (error || !tenant) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>テナントが見つかりませんでした</h1>
      </div>
    )
  }

  const activeEvents = events.filter(e => e.status === 'active')

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 10px 0' }}>{tenant.tenant_name}</h1>
          <p style={{ margin: 0, color: '#666' }}>イベント一覧</p>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' }}>
        <Link href={`/${tenant.slug}`} style={{
          display: 'inline-block',
          marginBottom: '30px',
          color: '#2196F3',
          textDecoration: 'none'
        }}>
          ← トップページに戻る
        </Link>

        {activeEvents.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '60px 20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '18px', color: '#666' }}>現在、開催予定のイベントはありません。</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '30px'
          }}>
            {activeEvents.map((event) => (
              <Link 
                key={event.id} 
                href={`/${tenant.slug}/events/${event.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                }}
                >
                  {event.image_url && (
                    <div style={{
                      width: '100%',
                      height: '200px',
                      background: `url(${event.image_url}) center/cover`,
                      backgroundColor: '#e0e0e0'
                    }} />
                  )}
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '20px',
                      fontWeight: 'bold'
                    }}>
                      {event.title}
                    </h3>
                    <p style={{ 
                      margin: '0 0 16px 0', 
                      color: '#666', 
                      lineHeight: '1.6',
                      flex: 1
                    }}>
                      {event.description?.substring(0, 100)}{event.description && event.description.length > 100 ? '...' : ''}
                    </p>
                    <div style={{ 
                      paddingTop: '16px', 
                      borderTop: '1px solid #e0e0e0',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      <p style={{ margin: '0 0 8px 0' }}>
                        📅 {event.event_date} {event.event_time}
                      </p>
                      <p style={{ margin: '0 0 8px 0' }}>
                        📍 {event.location}
                      </p>
                      <p style={{ margin: '0', fontWeight: 'bold', color: '#4CAF50', fontSize: '16px' }}>
                        大人 ¥{event.adult_price?.toLocaleString()} / 子ども ¥{event.child_price?.toLocaleString()}
                      </p>
                    </div>
                    <button style={{
                      marginTop: '16px',
                      width: '100%',
                      padding: '12px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}>
                      詳細を見る・予約する
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }

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
          events: [],
          error: 'テナントが見つかりませんでした'
        }
      }
    }

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('event_date', { ascending: true })

    return {
      props: {
        tenant,
        events: events || []
      }
    }
  } catch (err) {
    return {
      props: {
        tenant: null,
        events: [],
        error: 'エラーが発生しました'
      }
    }
  }
}
