# 補助金ナビ (Subsidy Navigator)

日本全国の国・都道府県・市区町村の補助金・助成金情報を提供するスタンドアロンサービス。

## 機能

### 一般ユーザー（公開）
- 🔍 **補助金検索** — 地域・カテゴリ・支援レベル・金額レンジ・難易度・締切で絞り込み、並び替え、全文検索（同義語展開）、サジェスト＋オートコンプリート、最近の検索
- 🗂 **カテゴリ別ランディング** — `/categories`（SEO構造化データ付き）
- 🎯 **マッチング診断** — 3問で最適な補助金をスコアリング診断（結果PDF出力対応）
- 📅 **申請期限カレンダー** / ⚖️ **補助金比較**（最大3件）/ 📊 **データ分析**
- 🔥 **人気の補助金 / おすすめ** — 閲覧イベント・閲覧履歴ベース
- 📄 **申請テンプレート**（PDF）・補助金詳細PDF・**CSVエクスポート**
- 🔔 **アラート登録** — 新着・締切前をメール通知（メール認証・ワンクリック配信停止）
- 💬 **無料相談フォーム**

### 会員（要ログイン）
- ⭐ お気に入り（メモ編集・**公開共有コレクション**）
- 🧭 申請進捗トラッカー（5段階ステータス・メモ・締切リマインドのオプトイン）
- 🔁 お気に入りベースのレコメンド・通知設定

### 管理（`/admin`）
- 補助金CRUD・検索・ページネーション・CSV入出力・一括ステータス更新
- 手動スクレイピング・ステータス自動更新・週次分析レポート送信
- 分析グラフ／検索キーワード・閲覧ランキング／監査ログ／変更履歴／重複検出

### 横断
- PWA（オフライン対応）・動的OG画像・JSON-LD（GovernmentService/Breadcrumb/ItemList）
- アクセシビリティ（skip link・focus-visible・ARIA・axe自動監査）
- OpenAPIドキュメント（`/api/docs`, `/api/openapi.json`）

## スタック

- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Backend**: Express.js + TypeScript（helmet・rate limit・zodバリデーション・リクエストID）
- **DB**: Prisma + PostgreSQL（全文検索 tsvector / pg_trgm）
- **キャッシュ**: node-cache（`REDIS_URL` 設定時は Redis）
- **メール**: Nodemailer / **スクレイパー**: Cheerio + Axios（54自治体）/ **PDF**: pdfkit
- **スケジューラー**: node-cron
  - 毎週月曜 AM2:00 スクレイプ / AM8:00 ダイジェスト / AM8:10 分析レポート
  - 毎日 AM6:00 ステータス自動更新 / AM9:00 締切アラート＋進捗リマインド

## テスト / CI

- Backend: Jest + supertest（`npm test`）
- Frontend: Vitest（`npm test`）/ Playwright E2E（`npm run test:e2e`）/ a11y監査（`npm run test:a11y`）
- GitHub Actions: backend・frontend・E2E（必須）＋ a11y（アドバイザリ）

## セットアップ

```bash
cp .env.example .env   # SMTP等を設定
docker-compose up --build
```

- フロント: http://localhost:3000 / API: http://localhost:4000
- ヘルスチェック: `/api/health`（liveness）, `/api/health/ready`（DB疎通）

## シードデータ

- 補助金: 約105件（国50 / 都道府県30 / 市区町村25、難易度・申請ステップ・必要書類付き）
- PDFテンプレート: 7種類

## デプロイ（Railway）

`RAILWAY_DEPLOY.md` を参照。`DEPLOY_ENABLED=true`（リポジトリ変数）と `RAILWAY_TOKEN`（Secret）を設定すると自動デプロイ。

## 管理者ログイン

- URL: `http://localhost:3000/admin`
- Email: `ADMIN_EMAIL`（既定 `admin@subsidy-nav.jp`）/ Password: `ADMIN_PASSWORD`（既定 `admin1234`）
