import { Router, Request, Response } from 'express';

const router = Router();

const openapi = {
  openapi: '3.0.3',
  info: {
    title: '補助金ナビ API',
    version: '1.0.0',
    description: '日本全国の補助金・助成金情報プラットフォーム「補助金ナビ」の公開API。',
  },
  servers: [{ url: '/api', description: 'API base' }],
  tags: [
    { name: 'subsidies', description: '補助金の検索・取得' },
    { name: 'matching', description: 'マッチング診断' },
    { name: 'auth', description: 'ユーザー認証' },
    { name: 'favorites', description: 'お気に入り（要認証）' },
    { name: 'progress', description: '申請進捗（要認証）' },
    { name: 'misc', description: 'アラート・相談・イベント' },
  ],
  paths: {
    '/subsidies': {
      get: {
        tags: ['subsidies'], summary: '補助金一覧の検索',
        parameters: [
          { name: 'keyword', in: 'query', schema: { type: 'string' }, description: '全文検索キーワード' },
          { name: 'prefecture', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'level', in: 'query', schema: { type: 'string', enum: ['国', '都道府県', '市区町村'] } },
          { name: 'difficulty', in: 'query', schema: { type: 'string', enum: ['easy', 'medium', 'hard'] } },
          { name: 'amountMin', in: 'query', schema: { type: 'integer' } },
          { name: 'amountMax', in: 'query', schema: { type: 'integer' } },
          { name: 'closingSoon', in: 'query', schema: { type: 'boolean' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'amount_desc', 'amount_asc', 'deadline'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: '補助金一覧とページ情報' } },
      },
    },
    '/subsidies/export': {
      get: { tags: ['subsidies'], summary: 'CSVエクスポート（フィルタ対応・最大2000件）', responses: { '200': { description: 'text/csv' } } },
    },
    '/subsidies/stats': { get: { tags: ['subsidies'], summary: '区分別・カテゴリ別の件数統計', responses: { '200': { description: 'stats' } } } },
    '/subsidies/analytics': { get: { tags: ['subsidies'], summary: '詳細な集計（金額統計・地域別など）', responses: { '200': { description: 'analytics' } } } },
    '/subsidies/popular': { get: { tags: ['subsidies'], summary: '人気の補助金（直近30日の閲覧数）', responses: { '200': { description: 'popular' } } } },
    '/subsidies/{id}': {
      get: {
        tags: ['subsidies'], summary: '補助金の詳細と関連補助金',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '補助金詳細' }, '404': { description: 'Not found' } },
      },
    },
    '/subsidies/{id}/pdf': {
      get: { tags: ['subsidies'], summary: '補助金詳細のPDF', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'application/pdf' } } },
    },
    '/matching': {
      post: {
        tags: ['matching'], summary: '3問マッチング診断',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['prefecture', 'industry', 'employees'],
          properties: { prefecture: { type: 'string' }, industry: { type: 'string' }, employees: { type: 'string' } },
        } } } },
        responses: { '200': { description: 'マッチした補助金（スコア付き）' }, '400': { description: '入力不足' } },
      },
    },
    '/matching/pdf': { post: { tags: ['matching'], summary: 'マッチング結果のPDF', responses: { '200': { description: 'application/pdf' } } } },
    '/auth/register': { post: { tags: ['auth'], summary: 'ユーザー登録（確認メール送信）', responses: { '201': { description: '登録完了' }, '409': { description: '既存メール' } } } },
    '/auth/login': { post: { tags: ['auth'], summary: 'ログイン（JWT発行）', responses: { '200': { description: 'token' }, '401': { description: '認証失敗' } } } },
    '/favorites': {
      get: { tags: ['favorites'], summary: 'お気に入り一覧', security: [{ bearerAuth: [] }], responses: { '200': { description: '一覧' }, '401': { description: '未認証' } } },
      post: { tags: ['favorites'], summary: 'お気に入り追加/メモ更新', security: [{ bearerAuth: [] }], responses: { '201': { description: '追加' } } },
    },
    '/progress': {
      get: { tags: ['progress'], summary: '申請進捗一覧', security: [{ bearerAuth: [] }], responses: { '200': { description: '一覧' } } },
    },
    '/progress/{subsidyId}': {
      put: { tags: ['progress'], summary: '進捗の作成/更新', security: [{ bearerAuth: [] }], parameters: [{ name: 'subsidyId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: '更新' } } },
    },
    '/alerts': { post: { tags: ['misc'], summary: '新着アラート登録（メール認証）', responses: { '201': { description: '登録' } } } },
    '/consulting': { post: { tags: ['misc'], summary: '無料相談の申し込み', responses: { '201': { description: '受付' } } } },
    '/events': { post: { tags: ['misc'], summary: '解析イベント送信（匿名）', responses: { '202': { description: '受理' } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openapi);
});

router.get('/docs', (_req: Request, res: Response) => {
  // Redoc を CDN から読み込むため、このページのみ CSP を緩和
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://cdn.redoc.ly 'unsafe-inline'; worker-src blob:; child-src blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self'"
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>補助金ナビ API ドキュメント</title>
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <redoc spec-url="/api/openapi.json"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`);
});

export default router;
