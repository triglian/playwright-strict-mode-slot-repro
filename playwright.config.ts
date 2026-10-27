import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
