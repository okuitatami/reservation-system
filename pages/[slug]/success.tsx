import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, Tenant } from '@/lib/supabase'

interface Props {
  tenant: Tenant | null
  error?: string
}

export default function SuccessPage({ tenant, error }: Props) {
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

  const indexUrl = `/${tenant.slug}`;
  const officialSiteUrl = tenant.email ? `https://${tenant.slug}.com/` : '#';

  return (
    <>
      <Head>
        <title>予約完了 - {tenant.tenant_name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
      </Head>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .body-container {
          font-family: 'Noto Sans JP', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ebe8 100%);
          color: #333;
          line-height: 1.6;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .success-container {
          max-width: 600px;
          width: 100%;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          padding: 3rem;
          text-align: center;
          animation: fadeInUp 0.5s ease;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .success-icon {
          width: 100px;
          height: 100px;
          background: #3388c1;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 2rem;
          animation: scaleIn 0.5s ease 0.2s both;
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        .success-icon i {
          font-size: 3rem;
          color: white;
        }

        .success-title {
          font-size: 2rem;
          color: #3388c1;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .success-message {
          font-size: 1.1rem;
          color: #666;
          margin-bottom: 2rem;
          line-height: 1.8;
        }

        .info-box {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: left;
        }

        .info-box h3 {
          color: #3388c1;
          font-size: 1.1rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .info-box p {
          color: #555;
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
          line-height: 1.7;
        }

        .info-box p:last-child {
          margin-bottom: 0;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn {
          padding: 0.8rem 2rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          font-family: inherit;
        }

        .btn-primary {
          background: #3388c1;
          color: white;
        }

        .btn-primary:hover {
          background: #2670a0;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(51, 136, 193, 0.3);
        }

        .btn-secondary {
          background: white;
          color: #3388c1;
          border: 2px solid #3388c1;
        }

        .btn-secondary:hover {
          background: #e8f4fb;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .success-container {
            padding: 2rem 1.5rem;
          }

          .success-title {
            font-size: 1.6rem;
          }

          .success-message {
            font-size: 1rem;
          }

          .button-group {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="body-container">
        <div className="success-container">
          <div className="success-icon">
            <i className="fas fa-check"></i>
          </div>

          <h1 className="success-title">予約を受け付けました</h1>
          
          <p className="success-message">
            ご予約ありがとうございます。<br/>
            ご入力いただいたメールアドレス宛に確認メールを送信いたしました。<br/>
            <br/>
            当日はどうぞよろしくお願いいたします。<br/>
            <br/>
            <span style={{fontSize: '0.9rem', color: '#888'}}>※内容拝見後、お電話またはメールにて確認のご連絡をさせていただく場合があります。</span>
          </p>

          <div className="info-box">
            <h3><i className="fas fa-phone"></i> お問い合わせ</h3>
            <p>ご不明な点がございましたら、お気軽にお電話ください。</p>
            <p><strong>{tenant.tenant_name}</strong></p>
            {tenant.phone && (
              <p style={{fontSize: '1.3rem', fontWeight: 700, color: '#3388c1', marginTop: '0.5rem'}}>
                TEL: {tenant.phone}
              </p>
            )}
          </div>

          <div className="button-group">
            <Link href={indexUrl} className="btn btn-primary">
              <i className="fas fa-home"></i> トップページに戻る
            </Link>
            {officialSiteUrl !== '#' && (
              <a href={officialSiteUrl} className="btn btn-secondary" target="_blank" rel="noopener">
                <i className="fas fa-external-link-alt"></i> 公式サイトへ
              </a>
            )}
          </div>
        </div>
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
