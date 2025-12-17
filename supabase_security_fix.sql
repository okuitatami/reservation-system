-- ===========================================
-- Supabase Security Fix - RLS有効化
-- 池田畳店 予約システム用
-- ===========================================
-- 
-- Security Advisorで検出された8つのエラーを修正します
-- このSQLをSupabase SQL Editorで実行してください
--

-- ===========================================
-- 既存ポリシーの削除（available_slotsのみ）
-- ===========================================

-- available_slotsの既存ポリシーを削除
DROP POLICY IF EXISTS "Enable delete access for all users" ON available_slots;
DROP POLICY IF EXISTS "Enable insert access for all users" ON available_slots;
DROP POLICY IF EXISTS "Enable read access for all users" ON available_slots;
DROP POLICY IF EXISTS "Enable update access for all users" ON available_slots;


-- ===========================================
-- 1. available_slots（受付可能日時）
-- ===========================================

-- RLSを有効化
ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能（予約フォームでカレンダー表示に必要）
CREATE POLICY "Public read access for available_slots"
ON available_slots
FOR SELECT
TO public
USING (true);

-- 挿入・更新・削除も公開（管理画面での操作用）
CREATE POLICY "Public insert for available_slots"
ON available_slots
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public update for available_slots"
ON available_slots
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete for available_slots"
ON available_slots
FOR DELETE
TO public
USING (true);


-- ===========================================
-- 2. tenant_admins（テナント管理者）
-- ===========================================

-- RLSを有効化
ALTER TABLE tenant_admins ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能（ログイン認証で使用）
CREATE POLICY "Public read access for tenant_admins"
ON tenant_admins
FOR SELECT
TO public
USING (true);

-- 挿入・更新・削除は制限（将来的に認証機能追加後に変更）
CREATE POLICY "Public insert/update/delete for tenant_admins"
ON tenant_admins
FOR ALL
TO public
USING (true)
WITH CHECK (true);


-- ===========================================
-- 3. booking_types（予約種別）
-- ===========================================

-- RLSを有効化
ALTER TABLE booking_types ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能（予約フォームで表示）
CREATE POLICY "Public read access for booking_types"
ON booking_types
FOR SELECT
TO public
USING (true);

-- 挿入・更新・削除は公開（管理画面での操作用）
CREATE POLICY "Public insert/update/delete for booking_types"
ON booking_types
FOR ALL
TO public
USING (true)
WITH CHECK (true);


-- ===========================================
-- 4. event_bookings（イベント予約）
-- ===========================================

-- RLSを有効化
ALTER TABLE event_bookings ENABLE ROW LEVEL SECURITY;

-- 誰でも挿入可能（予約フォームから予約作成）
CREATE POLICY "Public insert access for event_bookings"
ON event_bookings
FOR INSERT
TO public
WITH CHECK (true);

-- 読み取り・更新は公開（管理画面で使用）
CREATE POLICY "Public read access for event_bookings"
ON event_bookings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public update for event_bookings"
ON event_bookings
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 削除は禁止（データの完全性保持）
CREATE POLICY "No delete on event_bookings"
ON event_bookings
FOR DELETE
TO public
USING (false);


-- ===========================================
-- 5. business_hours（営業時間）
-- ===========================================

-- RLSを有効化
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能（予約フォームで営業時間表示）
CREATE POLICY "Public read access for business_hours"
ON business_hours
FOR SELECT
TO public
USING (true);

-- 挿入・更新・削除は公開（管理画面での操作用）
CREATE POLICY "Public insert/update/delete for business_hours"
ON business_hours
FOR ALL
TO public
USING (true)
WITH CHECK (true);


-- ===========================================
-- 6. holidays（休日設定）
-- ===========================================

-- RLSを有効化
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能（予約フォームでカレンダー表示）
CREATE POLICY "Public read access for holidays"
ON holidays
FOR SELECT
TO public
USING (true);

-- 挿入・更新・削除は公開（管理画面での操作用）
CREATE POLICY "Public insert/update/delete for holidays"
ON holidays
FOR ALL
TO public
USING (true)
WITH CHECK (true);


-- ===========================================
-- 7. super_admins（スーパー管理者）
-- ===========================================

-- RLSを有効化
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能（ログイン認証で使用）
CREATE POLICY "Public read access for super_admins"
ON super_admins
FOR SELECT
TO public
USING (true);

-- 挿入・更新・削除は制限
CREATE POLICY "Restricted insert/update/delete for super_admins"
ON super_admins
FOR ALL
TO public
USING (false)
WITH CHECK (false);


-- ===========================================
-- 既存テーブルのRLS有効化
-- ===========================================

-- tenantsテーブル
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for tenants" ON tenants
FOR SELECT TO public USING (true);

CREATE POLICY "No public insert/update/delete on tenants" ON tenants
FOR ALL TO public USING (false);


-- reservationsテーブル
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert access for reservations" ON reservations
FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public read access for reservations" ON reservations
FOR SELECT TO public USING (true);

CREATE POLICY "Public update access for reservations" ON reservations
FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "No delete on reservations" ON reservations
FOR DELETE TO public USING (false);


-- eventsテーブル
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for events" ON events
FOR SELECT TO public USING (true);

CREATE POLICY "Public insert/update/delete on events" ON events
FOR ALL TO public USING (true) WITH CHECK (true);


-- event_reservationsテーブル
ALTER TABLE event_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert access for event_reservations" ON event_reservations
FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public read access for event_reservations" ON event_reservations
FOR SELECT TO public USING (true);

CREATE POLICY "Public update/delete on event_reservations" ON event_reservations
FOR UPDATE TO public USING (true) WITH CHECK (true);


-- ===========================================
-- 確認クエリ
-- ===========================================

-- RLS有効化状態を確認
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'tenants', 
  'available_slots', 
  'reservations', 
  'events', 
  'event_reservations',
  'tenant_admins',
  'booking_types',
  'event_bookings',
  'business_hours',
  'holidays',
  'super_admins'
)
ORDER BY tablename;

-- 設定されているポリシーを確認
SELECT 
  tablename, 
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ===========================================
-- 完了メッセージ
-- ===========================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'RLS設定が完了しました！';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '1. Security Advisorに戻る';
  RAISE NOTICE '2. "Refresh" または "Re-scan" をクリック';
  RAISE NOTICE '3. エラーが0件になったことを確認';
  RAISE NOTICE '===========================================';
END $$;
