import { test, expect } from '@playwright/test';

// AIコンシェルジュ（会員向け）のE2E。バックエンドAPIはモック。
test.beforeEach(async ({ page }) => {
  // 既定では未ログイン扱い（/api/auth/me は401）
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
});

test('未ログインだとログイン導線が表示される', async ({ page }) => {
  await page.goto('/concierge');
  await expect(page.getByRole('heading', { name: /AI補助金コンシェルジュ/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ログイン / 新規登録' })).toBeVisible();
});

test('ログイン済みなら入力→AI提案が表示される', async ({ page }) => {
  // トークンを事前注入し、/me は200で返す（NavAuthLinks がトークンを消さないように）
  await page.addInitScript(() => localStorage.setItem('user_token', 'fake.jwt.token'));
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { data: { id: 'u1', email: 'u@test', name: 'U', emailVerified: true } } }),
  );
  await page.route('**/api/subsidies/ai-recommend', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 's1', title: 'IT導入補助金', category: 'IT・デジタル', prefecture: '全国',
            level: '国', maxAmount: 4500000, targetType: '中小企業', reason: 'ECサイト構築に最適です',
          },
        ],
      },
    }),
  );

  await page.goto('/concierge');
  await page.getByLabel('事業内容・やりたいこと').fill('カフェを経営、ECサイトで通販を始めたい');
  await page.getByRole('button', { name: /AIに提案してもらう/ }).click();

  await expect(page.getByText('提案された補助金')).toBeVisible();
  await expect(page.getByRole('link', { name: 'IT導入補助金' })).toBeVisible();
  await expect(page.getByText('ECサイト構築に最適です')).toBeVisible();
});
