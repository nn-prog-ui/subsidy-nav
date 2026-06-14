import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// バックエンドAPIをモックして、各ページのアクセシビリティをaxeで検査する。
// CIでは非ブロッキングジョブで実行し、重大(critical)な違反のみ検出対象とする。
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({ json: { data: [], meta: { total: 0, page: 1, pages: 0 }, titles: [], keywords: [] } })
  );
});

async function scan(page: any, path: string) {
  await page.goto(path);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const critical = results.violations.filter(v => v.impact === 'critical');
  if (critical.length) {
    console.log(`[a11y] ${path} critical violations:`, JSON.stringify(critical.map(v => v.id), null, 2));
  }
  expect(critical, `${path} に重大なアクセシビリティ違反`).toEqual([]);
}

test('トップページ a11y', async ({ page }) => { await scan(page, '/'); });
test('検索ページ a11y', async ({ page }) => { await scan(page, '/subsidies'); });
test('比較ページ a11y', async ({ page }) => { await scan(page, '/compare'); });
