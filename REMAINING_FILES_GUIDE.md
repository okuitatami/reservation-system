# 🚀 残りのファイル作成ガイド

このドキュメントは、GitHub リポジトリに追加する必要がある残りのファイルをまとめたものです。

---

## 📁 ファイル作成手順

### 1️⃣ `pages/[slug]/index.tsx` (予約フォームページ)

**ファイル名:** `pages/[slug]/index.tsx`

**内容:**
```typescript
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { supabase, Tenant } from '@/lib/supabase'

interface ReservationPageProps {
  tenant: Tenant | null
}

export default function ReservationPage({ tenant }: ReservationPageProps) {
  if (!tenant) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1>テナントが見つかりません</h1>
        <p>指定されたURLは存在しません。</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>予約フォーム - {tenant.tenant_name}</title>
        <meta name="description" content={`${tenant.tenant_name}の見積予約・ワークショップ・来店予約フォーム`} />
        <link rel="stylesheet" href="/css/style.css" />
        <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
      </Head>

      <div dangerouslySetInnerHTML={{ __html: `
        <script>
          window.TENANT_INFO = ${JSON.stringify({
            tenant_name: tenant.tenant_name,
            slug: tenant.slug,
            email: tenant.email,
            phone: tenant.phone,
            line_user_id: tenant.line_user_id,
            cloudflare_worker_url: tenant.cloudflare_worker_url
          })};
          window.API_BASE_URL = '/api';
        </script>
      `}} />

      <header>
        <h1>{tenant.tenant_name} 予約フォーム</h1>
      </header>

      <main className="container">
        <div className="progress-bar">
          <div className="step active">
            <span className="step-number">1</span>
            <span className="step-label">予約種別</span>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <span className="step-label">詳細入力</span>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <span className="step-label">日時選択</span>
          </div>
          <div className="step">
            <span className="step-number">4</span>
            <span className="step-label">確認</span>
          </div>
        </div>

        <form id="reservationForm">
          <div className="step-content active" data-step="1">
            <h2>予約種別を選択してください</h2>
            <div className="button-group">
              <button type="button" className="btn-primary" data-type="estimate">
                <i className="fas fa-calculator"></i>
                見積依頼
              </button>
              <button type="button" className="btn-primary" data-type="workshop">
                <i className="fas fa-users"></i>
                ワークショップ
              </button>
              <button type="button" className="btn-primary" data-type="visit">
                <i className="fas fa-store"></i>
                来店予約
              </button>
              <a href="/[slug]/events" className="btn-secondary">
                <i className="fas fa-calendar-alt"></i>
                イベントを見る
              </a>
            </div>
          </div>

          <div className="step-content" data-step="2">
            <h2>詳細情報をご入力ください</h2>
            <div className="form-group">
              <label htmlFor="name">お名前 <span className="required">*</span></label>
              <input type="text" id="name" name="name" required />
            </div>
            <div className="form-group">
              <label htmlFor="phone">電話番号 <span className="required">*</span></label>
              <input type="tel" id="phone" name="phone" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">メールアドレス <span className="required">*</span></label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="address">住所</label>
              <input type="text" id="address" name="address" />
            </div>

            <div id="workshopFields" style={{ display: 'none' }}>
              <div className="form-group">
                <label htmlFor="workshopType">ワークショップ種別</label>
                <select id="workshopType" name="workshopType">
                  <option value="">選択してください</option>
                  <option value="mini_tatami">ミニ畳</option>
                  <option value="rose">薔薇コースター</option>
                  <option value="hand_sewing">手縫い体験</option>
                  <option value="mat_sewing">マット縫い体験</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="workshopOption">オプション</label>
                <select id="workshopOption" name="workshopOption">
                  <option value="">選択してください</option>
                  <option value="tacker">タッカー使用</option>
                  <option value="hand_sewing">手縫い</option>
                  <option value="onsite">その場で作成</option>
                  <option value="takeaway">持ち帰り</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="participantsAdults">参加人数（大人）</label>
                <input type="number" id="participantsAdults" name="participantsAdults" min="0" value="0" />
              </div>

              <div className="form-group">
                <label htmlFor="participantsChildren">参加人数（子供）</label>
                <input type="number" id="participantsChildren" name="participantsChildren" min="0" value="0" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="requestContent">ご要望・ご質問</label>
              <textarea id="requestContent" name="requestContent" rows={4}></textarea>
            </div>

            <div className="button-group">
              <button type="button" className="btn-secondary" data-action="prev">戻る</button>
              <button type="button" className="btn-primary" data-action="next">次へ</button>
            </div>
          </div>

          <div className="step-content" data-step="3">
            <h2>日時を選択してください</h2>
            <div className="form-group">
              <label htmlFor="reservationDate">予約日 <span className="required">*</span></label>
              <input type="date" id="reservationDate" name="reservationDate" required />
            </div>
            <div className="form-group">
              <label htmlFor="reservationTime">予約時間 <span className="required">*</span></label>
              <select id="reservationTime" name="reservationTime" required>
                <option value="">時間を選択してください</option>
                <option value="09:00">09:00</option>
                <option value="10:00">10:00</option>
                <option value="11:00">11:00</option>
                <option value="13:00">13:00</option>
                <option value="14:00">14:00</option>
                <option value="15:00">15:00</option>
                <option value="16:00">16:00</option>
              </select>
            </div>

            <div className="button-group">
              <button type="button" className="btn-secondary" data-action="prev">戻る</button>
              <button type="button" className="btn-primary" data-action="next">確認画面へ</button>
            </div>
          </div>

          <div className="step-content" data-step="4">
            <h2>予約内容を確認してください</h2>
            <div id="confirmationDetails"></div>
            <div className="button-group">
              <button type="button" className="btn-secondary" data-action="prev">戻る</button>
              <button type="submit" className="btn-primary">予約を確定する</button>
            </div>
          </div>
        </form>
      </main>

      <footer>
        <p>&copy; 2024 {tenant.tenant_name}. All rights reserved.</p>
      </footer>

      <script src="/js/script.js"></script>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !tenant) {
    return {
      props: {
        tenant: null,
      },
    }
  }

  return {
    props: {
      tenant,
    },
  }
}
```

---

### 2️⃣ `pages/[slug]/success.tsx` (予約完了ページ)

**ファイル名:** `pages/[slug]/success.tsx`

**内容:**
```typescript
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { supabase, Tenant } from '@/lib/supabase'

interface SuccessPageProps {
  tenant: Tenant | null
}

export default function SuccessPage({ tenant }: SuccessPageProps) {
  if (!tenant) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1>テナントが見つかりません</h1>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>予約完了 - {tenant.tenant_name}</title>
        <meta name="description" content={`${tenant.tenant_name}への予約が完了しました`} />
        <link rel="stylesheet" href="/css/style.css" />
      </Head>

      <header>
        <h1>{tenant.tenant_name}</h1>
      </header>

      <main className="container" style={{ textAlign: 'center', padding: '50px 20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <i className="fas fa-check-circle" style={{ fontSize: '80px', color: '#4CAF50', marginBottom: '30px' }}></i>
          <h2>予約を受け付けました</h2>
          <p style={{ fontSize: '18px', marginBottom: '30px' }}>
            ご予約ありがとうございます。<br />
            確認メールを送信いたしました。
          </p>

          <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <h3>お問い合わせ先</h3>
            <p>
              <i className="fas fa-phone"></i> TEL: {tenant.phone || '078-841-0351'}<br />
              <i className="fas fa-envelope"></i> Email: {tenant.email || 'info@okui-tatami.com'}
            </p>
          </div>

          <div className="button-group" style={{ justifyContent: 'center' }}>
            <Link href={`/${tenant.slug}`} className="btn-primary">
              <i className="fas fa-home"></i> トップページへ戻る
            </Link>
            <a href="https://okui-tatami.com/" className="btn-secondary" target="_blank" rel="noopener noreferrer">
              <i className="fas fa-external-link-alt"></i> 公式サイトを見る
            </a>
          </div>
        </div>
      </main>

      <footer>
        <p>&copy; 2024 {tenant.tenant_name}. All rights reserved.</p>
      </footer>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !tenant) {
    return {
      props: {
        tenant: null,
      },
    }
  }

  return {
    props: {
      tenant,
    },
  }
}
```

---

### 3️⃣ `styles/globals.css`

**ファイル名:** `styles/globals.css`

**内容:**
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans JP', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

header {
  background-color: #2c3e50;
  color: white;
  padding: 20px;
  text-align: center;
}

footer {
  background-color: #2c3e50;
  color: white;
  text-align: center;
  padding: 20px;
  margin-top: 50px;
}

.btn-primary {
  background-color: #3498db;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  text-decoration: none;
  display: inline-block;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  text-decoration: none;
  display: inline-block;
}

.btn-secondary:hover {
  background-color: #7f8c8d;
}

.button-group {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.required {
  color: #e74c3c;
}

.progress-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40px;
  padding: 0 20px;
}

.step {
  flex: 1;
  text-align: center;
  position: relative;
}

.step-number {
  display: inline-block;
  width: 40px;
  height: 40px;
  line-height: 40px;
  border-radius: 50%;
  background-color: #ddd;
  color: #666;
  font-weight: bold;
  margin-bottom: 5px;
}

.step.active .step-number {
  background-color: #3498db;
  color: white;
}

.step-label {
  display: block;
  font-size: 12px;
  color: #666;
}

.step.active .step-label {
  color: #3498db;
  font-weight: bold;
}

.step-content {
  display: none;
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.step-content.active {
  display: block;
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }

  .button-group {
    flex-direction: column;
  }

  .progress-bar {
    padding: 0 5px;
  }

  .step-label {
    font-size: 10px;
  }

  .step-number {
    width: 30px;
    height: 30px;
    line-height: 30px;
    font-size: 14px;
  }
}
```

---

### 4️⃣ `public/` フォルダのファイル

`public/` フォルダには、既存の HTML、CSS、JavaScript ファイルをそのまま配置してください。

**必要なファイル:**
- `public/css/style.css`
- `public/js/script.js`
- `public/js/admin.js`
- `public/js/events.js`
- `public/js/event-reservation.js`
- `public/admin.html`
- `public/events.html`
- `public/event-detail.html`

これらのファイルは、Genspark プロジェクトから既に用意されているはずです。GitHub にアップロードする際は、**`public/` フォルダ配下に配置**してください。

---

## 📝 アップロード手順のまとめ

1. **GitHub リポジトリにアクセス**: https://github.com/okuitatami/reservation-system
2. **"Add file" → "Create new file"** をクリック
3. **ファイル名を入力** (例: `pages/[slug]/index.tsx`)
4. **上記の内容をコピペ**
5. **Commit message を入力** (例: `Add reservation form page`)
6. **"Commit new file"** をクリック

---

## 🎯 次のステップ

全てのファイルをアップロードした後は、**Vercel デプロイ**に進みます。

詳しくは `DEPLOY_GUIDE.md` をご覧ください。

---

## 💡 サポート

ファイルのアップロード中に問題が発生した場合は、スクリーンショットを共有していただければサポートいたします。

