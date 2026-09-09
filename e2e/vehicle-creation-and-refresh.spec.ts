import { test, expect } from '@playwright/test';

/**
 * @feature REQ-CRM-04 - Gestão de Estoque e Pátio
 * @scenario CT-E2E-VEHICLE-01 - Cadastro de Veículo com dados formatados e persistência após F5 (Reload)
 */
test.describe('[REQ-CRM-04] Cadastro de Veículo e Persistência no Refresh', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      {
        name: "acelera_demo_mode",
        value: "true",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await page.goto('/vehicles');
    await page.waitForLoadState('domcontentloaded');
  });

  test('[CT-E2E-VEHICLE-01] deve cadastrar veículo com placa com hífen, enums acentuados e manter visível após F5', async ({ page }) => {
    // 1. Localiza e clica no botão "Novo Veículo"
    const btnAddVehicle = page.getByRole('button', { name: /novo veículo/i }).first();
    await expect(btnAddVehicle).toBeVisible({ timeout: 10000 });
    await btnAddVehicle.click();

    // 2. Aguarda abertura do modal de veículo
    const vehicleModal = page.locator('#modal-new-vehicle');
    await expect(vehicleModal).toBeVisible({ timeout: 10000 });

    // 3. Preenche os campos obrigatórios
    await vehicleModal.locator('#make').fill('Honda');
    await vehicleModal.locator('#model').fill('Civic E2E Test');
    await vehicleModal.locator('#plate').fill('BRA-2E22');
    await vehicleModal.locator('#price').fill('195000');

    // 4. Seleciona combustível Híbrido e câmbio Automático
    await vehicleModal.locator('select#fuel').selectOption({ label: 'Híbrido (HEV/PHEV)' });
    await vehicleModal.locator('select#transmission').selectOption({ label: 'Automático' });

    // 5. Submete o formulário
    const submitBtn = vehicleModal.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // 6. Confirma fechamento do modal de veículo
    await expect(vehicleModal).not.toBeVisible({ timeout: 10000 });

    // 7. Valida que o card aparece na listagem
    const vehicleCard = page.locator('article, .rounded-xl').filter({ hasText: 'Civic E2E Test' }).first();
    await expect(vehicleCard).toBeVisible({ timeout: 10000 });

    // 8. Executa Refresh (F5) na página
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 9. Garante que após o reload o veículo CONTINUA visível no pátio (zero sumiço de veículos)
    const vehicleCardAfterF5 = page.locator('article, .rounded-xl').filter({ hasText: 'Civic E2E Test' }).first();
    await expect(vehicleCardAfterF5).toBeVisible({ timeout: 10000 });
  });
});
