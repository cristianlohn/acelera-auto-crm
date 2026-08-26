import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || 3000;
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Configuração E2E do Playwright - Acelera Auto CRM
 */
export default defineConfig({
    testMatch: '**/*.spec.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['list'],
    ],

    use: {
        baseURL,
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

    /* Sobe o servidor explicitamente em 127.0.0.1 e exibe logs em tempo real */
    webServer: {
        command: process.env.CI
            ? 'npx next start -p 3000 -H 127.0.0.1'
            : 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});