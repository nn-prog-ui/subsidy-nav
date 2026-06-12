import { test, expect } from '@playwright/test';

// バックエンドAPIをモックして、フロントエンド単体でE2Eを実行する
test.beforeEach(async ({ page }) => {
  await page.route('**/api/subsidies/analytics', (route) =>
    route.fulfill({
      json: {
        data: {
          total: 105,
          byLevel: [{ label: '国', count: 50 }, { label: '都道府県', count: 30 }, { label: '市区町村', count: 25 }],
          byCategory: [{ label: 'IT・デジタル', count: 20 }, { label: '設備投資', count: 15 }],
          byPrefecture: [{ label: '全国', count: 50 }, { label: '東京都', count: 8 }],
          amount: { avg: 5000000, max: 150000000, min: 9000 },
          deadlineSoon: 12,
        },
      },
    })
  );

  await page.route('**/api/subsidies/reco/personalized**', (route) =>
    route.fulfill({ json: { data: [], basis: 'recent' } })
  );

  // その他の補助金API（一覧・stats等）は空でフォールバック
  await page.route('**/api/subsidies**', (route) => {
    if (route.request().url().includes('/analytics') || route.request().url().includes('/reco/')) return route.fallback();
    return route.fulfill({ json: { data: [], meta: { total: 0, page: 1, pages: 0 } } });
  });
});

test('トップページが表示され、主要ナビゲーションが存在する', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('補助金');
  await expect(page.getByRole('link', { name: '補助金を探す' }).first()).toBeVisible();
});

test('スキップリンクが存在しアクセシブルである', async ({ page }) => {
  await page.goto('/');
  const skip = page.getByRole('link', { name: '本文へスキップ' });
  await expect(skip).toBeAttached();
  await expect(page.locator('#main-content')).toBeAttached();
});

test('分析ページがモックデータで統計を表示する', async ({ page }) => {
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: '補助金データ分析' })).toBeVisible();
  await expect(page.getByText('登録補助金数')).toBeVisible();
  await expect(page.getByText('105').first()).toBeVisible();
});

test('比較ページに初期メッセージが表示される', async ({ page }) => {
  await page.goto('/compare');
  await expect(page.getByRole('heading', { name: '補助金比較' })).toBeVisible();
  await expect(page.getByText('2件以上の補助金を追加すると比較表が表示されます')).toBeVisible();
});

test('カレンダーページが表示される', async ({ page }) => {
  await page.route('**/api/subsidies/calendar/events**', (route) =>
    route.fulfill({ json: { data: [] } })
  );
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: '申請期限カレンダー' })).toBeVisible();
});
