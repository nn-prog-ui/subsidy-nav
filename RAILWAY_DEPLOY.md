# Railway デプロイ手順

## 初回セットアップ

1. [Railway](https://railway.app) でプロジェクト作成
2. GitHub リポジトリを連携
3. 以下のサービスを追加:
   - **PostgreSQL** (Railway テンプレートから追加)
   - **backend** (backend/ ディレクトリ)
   - **frontend** (frontend/ ディレクトリ)

## 環境変数設定

### backend サービス
```
DATABASE_URL=<PostgreSQL サービスの DATABASE_URL を参照>
JWT_SECRET=<32文字以上のランダム文字列>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<強固なパスワード>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<Gmailアドレス>
SMTP_PASS=<Googleアプリパスワード>
FROM_EMAIL=noreply@subsidy-nav.jp
FRONTEND_URL=https://<frontendのRailway URL>
```

### frontend サービス
```
NEXT_PUBLIC_API_URL=https://<backendのRailway URL>
NEXT_PUBLIC_SITE_URL=https://<frontendのRailway URL>
```

## GitHub Actions 自動デプロイ

1. Railway プロジェクトの Settings → Tokens で API Token 生成
2. GitHub リポジトリの Settings → Secrets に `RAILWAY_TOKEN` を追加
3. GitHub リポジトリの Settings → Variables に `DEPLOY_ENABLED` = `true` を追加
   （未設定の間は Deploy ワークフローはスキップされ、CI を汚しません）
4. main ブランチへの push で自動デプロイが実行される

## API ドキュメント

- OpenAPI 仕様: `https://<backend>/api/openapi.json`
- Redoc ビューア: `https://<backend>/api/docs`

## 初回デプロイ後

backend のログで以下を確認:
- `Prisma migrate deploy` が成功
- `Server running on port 4000` が出力

初期管理者アカウントは自動作成されます（ADMIN_EMAIL / ADMIN_PASSWORD）。
