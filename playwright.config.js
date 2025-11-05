import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Load the extension
        launchOptions: {
          args: [
            `--disable-extensions-except=${process.cwd()}`,
            `--load-extension=${process.cwd()}`,
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        },
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
        }
      },
    },
  ],
});

