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
- 🤖 **AIコンシェルジュ**（Claude API）— 事業内容を自由文で入力すると、AIがDBから合う補助金を理由つきで提案（`/concierge`）
- 🤖 **AI申請書ドラフト生成**（Claude API）— 事業情報を入力すると、その補助金向けの事業計画書のたたき台（要約／動機／実施計画／効果／アピール）を生成（申請者情報は保存しない）
- 🔁 お気に入りベースのレコメンド・通知設定

### 管理（`/admin`）
- 補助金CRUD・検索・ページネーション・CSV入出力・一括ステータス更新
- 手動スクレイピング・ステータス自動更新・週次分析レポート送信
- 🤖 **AI申請ガイド生成**（Claude API）— 補助金ごとに「申請書の書き方／準備するもの／想定スケジュール／入金までの日数／注意点」を生成し、詳細ページに掲載（コンサル納品物）
- 🤖 **AI抽出**（Claude API）— 市区町村の補助金ページURL → AIが構造化 → レビューキューで承認/却下 → 公開
- 🤖 **相談へのAI返信ドラフト**（Claude API）— 相談内容に合う補助金をDBから2〜3件提案する返信メール案をワンクリック生成（送信前にレビュー）
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

## データソース

補助金データは複数経路で収集し、管理画面でレビューのうえ公開します。

1. **Jグランツ公式API**（一次情報・推奨）— `importFromJGrants` が国・都道府県の補助金を取り込み、`sourceId` で重複なく upsert。毎週月曜 AM3:00 JST 自動 ＋ 管理画面から手動実行。取り込み時はカテゴリ等の管理者編集を保持し、締切・金額・状態のみ更新。
1b. **厚生労働省の主要「雇用関係助成金」**（キュレーション）— Jグランツに載りにくい助成金カテゴリを補完。`importMhlwGrants` が主要な国の助成金（キャリアアップ／業務改善／両立支援 等）を `source=mhlw` で upsert。管理画面から手動実行。金額は目安で、詳細は各公式ページで要確認。
2. **自治体サイトのスクレイピング** — 公式APIに無いローカル補助金を補完（54自治体、毎週月曜 AM2:00）。
3. **AI抽出**（実装済み）— 公式APIで拾えない市区町村の補助金ページのURLを管理画面に入れると、Claude API（`claude-opus-4-8`）が本文を構造化して候補化。管理者が**承認**したものだけを `source=ai-extract` で公開（`ExtractedSubsidy` レビューキュー）。

### AI申請ガイド（コンサル納品物）

`ANTHROPIC_API_KEY` を設定すると、管理画面の補助金一覧から「🤖 AIガイド」を押すだけで、Claude API（`claude-opus-4-8`・adaptive thinking）が当該補助金の **申請書の書き方・準備するもの・想定スケジュール・入金までの想定日数・よくある注意点** を生成し、詳細ページに掲載します。キー未設定でも他機能・CIには影響しません（フェイルセーフ）。

> 掲載情報は変更され得るため、申請時は必ず各制度の公式情報を確認してください（免責はフッターにも明記）。

## シードデータ

- 補助金: 約105件（国50 / 都道府県30 / 市区町村25、難易度・申請ステップ・必要書類付き）
- PDFテンプレート: 7種類

## デプロイ（Railway）

`RAILWAY_DEPLOY.md` を参照（環境変数表・初回スモークテスト・データ投入手順つき）。`DEPLOY_ENABLED=true`（リポジトリ変数）と `RAILWAY_TOKEN`（Secret）を設定すると自動デプロイ。backend 起動時に `ADMIN_EMAIL`/`ADMIN_PASSWORD` から管理者を自動作成（冪等）するため、シード未実行でも `/admin` にログイン可能。

## 管理者ログイン

- URL: `http://localhost:3000/admin`
- Email: `ADMIN_EMAIL`（既定 `admin@subsidy-nav.jp`）/ Password: `ADMIN_PASSWORD`（既定 `admin1234`）
