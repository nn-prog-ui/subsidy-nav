# Railway デプロイ手順（補助金ナビ）

本番（Railway）への初回デプロイと稼働確認のための実務ガイド。**上から順に**進めれば初回デプロイで詰まらない構成にしています。

---

## 1. アーキテクチャ

3つのサービスで構成します。

| サービス | 内容 | 公開URL |
|---|---|---|
| **PostgreSQL** | DB（Railwayテンプレート） | 内部のみ |
| **backend** | Express API（`backend/`、Dockerfile） | `https://<backend>.up.railway.app` |
| **frontend** | Next.js（`frontend/`、Dockerfile） | `https://<frontend>.up.railway.app` |

- backend は起動時に `prisma migrate deploy`（マイグレーション適用）→ APIサーバ起動 → **管理者ユーザーを自動作成**（後述）→ cron スケジューラ起動、を行います。
- ヘルスチェック: backend は `/api/health/ready`（DB疎通込み）、frontend は `/`。

---

## 2. 事前準備チェックリスト

- [ ] [Railway](https://railway.app) アカウント
- [ ] GitHub リポジトリ `nn-prog-ui/subsidy-nav` を Railway に連携
- [ ] SMTP（任意・メール通知を使う場合）: Gmail なら「アプリパスワード」を取得
- [ ] Claude API キー（任意・AI機能を使う場合）: `ANTHROPIC_API_KEY`

---

## 3. サービス作成

1. Railway で新規プロジェクト作成
2. **PostgreSQL** を追加（テンプレートから）
3. **backend** サービスを追加 → Root Directory を `backend` に設定（`backend/railway.toml` と `Dockerfile` が使われる）
4. **frontend** サービスを追加 → Root Directory を `frontend` に設定

---

## 4. 環境変数

### backend（必須）

| 変数 | 値 | 備考 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL サービスの参照 | Railway の変数参照で `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | 32文字以上のランダム文字列 | 管理者/会員トークン署名 |
| `ADMIN_EMAIL` | 管理者メール | 起動時にこのアカウントを自動作成 |
| `ADMIN_PASSWORD` | 強固なパスワード | 同上。**既存があれば変更しません** |
| `NODE_ENV` | `production` | |
| `FRONTEND_URL` | `https://<frontend>.up.railway.app` | CORS 許可元（カンマ区切りで複数可） |

> `PORT` は **設定不要**。Railway が注入し、アプリは `process.env.PORT` で待ち受けます。

### backend（任意）

| 変数 | 既定 | 用途 |
|---|---|---|
| `ANTHROPIC_API_KEY` | （なし） | **AI申請ガイド生成・AI抽出**。未設定なら該当機能のみ無効（他は正常） |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | （なし） | メール通知。`SMTP_USER` が送信元アドレスになります |
| `JGRANTS_API_BASE` | 公式API | Jグランツ取り込み元。通常変更不要 |
| `REDIS_URL` | （なし） | 設定時は分散キャッシュ、未設定はインメモリ |
| `LINE_NOTIFY_TOKEN` | （なし） | LINE通知（任意） |

### frontend（必須）

| 変数 | 値 |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<backend>.up.railway.app` |
| `NEXT_PUBLIC_SITE_URL` | `https://<frontend>.up.railway.app` |

> `NEXT_PUBLIC_*` は**ビルド時に焼き込まれる**ため、変更したら frontend を再デプロイすること。

---

## 5. GitHub Actions 自動デプロイ（任意）

`main` への push で自動デプロイする場合:

1. Railway → Account/Project Settings → Tokens で API Token を生成
2. GitHub リポジトリ → Settings → **Secrets** に `RAILWAY_TOKEN` を追加
3. GitHub リポジトリ → Settings → **Variables** に `DEPLOY_ENABLED` = `true` を追加
   - 未設定の間は `deploy.yml` はスキップされ、CI を汚しません
4. 以後 `main` への push で自動デプロイ

手動デプロイの場合はこの節は不要（Railway の GitHub 連携による自動ビルドで運用）。

---

## 6. 初回デプロイ後のスモークテスト

`<backend>` / `<frontend>` を実URLに置き換えて確認します。

```bash
# 1) backend 稼働 & DB疎通
curl -s https://<backend>/api/health/ready        # {"status":"ok",...}

# 2) 補助金一覧（BigInt直列化の確認も兼ねる: maxAmount が数値で返ること）
curl -s "https://<backend>/api/subsidies?limit=1" | head -c 400
#   → 500 にならず data 配列が返る。maxAmount は number（または null）

# 3) 管理者ログイン（起動時自動作成された認証情報で）
curl -s -X POST https://<backend>/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'
#   → {"token":"..."}
```

チェックリスト:

- [ ] backend ログに `Backend running on http://localhost:<PORT>` と `[bootstrap] admin user ensured: <ADMIN_EMAIL>`
- [ ] `/api/health/ready` が `ok`
- [ ] `/api/subsidies` が 500 にならない（BigInt修正の確認）
- [ ] frontend トップが表示される
- [ ] `https://<frontend>/admin` で管理者ログインできる

---

## 7. データ投入

初回はDBが空（マイグレーションのみ）です。**実データは管理画面から取り込みます。**

1. `https://<frontend>/admin` にログイン → **スクレイプ**タブ
2. **🏛 Jグランツから取り込み** … 国・都道府県の補助金を公式APIから取得
3. （任意）**🤖 AI抽出** … 市区町村の補助金ページURLを入れてAIで構造化 → レビューして公開
   - ※ `ANTHROPIC_API_KEY` 設定時のみ
4. デモ用サンプル（約105件）を入れたい場合は、backend で一度だけシードを実行:
   - Railway の backend サービスで one-off command: `npx ts-node prisma/seed.ts`
   - （`npm run setup` でも可。generate + migrate deploy + seed をまとめて実行）

---

## 8. AI機能の有効化

`ANTHROPIC_API_KEY`（`claude-opus-4-8` を使用）を backend に設定すると以下が有効化されます。未設定でも他機能・起動には影響しません（503でフェイルセーフ）。

- **AI申請ガイド生成**: 管理画面の補助金一覧「🤖 AIガイド」→ 詳細ページに掲載
- **AI抽出**: スクレイプタブの「AI抽出」→ URL から候補抽出 → 承認で公開

---

## 9. 運用メモ

- **自動ジョブ（cron, Asia/Tokyo 固定）**: 毎週月 2:00 スクレイプ / 3:00 Jグランツ取り込み / 8:00 ダイジェスト / 8:10 分析レポート / 8:20 保存検索通知、毎日 6:00 ステータス更新 / 9:00 締切アラート＋進捗リマインド。
- **APIドキュメント**: `https://<backend>/api/openapi.json` ・ Redoc: `https://<backend>/api/docs`
- **ヘルス**: liveness `/api/health` / readiness `/api/health/ready`

---

## 10. トラブルシュート

| 症状 | 原因 / 対処 |
|---|---|
| `/admin` でログインできない | backend ログに `[bootstrap] admin user ensured` が出ているか確認。`ADMIN_EMAIL`/`ADMIN_PASSWORD` 未設定だと自動作成されない |
| 補助金APIが 500 | 旧版の BigInt 直列化バグ。最新 main（`enableBigIntJson`）で解消済み。再デプロイで解決 |
| frontend から API を叩けない | `NEXT_PUBLIC_API_URL` が正しいか、backend の `FRONTEND_URL`（CORS）に frontend URL が含まれるか確認。`NEXT_PUBLIC_*` 変更後は frontend 再デプロイ |
| マイグレーション失敗 | `DATABASE_URL` の参照ミス。Postgres サービスの変数参照を再設定 |
| AI機能が 503 | `ANTHROPIC_API_KEY` 未設定。設定して backend 再デプロイ |
| メールが届かない | `SMTP_*` 未設定/誤り。Gmail はアプリパスワードを使用 |
