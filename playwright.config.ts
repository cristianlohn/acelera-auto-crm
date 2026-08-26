import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração E2E do Playwright - Acelera Auto CRM
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['list'],
    ],

    use: {
        /* 127.0.0.1 previne conflitos de DNS/IPv6 no CI */
        baseURL: 'http://127.0.0.1:3001',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'Desktop Chrome',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Mobile Chrome (Pixel 5)',
            use: { ...devices['Pixel 5'] },
        },
    ],

    /* Sobe o servidor: 'npm run start' no CI (rápido) ou 'npm run dev' localmente */
    webServer: {
        command: process.env.CI ? 'npm run start' : 'npm run dev',
        url: 'http://127.0.0.1:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});