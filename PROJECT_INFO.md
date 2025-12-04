# プロジェクト情報

このドキュメントには、プロジェクトの重要な設定情報がすべて記載されています。
新しいGensparkタブで作業する際は、このファイルの内容を全てコピーして共有してください。

---

## 📋 プロジェクト概要

**プロジェクト名**: Multi-Tenant Reservation System  
**用途**: 畳店向け予約システム（多テナント対応）  
**技術スタック**: Next.js 14 + TypeScript + Supabase + Vercel + Cloudflare Workers  
**作成日**: 2025年12月3日

---

## 🔑 認証情報・環境変数

### Supabase
- **Project URL**: `https://uqnwtzgtzhvysuhjkrul.supabase.co`
- **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbnd0emd0emh2eXN1aGprcnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODk1ODAsImV4cCI6MjA3ODk2NTU4MH0.MaoWGBfBT1zjySV286LeevqeeHy2g6xCtLdRNztn8SQ`

### GitHub
- **Repository**: `reservation-system` (Private)
- **Owner**: [あなたのGitHubユーザー名]

### Vercel
- **Account**: [あなたのVercelアカウント]
- **Project**: まだデプロイされていません

### Cloudflare Workers
- **Account Subdomain**: `okuitatami`

---

## 👥 登録済みテナント情報

### 1. 奥井畳店（初期テナント）

- **Tenant ID**: `6356168c-10bb-4a16-a89a-3f608eddb738`
- **Tenant Name**: `奥井畳店`
- **Slug**: `okui-tatami`
- **Email**: `info@okui-tatami.com`
- **Phone**: `012-345-6789`
- **LINE Channel Access Token**: `yLVTrdOweoztvEp70PqQtOSYV/UyxjrzonOl3e3EG0aj0/+QINTSNDzwLQVxh2jJW3ug0kwXBj2o1qLXBbyvV7X12sc3uEJYKa9xe1N9zR0rZTylIs4FvYf/m1A6ZAYhqMRQbVtx0EoT8b9Tl61YaAdB04t89/1O/w1cDnyilFU=`
- **LINE User ID**: `Ua77bc3a492699eb2a0dbeef8a47f5e26`
- **Cloudflare Worker URL**: `https://okui-tatami-line-notify.okuitatami.workers.dev`
- **予約フォームURL（予定）**: `https://[vercel-domain]/okui-tatami`
- **管理画面URL（予定）**: `https://[vercel-domain]/okui-tatami/admin`

---

## 🗄️ データベース構造

### テーブル一覧

1. **tenants** - テナント情報
2. **reservations** - 通常予約（見積依頼、ワークショップ、来店予約）
3. **events** - イベント情報
4. **event_reservations** - イベント予約
5. **available_slots** - 予約可能枠

### テーブル詳細

#### 1. tenants
```sql
- id: UUID (PK)
- tenant_name: TEXT
- slug: TEXT (UNIQUE)
- email: TEXT
- phone: TEXT
- line_channel_access_token: TEXT
- line_user_id: TEXT
- cloudflare_worker_url: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 2. reservations
```sql
- id: UUID (PK)
- tenant_id: UUID (FK -> tenants)
- reservation_type: TEXT (estimate/workshop/visit)
- reservation_date: TEXT
- reservation_time: TEXT
- name: TEXT
- phone: TEXT
- email: TEXT
- address: TEXT
- workshop_type: TEXT
- workshop_option: TEXT
- participants_adults: INTEGER
- participants_children: INTEGER
- request_content: TEXT
- concerns: TEXT
- status: TEXT (pending/confirmed/cancelled)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 3. events
```sql
- id: UUID (PK)
- tenant_id: UUID (FK -> tenants)
- title: TEXT
- description: TEXT
- event_date: TEXT
- event_time: TEXT
- location: TEXT
- adult_capacity: INTEGER
- child_capacity: INTEGER
- adult_price: NUMERIC
- child_price: NUMERIC
- image_url: TEXT
- status: TEXT (active/cancelled/completed)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 4. event_reservations
```sql
- id: UUID (PK)
- tenant_id: UUID (FK -> tenants)
- event_id: UUID (FK -> events)
- event_name: TEXT
- event_date: TEXT
- name: TEXT
- email: TEXT
- phone: TEXT
- adult_count: INTEGER
- child_count: INTEGER
- child_ages: TEXT
- total_price: NUMERIC
- notes: TEXT
- status: TEXT (pending/confirmed/cancelled)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### 5. available_slots
```sql
- id: UUID (PK)
- tenant_id: UUID (FK -> tenants)
- reservation_type: TEXT (estimate/workshop/visit)
- date: TEXT
- time: TEXT
- max_capacity: INTEGER
- is_available: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

---

## 🔧 システム構成

### URL構造（多テナント対応）

```
https://[domain]/[tenant-slug]           → 予約フォーム
https://[domain]/[tenant-slug]/admin     → 管理画面
https://[domain]/[tenant-slug]/events    → イベント一覧
https://[domain]/[tenant-slug]/success   → 予約完了画面
```

例：奥井畳店の場合
```
https://[domain]/okui-tatami
https://[domain]/okui-tatami/admin
https://[domain]/okui-tatami/events
```

---

## 📦 使用技術・ライブラリ

### フロントエンド
- Next.js 14
- React 18
- TypeScript 5
- CSS（カスタムスタイル）
- Font Awesome 6.4.0
- Google Fonts (Noto Sans JP)

### バックエンド
- Supabase (PostgreSQL)
- Next.js API Routes
- Cloudflare Workers (LINE通知)

### デプロイ・ホスティング
- Vercel (Next.jsアプリ)
- Supabase (データベース)
- Cloudflare Workers (サーバーレス関数)

---

## 🎯 実装済み機能

### フェーズ1（本番環境移行前）- Genspark環境
- ✅ 予約フォーム（見積依頼、ワークショップ、来店予約）
- ✅ カレンダー・時間選択
- ✅ 当日予約の電話案内機能
- ✅ イベント機能
- ✅ イベント予約フォーム
- ✅ 管理画面（予約管理、イベント管理、予約可能枠管理）
- ✅ EMAIL通知（EmailJS経由）
- ✅ LINE通知（Cloudflare Workers経由）
- ✅ レスポンシブデザイン

### フェーズ2（本番環境移行後）- 予定
- ⏳ 多テナント対応完了
- ⏳ Supabase連携完了
- ⏳ Vercelデプロイ完了
- ⏳ 独自ドメイン設定
- ⏳ クライアント追加フロー確立

---

## 🚀 デプロイ手順（概要）

1. GitHubリポジトリ作成 ✅
2. Supabaseプロジェクト作成 ✅
3. データベーステーブル作成 ✅
4. テナント情報登録 ✅
5. Next.jsプロジェクト作成 🔄
6. コードをGitHubにプッシュ ⏳
7. Vercelでデプロイ設定 ⏳
8. 環境変数設定 ⏳
9. 本番環境稼働 ⏳

---

## 📞 サポート・連絡先

プロジェクト管理者: [あなたの名前]  
Email: [あなたのメールアドレス]  
GitHub: [GitHubユーザー名]

---

## 📝 更新履歴

- 2025-12-03: プロジェクト初期構築開始
- 2025-12-03: Supabase設定完了
- 2025-12-03: 奥井畳店テナント登録完了
- 2025-12-03: LINE通知機能実装完了（Cloudflare Workers）

---

## 🔄 新しいGensparkタブでの使用方法

新しいタブで作業を依頼する際は、以下のようにこのファイル全体をコピーして共有してください：

```
こんにちは。以下のプロジェクトの作業をお願いします。

[このPROJECT_INFO.mdの内容を全てコピペ]

■ 今回の依頼内容
[具体的な作業内容を記載]

よろしくお願いします。
```

---

**最終更新**: 2025-12-03  
**バージョン**: 1.0.0
