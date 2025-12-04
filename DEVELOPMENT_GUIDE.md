# 開発ガイド

このドキュメントは、プロジェクトの開発・運用方法を説明します。
コーディング不要で、コピー&ペーストのみで運用できます。

---

## 📁 プロジェクト構造

```
reservation-system/
├── pages/                    # Next.jsページ
│   ├── _app.tsx             # アプリケーションルート
│   ├── _document.tsx        # HTMLドキュメント設定
│   ├── [slug]/              # 動的ルーティング（テナントごと）
│   │   ├── index.tsx        # 予約フォーム
│   │   ├── admin.tsx        # 管理画面
│   │   ├── events.tsx       # イベント一覧
│   │   └── success.tsx      # 予約完了画面
│   └── api/                 # API Routes
│       ├── reservations.ts  # 予約API
│       └── line-notify.ts   # LINE通知API
├── lib/                     # ライブラリ・ユーティリティ
│   └── supabase.ts         # Supabase設定・型定義
├── styles/                  # スタイルシート
│   └── globals.css         # グローバルCSS
├── public/                  # 静的ファイル
│   ├── css/                # レガシーCSS（ハイブリッドモード用）
│   └── js/                 # レガシーJS（ハイブリッドモード用）
├── .env.local              # 環境変数（ローカル）
├── .env.example            # 環境変数テンプレート
├── package.json            # 依存関係
├── tsconfig.json           # TypeScript設定
├── next.config.js          # Next.js設定
├── PROJECT_INFO.md         # プロジェクト情報 ★重要★
├── DEVELOPMENT_GUIDE.md    # 開発ガイド（このファイル）
└── README.md               # プロジェクト概要
```

---

## 🔄 開発フロー

### 1. 日常的な修正・改善

#### ステップ1：Gensparkで開発
```
1. 新しいGensparkタブを開く
2. PROJECT_INFO.mdの内容を全てコピペして共有
3. 「〇〇を修正したい」と依頼
4. AIが修正コードを生成
5. Gensparkで動作確認
```

#### ステップ2：本番環境に反映
```
6. GitHub Webを開く
7. 該当ファイルを開いて「Edit」ボタンをクリック
8. Gensparkで生成されたコードをコピペ
9. 「Commit changes」をクリック
10. Vercelが自動デプロイ（2〜3分）
11. 本番環境で動作確認
```

---

### 2. 新しいクライアントを追加

#### 事前準備
クライアントから以下の情報を取得：
- テナント名（例：田中畳店）
- 希望URL slug（例：tanaka-tatami）
- メールアドレス
- 電話番号
- LINE公式アカウント情報
  - Channel Access Token
  - User ID

#### ステップ1：Cloudflare Workerを作成

```
1. Cloudflare Workersダッシュボードを開く
   https://dash.cloudflare.com/

2. 「Create Worker」をクリック

3. Worker名: [slug]-line-notify
   例：tanaka-tatami-line-notify

4. 以下のコードを貼り付け：
```

```javascript
// [このプロジェクトのcloudflare-worker.jsの内容をコピー]
```

```
5. 環境変数を設定：
   - LINE_CHANNEL_ACCESS_TOKEN: [クライアントのトークン]
   - LINE_USER_ID: [クライアントのUser ID]

6. Worker URLをコピー：
   例：https://tanaka-tatami-line-notify.okuitatami.workers.dev
```

#### ステップ2：Supabaseにテナント情報を登録

```
1. Supabaseダッシュボードを開く
   https://uqnwtzgtzhvysuhjkrul.supabase.co

2. SQL Editorを開く

3. 以下のSQLを実行：
```

```sql
INSERT INTO tenants (
  tenant_name,
  slug,
  email,
  phone,
  line_channel_access_token,
  line_user_id,
  cloudflare_worker_url
) VALUES (
  '田中畳店',
  'tanaka-tatami',
  'info@tanaka-tatami.com',
  '090-1234-5678',
  '[クライアントのLINE Channel Access Token]',
  '[クライアントのLINE User ID]',
  'https://tanaka-tatami-line-notify.okuitatami.workers.dev'
);

-- 登録確認
SELECT * FROM tenants WHERE slug = 'tanaka-tatami';
```

#### ステップ3：動作確認

```
1. ブラウザで予約フォームを開く
   https://[your-domain]/tanaka-tatami

2. テスト予約を実行

3. 確認事項：
   ✅ 予約がSupabaseに保存される
   ✅ クライアントのLINEに通知が届く
   ✅ 管理画面で予約が確認できる
```

#### ステップ4：クライアントに提供

```
クライアントに以下の情報を提供：

■ 予約フォームURL
https://[your-domain]/tanaka-tatami

■ 管理画面URL
https://[your-domain]/tanaka-tatami/admin

■ イベントページURL
https://[your-domain]/tanaka-tatami/events

■ 使い方ガイド
[README.mdから該当セクションをコピー]
```

---

### 3. 予約可能枠を設定

#### 方法1：管理画面から設定（推奨）

```
1. 管理画面を開く
   https://[your-domain]/[slug]/admin

2. 「予約可能枠管理」タブをクリック

3. 「予約可能枠を追加」ボタンをクリック

4. 以下を入力：
   - 予約種別：見積依頼/ワークショップ/来店予約
   - 日付：YYYY-MM-DD
   - 時間：HH:MM
   - 最大人数：1〜10

5. 「保存」をクリック
```

#### 方法2：SQLで一括登録

```
1. Supabase SQL Editorを開く

2. 以下のSQLを実行：
```

```sql
-- 例：2025年12月の平日10:00〜17:00の枠を一括登録
INSERT INTO available_slots (tenant_id, reservation_type, date, time, max_capacity)
SELECT 
  '[テナントID]',
  'estimate',
  date::text,
  time::text,
  1
FROM 
  generate_series('2025-12-01'::date, '2025-12-31'::date, '1 day'::interval) AS date,
  generate_series('10:00'::time, '17:00'::time, '1 hour'::interval) AS time
WHERE 
  EXTRACT(DOW FROM date) NOT IN (0, 6); -- 土日を除外
```

---

## 🛠️ トラブルシューティング

### 問題：LINE通知が届かない

**原因1：Cloudflare Worker URLが間違っている**
```
解決策：
1. Supabaseでテナント情報を確認
2. cloudflare_worker_urlが正しいか確認
3. 間違っていたら修正：

UPDATE tenants 
SET cloudflare_worker_url = '[正しいURL]'
WHERE slug = '[テナントslug]';
```

**原因2：LINE設定が間違っている**
```
解決策：
1. LINE Developers Consoleを開く
2. Channel Access Tokenを確認
3. User IDを確認
4. Cloudflare Workersの環境変数を更新
```

### 問題：予約が保存されない

**原因：Supabase接続エラー**
```
解決策：
1. .env.localを確認
2. NEXT_PUBLIC_SUPABASE_URLが正しいか確認
3. NEXT_PUBLIC_SUPABASE_ANON_KEYが正しいか確認
4. Vercelの環境変数も確認（本番環境の場合）
```

### 問題：デプロイが失敗する

**原因：ビルドエラー**
```
解決策：
1. Vercelのログを確認
2. エラーメッセージをコピー
3. Gensparkで「以下のエラーを修正してください」と依頼
4. 修正コードをGitHubにプッシュ
```

---

## 📊 運用フロー

### 日次運用
```
1. 管理画面で新規予約を確認
2. LINEで通知を確認
3. 必要に応じて顧客に連絡
```

### 週次運用
```
1. 予約状況を確認
2. 予約可能枠を調整
3. イベント情報を更新
```

### 月次運用
```
1. 予約データをエクスポート（CSV）
2. 統計レポート作成
3. 翌月の予約可能枠を設定
```

---

## 🔐 セキュリティ

### 環境変数の管理

**❌ してはいけないこと**
- GitHubに.env.localをプッシュ
- 公開チャットでトークンを共有
- スクリーンショットにトークンを含める

**✅ すべきこと**
- .env.localは.gitignoreに含まれている（デフォルト）
- Vercelの環境変数は暗号化されている
- Cloudflare Workersの環境変数も暗号化

---

## 💰 コスト管理

### 無料枠の範囲
```
✅ Vercel: 月間100GBトラフィック
✅ Supabase: 500MBデータベース、2GB転送
✅ Cloudflare Workers: 月間10万リクエスト
✅ LINE Messaging API: 月間1,000メッセージ
```

### 課金が発生する場合
```
⚠️ Vercel: 100GB超過後 $20/100GB
⚠️ Supabase: 500MB超過後 $25/月〜
⚠️ Cloudflare Workers: 10万リクエスト超過後 $5/1000万リクエスト
⚠️ LINE: 1,000メッセージ超過後 無料（追加課金なし）
```

### コスト予測（50クライアント）
```
月間予約数: 500件
月間LINE通知: 500件
データベースサイズ: 100MB
トラフィック: 50GB

想定コスト: 月額 $0〜$25
（ほとんどのケースで無料枠内）
```

---

## 📞 サポート

### Gensparkで質問する際のテンプレート

```
こんにちは。以下のプロジェクトについて質問があります。

[PROJECT_INFO.mdの内容を全てコピペ]

■ 質問内容
[具体的な質問や問題を記載]

■ エラーメッセージ（ある場合）
[エラー内容をコピペ]

■ 試したこと
[既に試したことを記載]

よろしくお願いします。
```

---

**最終更新**: 2025-12-03  
**バージョン**: 1.0.0
