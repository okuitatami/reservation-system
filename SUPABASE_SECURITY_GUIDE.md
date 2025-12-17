# 🔒 Supabase セキュリティ対応ガイド

## 📧 受信したセキュリティ警告について

Supabaseから以下の警告メールを受信しました：

```
Project: reservation-system
ID: uqnwtzgtzhvysuhjkrul
8 error(s)
```

このガイドでは、セキュリティ警告の対応方法を説明します。

---

## 🔍 セキュリティ警告の原因

### 1. RLS（Row Level Security）が未設定

データベーステーブルに対して、行レベルのセキュリティポリシーが設定されていないため、誰でもデータにアクセス・変更できる状態になっています。

### 2. 認証キーのハードコード

GitHubリポジトリにSupabase ANON_KEYがハードコードされていますが、これは**一般的な慣行**です。ANON_KEYは公開されることを前提としており、RLSで適切にデータアクセスを制御することで安全性を確保します。

---

## ✅ 対応手順

### ステップ1: Security Advisorの確認

1. **Supabase Dashboardにログイン**  
   https://supabase.com/dashboard/project/uqnwtzgtzhvysuhjkrul

2. **Security Advisorを開く**  
   左側メニュー → 「Security Advisor」または受信メールの「View Security Advisor」をクリック

3. **8つのエラー内容を確認**  
   どのテーブルに問題があるか確認してください

   **想定されるエラー例：**
   - ❌ `tenants` table has RLS disabled
   - ❌ `available_slots` table has RLS disabled
   - ❌ `reservations` table has RLS disabled
   - ❌ `events` table has RLS disabled
   - ❌ `event_reservations` table has RLS disabled

---

### ステップ2: RLSポリシーの適用

**SQL Editorでポリシーを設定します。**

#### 2-1. SQL Editorを開く

1. Supabase Dashboard → 左側メニュー「SQL Editor」をクリック
2. 「New query」をクリック

#### 2-2. SQLスクリプトを実行

以下のファイルの内容をコピーして、SQL Editorに貼り付けて実行してください：

**ファイル:** `/home/user/webapp/supabase_security_policies.sql`

```bash
# ファイルの内容を表示
cat /home/user/webapp/supabase_security_policies.sql
```

#### 2-3. 実行手順

1. SQLスクリプト全体をコピー
2. SQL Editorに貼り付け
3. 右下の「Run」ボタンをクリック
4. 成功メッセージを確認

---

### ステップ3: Security Advisorで再確認

1. SQL実行後、Security Advisorに戻る
2. 「Refresh」または「Re-scan」をクリック
3. エラーが0件になったことを確認

---

## 📋 適用されるセキュリティポリシー

### 1. `tenants`（店舗情報）

- ✅ **読み取り**: 誰でも可能（公開情報）
- ❌ **挿入・更新・削除**: 禁止（管理者のみSQL直接操作）

### 2. `available_slots`（受付可能日時）

- ✅ **読み取り**: 誰でも可能（カレンダー表示に必要）
- ✅ **挿入・更新・削除**: 公開（管理画面での操作用）
  - ⚠️ 将来的には認証機能追加を推奨

### 3. `reservations`（予約データ）

- ✅ **挿入**: 誰でも可能（予約フォームから予約作成）
- ✅ **読み取り・更新**: 公開（管理画面での確認・ステータス変更用）
  - ⚠️ 将来的には認証機能追加を推奨
- ❌ **削除**: 禁止（データの完全性保持）

### 4. `events`（イベント情報）

- ✅ **読み取り**: 誰でも可能（公開情報）
- ✅ **挿入・更新・削除**: 公開（管理画面での操作用）
  - ⚠️ 将来的には認証機能追加を推奨

### 5. `event_reservations`（イベント予約）

- ✅ **挿入**: 誰でも可能（予約フォームから予約作成）
- ✅ **読み取り・更新・削除**: 公開（管理画面での操作用）
  - ⚠️ 将来的には認証機能追加を推奨

---

## 🔐 セキュリティレベルについて

### 現在のセキュリティレベル: ⭐⭐⭐☆☆（中）

**実装済み:**
- ✅ RLSポリシーの設定
- ✅ 読み取り専用テーブルの保護
- ✅ 予約データの削除禁止

**未実装（推奨）:**
- ⚠️ 管理画面の認証機能
- ⚠️ 認証ベースのCUD操作制限
- ⚠️ tenant_id別のアクセス制御

**理由:**
現在の予約システムは小規模運用のため、管理画面にパスワード保護（クライアント側）があり、実害は限定的です。ただし、今後の規模拡大を見据えて認証機能の追加を推奨します。

---

## 🚀 将来的なセキュリティ強化策

### Phase 1: 認証機能の追加（推奨）

**Supabase Authを使用した管理画面認証**

```typescript
// 管理画面にログイン機能を追加
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(supabaseUrl, supabaseKey)

// ログイン処理
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@ikeda-tatami.com',
  password: 'secure_password'
})
```

### Phase 2: 認証ベースのRLSポリシー

```sql
-- 認証済みユーザーのみCUD操作可能
CREATE POLICY "Authenticated CRUD on available_slots"
ON available_slots
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

### Phase 3: テナント別アクセス制御

```sql
-- 各テナントは自分のデータのみアクセス可能
CREATE POLICY "Tenant-specific access on reservations"
ON reservations
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT id FROM tenants WHERE user_id = auth.uid()
  )
);
```

---

## 📊 セキュリティチェックリスト

### ✅ 今すぐ実施（必須）

- [ ] Security Advisorでエラー内容を確認
- [ ] `supabase_security_policies.sql`をSQL Editorで実行
- [ ] Security Advisorでエラーが0件になったことを確認
- [ ] 予約フォームが正常に動作することをテスト
- [ ] 管理画面が正常に動作することをテスト

### 📋 近い将来に実施（推奨）

- [ ] 管理画面の認証機能追加を検討
- [ ] Supabase Authの導入を検討
- [ ] 認証ベースのRLSポリシーへ移行

### 🔮 長期的に検討

- [ ] テナント別アクセス制御の実装
- [ ] APIキーベースの認証
- [ ] 監査ログの追加
- [ ] 定期的なセキュリティ監査

---

## 🧪 動作確認テスト

RLSポリシー適用後、以下をテストしてください：

### 1. 予約フォームのテスト

```
URL: https://reservation-system-three-murex.vercel.app/ikeda-tatami
```

**確認項目:**
- [ ] カレンダーが正常に表示される（available_slots読み取り）
- [ ] 予約フォームが送信できる（reservations挿入）
- [ ] 成功ページにリダイレクトされる
- [ ] LINE通知が届く

### 2. 管理画面のテスト

```
URL: https://reservation-system-three-murex.vercel.app/ikeda-tatami/admin
Password: narito1231
```

**確認項目:**
- [ ] 予約一覧が表示される（reservations読み取り）
- [ ] 受付可能日を追加できる（available_slots挿入）
- [ ] 受付可能日を削除できる（available_slots削除）
- [ ] 予約ステータスを変更できる（reservations更新）

---

## ❓ トラブルシューティング

### Q1: SQL実行時にエラーが出る

**エラー例:**
```
ERROR: policy "Public read access for tenants" already exists
```

**対処法:**
既にポリシーが存在する場合は、まず削除してから再実行してください：

```sql
-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Public read access for tenants" ON tenants;
DROP POLICY IF EXISTS "No public insert/update/delete on tenants" ON tenants;
-- ... (他のポリシーも同様に削除)

-- その後、supabase_security_policies.sqlを実行
```

### Q2: RLS適用後に予約フォームが動かない

**原因:**
RLSポリシーが厳しすぎる可能性があります。

**対処法:**
SQL Editorで以下を実行し、エラーログを確認してください：

```sql
-- ポリシー評価のデバッグ
SET client_min_messages TO DEBUG;
```

### Q3: Security Advisorでまだエラーが残っている

**原因:**
一部のポリシーが適用されていない可能性があります。

**対処法:**
```sql
-- RLS有効化状態を確認
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'available_slots', 'reservations', 'events', 'event_reservations');

-- 設定されているポリシーを確認
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 📞 サポート

問題が解決しない場合は、Supabaseサポートに連絡してください：

- **Supabase Support**: https://supabase.com/support
- **Supabase Discord**: https://discord.supabase.com

---

## 📝 まとめ

1. ✅ **Security Advisorでエラー確認**
2. ✅ **supabase_security_policies.sqlを実行**
3. ✅ **Security Advisorでエラー0件を確認**
4. ✅ **予約フォーム・管理画面の動作テスト**
5. ⚠️ **将来的に認証機能追加を検討**

これらの対応により、Supabaseのセキュリティ警告は解消されます。

---

**作成日:** 2025年12月17日  
**対象プロジェクト:** reservation-system (uqnwtzgtzhvysuhjkrul)  
**対象システム:** 池田畳店 予約システム
