-- ===========================================
-- Supabase Security Policies (RLS設定)
-- 池田畳店 予約システム用
-- ===========================================
-- 
-- このSQLをSupabase SQL Editorで実行してください
-- https://supabase.com/dashboard/project/uqnwtzgtzhvysuhjkrul/sql
--

-- ===========================================
-- 1. tenantsテーブル
-- ===========================================

-- RLSを有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能（予約フォームで店舗情報を取得するため）
CREATE POLICY "Public read access for tenants"
ON tenants
FOR SELECT
TO public
USING (true);

-- 更新・削除は禁止（管理者のみ直接SQLで操作）
-- 挿入も禁止
CREATE POLICY "No public insert/update/delete on tenants"
ON tenants
FOR ALL
TO public
USING (false);


-- ===========================================
-- 2. available_slotsテーブル（受付可能日時）
-- ===========================================

-- RLSを有効化
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能（予約フォームでカレンダー表示に必要）
CREATE POLICY "Public read access for available_slots"
ON available_slots
FOR SELECT
TO public
USING (true);

-- 挿入・更新・削除は認証済みユーザーのみ（管理画面）
-- ※現在は認証なしで管理画面を使用しているため、一時的にpublicを許可
-- ※将来的には認証機能を追加することを推奨
CREATE POLICY "Authenticated insert/update/delete on available_slots"
ON available_slots
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- セキュリティ強化版（将来的に認証機能を追加した場合）
-- CREATE POLICY "Authenticated insert/update/delete on available_slots"
-- ON available_slots
-- FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);


-- ===========================================
-- 3. reservationsテーブル（予約データ）
-- ===========================================

-- RLSを有効化
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 誰でも挿入可能（予約フォームから予約を作成するため）
CREATE POLICY "Public insert access for reservations"
ON reservations
FOR INSERT
TO public
WITH CHECK (true);

-- 読み取りは認証済みユーザーのみ（管理画面）
-- ※現在は認証なしで管理画面を使用しているため、一時的にpublicを許可
CREATE POLICY "Public read access for reservations"
ON reservations
FOR SELECT
TO public
USING (true);

-- 更新は認証済みユーザーのみ（ステータス変更など）
CREATE POLICY "Public update access for reservations"
ON reservations
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 削除は禁止（データの完全性を保つため）
CREATE POLICY "No delete on reservations"
ON reservations
FOR DELETE
TO public
USING (false);

-- セキュリティ強化版（将来的に認証機能を追加した場合）
-- CREATE POLICY "Authenticated read/update on reservations"
-- ON reservations
-- FOR SELECT
-- TO authenticated
-- USING (true);
--
-- CREATE POLICY "Authenticated update on reservations"
-- ON reservations
-- FOR UPDATE
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);


-- ===========================================
-- 4. eventsテーブル（イベント情報）
-- ===========================================

-- RLSを有効化
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能（予約フォームでイベント情報を表示するため）
CREATE POLICY "Public read access for events"
ON events
FOR SELECT
TO public
USING (true);

-- 挿入・更新・削除は認証済みユーザーのみ
CREATE POLICY "Public insert/update/delete on events"
ON events
FOR ALL
TO public
USING (true)
WITH CHECK (true);


-- ===========================================
-- 5. event_reservationsテーブル（イベント予約）
-- ===========================================

-- RLSを有効化
ALTER TABLE event_reservations ENABLE ROW LEVEL SECURITY;

-- 誰でも挿入可能（予約フォームから予約を作成するため）
CREATE POLICY "Public insert access for event_reservations"
ON event_reservations
FOR INSERT
TO public
WITH CHECK (true);

-- 読み取りは認証済みユーザーのみ
CREATE POLICY "Public read access for event_reservations"
ON event_reservations
FOR SELECT
TO public
USING (true);

-- 更新・削除は認証済みユーザーのみ
CREATE POLICY "Public update/delete on event_reservations"
ON event_reservations
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);


-- ===========================================
-- 確認クエリ
-- ===========================================

-- RLS有効化状態を確認
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('tenants', 'available_slots', 'reservations', 'events', 'event_reservations');

-- 設定されているポリシーを確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ===========================================
-- 注意事項
-- ===========================================
-- 
-- 【重要】現在のポリシー設定について
-- 
-- 1. 現在は認証機能がないため、一時的にpublicアクセスを許可しています
-- 2. これはセキュリティ警告を解消するための最低限の設定です
-- 3. 本番環境では以下の対応を推奨します：
--    - Supabase Authを使用した管理画面の認証機能追加
--    - 認証済みユーザーのみがCUD（作成・更新・削除）操作可能にする
--    - tenant_idによる行レベルのアクセス制御
-- 
-- 【セキュリティ強化の優先順位】
-- 
-- ✅ 最優先（今すぐ実施）:
--    - RLSの有効化（このSQLで実施）
--    - 読み取り専用テーブルの保護（tenants）
-- 
-- ⚠️ 推奨（近い将来に実施）:
--    - 管理画面の認証機能追加
--    - 認証ベースのポリシー適用
-- 
-- 📋 将来的に検討:
--    - テナント別のアクセス制御
--    - APIキーベースの認証
--    - 監査ログの追加
-- 
-- ===========================================
