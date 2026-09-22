import { test, expect } from '@playwright/test';

test('Retention plan card diagnostics', async ({ page }) => {
  // Listen to console logs to debug
  page.on('console', msg => {
    if (msg.text().includes('🔍') || msg.text().includes('✅') || msg.text().includes('❌')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  await page.goto('http://localhost:3000/dashboard/overview');
  await page.waitForTimeout(3000);
  
  if (page.url().includes('/login')) {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be set for E2E tests');
    }
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    await page.goto('http://localhost:3000/dashboard/overview');
    await page.waitForTimeout(3000);
  }
  
  // Send message
  const chatInput = page.locator('input[data-slot="input"]').first();
  await chatInput.waitFor({ state: 'visible' });
  await chatInput.fill('Erstelle einen Retention-Plan für Mitglied 12345');
  
  const sendButton = page.locator('button[type="submit"]').first();
  await sendButton.click();
  
  console.log('✅ Message sent, waiting 20 seconds for response...');
  await page.waitForTimeout(20000);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'test-results/debug-retention-cards.png',
    fullPage: true 
  });
  
  // Check what we got
  const hasCardText = await page.locator('text=Retention-Plan erstellt').count() > 0;
  const hasActualCard = await page.locator('[class*="card"], .card').count() > 5;
  const hasSaveButton = await page.locator('button:has-text("speichern")').count() > 0;
  
  console.log('=== DEBUG RESULTS ===');
  console.log('Has retention plan text:', hasCardText);
  console.log('Has card elements:', hasActualCard);
  console.log('Has save button:', hasSaveButton);
  
  // Test passes if we see the retention plan
  expect(hasCardText).toBeTruthy();
});