import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useEffect } from 'react'
import { supabase, Tenant } from '@/lib/supabase'

interface Props {
  tenant: Tenant | null
  error?: string
}

export default function ReservationPage({ tenant, error }: Props) {
  useEffect(() => {
    if (tenant) {
      // グローバル変数を設定（既存JSで使用）
      (window as any).TENANT_INFO = tenant;
      (window as any).API_BASE_URL = window.location.origin;
    }
  }, [tenant])

  if (error || !tenant) {
    return (
      <>
        <Head>
          <title>エラー</title>
        </Head>
        <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div style={{ background: 'white', borderRadius: '15px', padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
            <h1>エラー</h1>
            <p>{error || 'テナントが見つかりませんでした'}</p>
          </div>
        </div>
      </>
    )
  }

  const eventsUrl = `/${tenant.slug}/events`;

  return (
    <>
      <Head>
        <title>予約フォーム - {tenant.tenant_name}</title>
        <meta name="description" content={`${tenant.tenant_name}の見積予約・ワークショップ・来店予約フォームです。`} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
        <link rel="stylesheet" href="/css/style.css" />
        {tenant.slug === 'ikeda-tatami' && <link rel="stylesheet" href="/css/ikeda-tatami-theme.css" />}
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
        <script src="/js/script.js" defer></script>
      </Head>

      <div className="container" data-tenant={tenant.slug}>
        {/* ヘッダー */}
        <header className="header">
          <div className="header-content">
            <h1 className="header-title">{tenant.tenant_name}</h1>
            <p className="header-subtitle">専用予約フォーム</p>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="main-content">
          <div className="form-container">
            {/* ステップインジケーター */}
            <div className="steps">
              <div className="step active" data-step="1">
                <div className="step-number">1</div>
                <div className="step-label">予約種別</div>
              </div>
              <div className="step" data-step="2">
                <div className="step-number">2</div>
                <div className="step-label">詳細入力</div>
              </div>
              <div className="step" data-step="3">
                <div className="step-number">3</div>
                <div className="step-label">日時選択</div>
              </div>
              <div className="step" data-step="4">
                <div className="step-number">4</div>
                <div className="step-label">確認</div>
              </div>
            </div>

            {/* フォーム */}
            <form id="reservationForm" className="reservation-form">
              {/* ステップ1: 予約種別選択 */}
              <div className="form-step active" data-step="1">
                <h2 className="form-step-title">希望項目を選択し「次へ」を押してください</h2>
                <div className="reservation-types">
                  <label className="type-card">
                    <input type="radio" name="reservation_type" value="estimate" required />
                    <div className="type-card-content">
                      <i className="fas fa-calculator"></i>
                      <h3>見積依頼</h3>
                      <p>畳の張替え・新調などのお見積りをご希望の方</p>
                    </div>
                  </label>
                  <label className="type-card">
                    <input type="radio" name="reservation_type" value="workshop" required />
                    <div className="type-card-content">
                      <i className="fas fa-palette"></i>
                      <h3>ワークショップ</h3>
                      <p>畳作り体験や薔薇づくり体験をご希望の方</p>
                    </div>
                  </label>
                  <label className="type-card">
                    <input type="radio" name="reservation_type" value="visit" required />
                    <div className="type-card-content">
                      <i className="fas fa-store"></i>
                      <h3>来店予約</h3>
                      <p>店舗にご来店されたい方</p>
                    </div>
                  </label>
                  {tenant.slug !== 'ikeda-tatami' && (
                    <a href={eventsUrl} className="type-card type-card-link">
                      <div className="type-card-content">
                        <i className="fas fa-calendar-star"></i>
                        <h3>イベント</h3>
                        <p>開催予定のイベントを見る</p>
                      </div>
                    </a>
                  )}
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn btn-primary btn-next">次へ <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>

              {/* ステップ2: 詳細入力 */}
              <div className="form-step" data-step="2">
                <h2 className="form-step-title">詳細情報を入力してください</h2>
                
                {/* 基本情報（共通） */}
                <div className="form-section">
                  <h3 className="section-title">基本情報</h3>
                  <div className="form-group">
                    <label htmlFor="name" className="required">お名前</label>
                    <input type="text" id="name" name="name" className="form-control" required placeholder="例：山田 太郎" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone" className="required">電話番号</label>
                      <input type="tel" id="phone" name="phone" className="form-control" required placeholder="例：090-1234-5678" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email" className="required">メールアドレス</label>
                      <input type="email" id="email" name="email" className="form-control" required placeholder="例：example@email.com" />
                    </div>
                  </div>
                  <div className="form-group" id="addressGroup">
                    <label htmlFor="address" id="addressLabel">ご住所</label>
                    <input type="text" id="address" name="address" className="form-control" placeholder="例：大阪府大阪市〇〇区〇〇1-2-3" />
                  </div>
                </div>

                {/* ワークショップ選択（ワークショップの場合のみ） */}
                <div id="workshopSection" className="form-section" style={{display: 'none'}}>
                  <h3 className="section-title">ワークショップ種類</h3>
                  
                  {tenant.slug === 'ikeda-tatami' && (
                    <div className="workshop-coming-soon">
                      <h3>体験メニュー準備中</h3>
                      <p>現在、体験メニューを準備しております。<br/>見学のみの予約は可能です。</p>
                    </div>
                  )}
                  
                  {tenant.slug !== 'ikeda-tatami' && (
                    <div className="form-group">
                      <label className="required">体験内容</label>
                      <div className="radio-group">
                      <label className="radio-card">
                        <input type="radio" name="workshop_type" value="mini_tatami" />
                        <div className="radio-card-content">
                          <strong>ミニ畳作り体験</strong>
                          <p>タッカー：2,500円（30〜60分）<br/>手縫い：4,000円（60〜90分）</p>
                        </div>
                      </label>
                      <label className="radio-card">
                        <input type="radio" name="workshop_type" value="rose" />
                        <div className="radio-card-content">
                          <strong>畳縁で薔薇づくり体験</strong>
                          <p>1,000円（30分）※2つ作ります</p>
                        </div>
                      </label>
                      <label className="radio-card">
                        <input type="radio" name="workshop_type" value="hand_sewing" />
                        <div className="radio-card-content">
                          <strong>畳手縫い体験</strong>
                          <p>その場：10,000円（120分）<br/>持ち帰り：25,000円（120分）</p>
                        </div>
                      </label>
                      <label className="radio-card">
                        <input type="radio" name="workshop_type" value="mat_sewing" />
                        <div className="radio-card-content">
                          <strong>ゴザ手縫い体験</strong>
                          <p>6,000円（60〜90分）<br/>玄関マットサイズのゴザを作って持ち帰り</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  )}

                  {/* ミニ畳のオプション */}
                  {tenant.slug !== 'ikeda-tatami' && (
                  <>
                  <div id="miniTatamiOptions" className="form-group options-group" style={{display: 'none'}}>
                    <label className="required">作成方法</label>
                    <div className="radio-inline-group">
                      <label className="radio-inline">
                        <input type="radio" name="workshop_option" value="tacker" />
                        <span>タッカー</span>
                      </label>
                      <label className="radio-inline">
                        <input type="radio" name="workshop_option" value="hand_sewing" />
                        <span>手縫い</span>
                      </label>
                    </div>
                  </div>

                  {/* 畳手縫いのオプション */}
                  <div id="handSewingOptions" className="form-group options-group" style={{display: 'none'}}>
                    <label className="required">体験方法</label>
                    <div className="radio-inline-group">
                      <label className="radio-inline">
                        <input type="radio" name="workshop_option" value="onsite" />
                        <span>その場で体験</span>
                      </label>
                      <label className="radio-inline">
                        <input type="radio" name="workshop_option" value="takeaway" />
                        <span>畳を持ち帰る</span>
                      </label>
                    </div>
                  </div>

                  {/* 参加人数 */}
                  <div className="form-group">
                    <label className="required">参加人数</label>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="participants_children">子ども（小学4年生以上）</label>
                        <input type="number" id="participants_children" name="participants_children" className="form-control" min="0" defaultValue="0" placeholder="0" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="participants_adults">大人（中学生以上）</label>
                        <input type="number" id="participants_adults" name="participants_adults" className="form-control" min="0" defaultValue="0" placeholder="0" />
                      </div>
                    </div>
                    <p className="note-text"><i className="fas fa-info-circle"></i> 小学3年生以下のお子様は保護者の方と必ずご一緒に作業してください。</p>
                  </div>
                  </>
                  )}
                </div>

                {/* 依頼内容・懸念点 */}
                <div className="form-section">
                  <h3 className="section-title">詳細内容</h3>
                  <div className="form-group">
                    <label htmlFor="request_content" id="requestContentLabel">依頼内容</label>
                    <textarea id="request_content" name="request_content" className="form-control" rows={4} placeholder="具体的な内容をご記入ください"></textarea>
                  </div>
                  <div className="form-group">
                    <label htmlFor="concerns">懸念点・聞いてみたいこと</label>
                    <textarea id="concerns" name="concerns" className="form-control" rows={4} placeholder="お気軽にご質問ください"></textarea>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary btn-prev"><i className="fas fa-arrow-left"></i> 戻る</button>
                  <button type="button" className="btn btn-primary btn-next">次へ <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>

              {/* ステップ3: 日時選択 */}
              <div className="form-step" data-step="3">
                <h2 className="form-step-title">ご希望の日時を選択してください</h2>
                
                <div className="form-section">
                  <div className="form-group">
                    <label className="required">ご希望日</label>
                    <div id="calendarContainer" className="calendar-container">
                      <div className="calendar-header">
                        <button type="button" className="calendar-nav-btn" id="prevMonth">
                          <i className="fas fa-chevron-left"></i>
                        </button>
                        <div className="calendar-month" id="calendarMonth"></div>
                        <button type="button" className="calendar-nav-btn" id="nextMonth">
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </div>
                      <div className="calendar-weekdays">
                        <div className="calendar-weekday">日</div>
                        <div className="calendar-weekday">月</div>
                        <div className="calendar-weekday">火</div>
                        <div className="calendar-weekday">水</div>
                        <div className="calendar-weekday">木</div>
                        <div className="calendar-weekday">金</div>
                        <div className="calendar-weekday">土</div>
                      </div>
                      <div className="calendar-days" id="calendarDays"></div>
                    </div>
                    <input type="hidden" id="reservation_date" name="reservation_date" required />
                  </div>
                  
                  <div className="form-group" id="timeSlotsGroup" style={{display: 'none'}}>
                    <label className="required">ご希望時間</label>
                    <div id="availableTimeSlots" className="time-slots-grid">
                      <div className="loading">日付を選択してください</div>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary btn-prev"><i className="fas fa-arrow-left"></i> 戻る</button>
                  <button type="button" className="btn btn-primary btn-next">次へ <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>

              {/* ステップ4: 確認 */}
              <div className="form-step" data-step="4">
                <h2 className="form-step-title">入力内容をご確認ください</h2>
                
                <div id="confirmationContent" className="confirmation-content"></div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary btn-prev"><i className="fas fa-arrow-left"></i> 戻る</button>
                  <button type="submit" className="btn btn-primary btn-submit"><i className="fas fa-check"></i> 予約を確定する</button>
                </div>
              </div>
            </form>
          </div>
        </main>

        {/* フッター */}
        <footer className="footer">
          <p>&copy; {tenant.slug === 'ikeda-tatami' ? '1964' : '1958'} {tenant.tenant_name}. All rights reserved.</p>
          {tenant.email && (
            <p><a href={`https://${tenant.slug}.com/`} target="_blank" rel="noopener">公式ウェブサイト</a></p>
          )}
        </footer>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      return {
        props: {
          tenant: null,
          error: 'テナントが見つかりませんでした'
        }
      }
    }

    return {
      props: {
        tenant: data
      }
    }
  } catch (err) {
    console.error('Error fetching tenant:', err)
    return {
      props: {
        tenant: null,
        error: 'サーバーエラーが発生しました'
      }
    }
  }
}
