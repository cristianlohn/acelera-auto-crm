import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração E2E do Playwright - Acelera Auto CRM
 * Executa contra o servidor local do Next.js e gera relatórios HTML com traces.
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
        baseURL: 'http://localhost:3001',
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

    /* Sobe automaticamente o servidor Next.js durante a execução dos testes */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});