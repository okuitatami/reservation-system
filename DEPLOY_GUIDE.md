# デプロイガイド

このドキュメントでは、GitHubにコードをアップロードし、Vercelでデプロイする手順を説明します。

---

## 📋 前提条件

以下のアカウントが準備済みであること：
- ✅ GitHub アカウント
- ✅ Vercel アカウント
- ✅ Supabase プロジェクト（設定完了）
- ✅ Cloudflare Workers（設定完了）

---

## 🚀 ステップ1：GitHubにコードをアップロード

### 方法A：GitHub Web UI（推奨 - 簡単）

#### 1. GitHubリポジトリを開く

```
https://github.com/[あなたのユーザー名]/reservation-system
```

#### 2. ファイルをアップロード

**以下のファイル・フォルダを順番にアップロードしてください：**

##### ① ルートディレクトリのファイル

1. **「Add file」→「Upload files」をクリック**

2. **以下のファイルをドラッグ&ドロップ：**
   - `package.json`
   - `tsconfig.json`
   - `next.config.js`
   - `.gitignore`
   - `.env.example`
   - `README.md`
   - `PROJECT_INFO.md`
   - `DEVELOPMENT_GUIDE.md`
   - `DEPLOY_GUIDE.md` (このファイル)

3. **Commit message**: `feat: プロジェクト初期セットアップ`

4. **「Commit changes」をクリック**

##### ② libフォルダ

1. **「Add file」→「Create new file」をクリック**

2. **Name your file**: `lib/supabase.ts`

3. **内容をコピー&ペースト** (Gensparkの`lib/supabase.ts`から)

4. **「Commit new file」をクリック**

##### ③ pagesフォルダ

同様に以下のファイルを作成：

- `pages/_app.tsx`
- `pages/_document.tsx`
- `pages/[slug]/index.tsx`
- `pages/[slug]/success.tsx`

##### ④ stylesフォルダ

- `styles/globals.css`

##### ⑤ publicフォルダ

1. **publicフォルダを作成**

2. **以下のサブフォルダ・ファイルを作成：**
   - `public/css/style.css`
   - `public/css/admin.css`
   - `public/css/events.css`
   - `public/js/script.js`
   - `public/js/admin.js`
   - `public/js/events.js`
   - `public/js/event-reservation.js`

---

### 方法B：GitHub Desktop（ローカルPC使用）

1. GitHub Desktopをインストール
2. リポジトリをクローン
3. Gensparkのファイルをコピー
4. Commit & Push

---

## 🌐 ステップ2：Vercelでデプロイ

### 1. Vercelにログイン

```
https://vercel.com/
```

### 2. 新しいプロジェクトをインポート

1. **「Add New」→「Project」をクリック**

2. **GitHubリポジトリを選択**
   - `reservation-system` を探してクリック

3. **「Import」をクリック**

### 3. プロジェクト設定

#### Framework Preset
- **Next.js** (自動検出されます)

#### Root Directory
- `.` (デフォルト)

#### Build Command
- `next build` (デフォルト)

#### Output Directory
- `.next` (デフォルト)

### 4. 環境変数を設定

**「Environment Variables」セクションで以下を追加：**

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uqnwtzgtzhvysuhjkrul.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJI...` (Supabase anon key) |

**追加方法：**
1. 「Name」に変数名を入力
2. 「Value」に値をペースト
3. 「Add」をクリック
4. 2つとも追加したら「Deploy」をクリック

### 5. デプロイ開始

**「Deploy」ボタンをクリック**

- ビルドが開始されます（2〜3分）
- 完了すると「Congratulations!」画面が表示されます

### 6. デプロイされたURLを確認

```
https://reservation-system-xxxxx.vercel.app
```

このURLをコピーしてください。

---

## ✅ ステップ3：動作確認

### 1. 予約フォームにアクセス

```
https://reservation-system-xxxxx.vercel.app/okui-tatami
```

### 2. 確認事項

- ✅ ページが正しく表示される
- ✅ CSSが適用されている
- ✅ 予約種別が選択できる
- ✅ 次へボタンが動作する

**⚠️ 注意：現在の実装では、JavaScriptの一部機能が動作しない可能性があります。**
これはフェーズ1の最小限実装のためです。

---

## 🔧 ステップ4：JSファイルの修正（重要）

既存のJavaScriptは、Gensparkの環境（`tables/` API）を前提に作られています。
Vercel環境で動作させるには、APIエンドポイントを修正する必要があります。

### 修正が必要なファイル

1. **`public/js/script.js`**
   - `tables/reservations` → `/api/reservations`
   - `tables/available_slots` → `/api/available_slots`

2. **`public/js/admin.js`**
   - 同様のAPI変更

3. **`public/js/event-reservation.js`**
   - `tables/event_reservations` → `/api/event_reservations`

### 修正方法

1. GitHubでファイルを開く
2. 「Edit」ボタンをクリック
3. `fetch('tables/xxx')` を `fetch('/api/xxx')` に変更
4. Commit

**または、新しいGensparkタブで：**

```
こんにちは。以下のプロジェクトのJSファイルを修正してください。

[PROJECT_INFO.mdの内容をコピペ]

■ 修正内容
public/js/script.js, admin.js, event-reservation.jsの中の
fetch('tables/xxx') を fetch('/api/xxx') に変更してください。

修正後のコードを提供してください。
```

---

## 📝 ステップ5：Next.js API Routesを作成（今後）

フェーズ2で以下のAPI Routesを実装します：

- `pages/api/reservations.ts`
- `pages/api/available_slots.ts`
- `pages/api/events.ts`
- `pages/api/event_reservations.ts`

これらはSupabaseと連携し、既存のJavaScriptから呼び出されます。

---

## 🎉 完了！

本番環境のURLが生成されました！

```
予約フォーム: https://reservation-system-xxxxx.vercel.app/okui-tatami
管理画面: https://reservation-system-xxxxx.vercel.app/okui-tatami/admin (フェーズ2)
イベント: https://reservation-system-xxxxx.vercel.app/okui-tatami/events (フェーズ2)
```

---

## 🔄 今後の更新方法

### コードを修正する場合

1. **新しいGensparkタブ** または **GitHub Web編集** でファイルを修正
2. GitHubにCommit
3. **Vercelが自動でデプロイ**（2〜3分）
4. 本番環境に反映

---

## 🆘 トラブルシューティング

### ビルドエラーが発生する

**原因：** TypeScriptエラー、依存関係の問題

**解決策：**
1. Vercelのビルドログを確認
2. エラーメッセージをコピー
3. Gensparkで修正を依頼

### ページが表示されない

**原因：** ルーティング設定の問題

**解決策：**
1. URLが正しいか確認（`/okui-tatami`）
2. Vercelのログを確認
3. `next.config.js` のrewrites設定を確認

### JavaScriptが動作しない

**原因：** API エンドポイントの問題

**解決策：**
1. ブラウザのDevToolsを開く（F12）
2. Console tabでエラーを確認
3. Network tabで失敗したリクエストを確認
4. APIエンドポイントを修正

---

## 📞 サポート

問題が解決しない場合は、新しいGensparkタブで：

```
こんにちは。デプロイ後に問題が発生しています。

[PROJECT_INFO.mdの内容をコピペ]

■ 問題内容
[具体的なエラーメッセージや状況]

■ エラーログ
[Vercelまたはブラウザのエラーログ]

解決方法を教えてください。
```

---

**最終更新**: 2025-12-03  
**バージョン**: 1.0.0
