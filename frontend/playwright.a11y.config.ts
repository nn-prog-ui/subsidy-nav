import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

// アクセシビリティ監査用の独立設定（メインE2Eとは分離し、CIでは非ブロッキング扱い）
export default defineConfig({
  testDir: './e2e-a11y',
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { baseURL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_API_URL: 'http://localhost:4000', NEXT_PUBLIC_SITE_URL: baseURL },
  },
});
