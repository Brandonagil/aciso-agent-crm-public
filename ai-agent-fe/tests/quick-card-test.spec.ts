import { test, expect } from '@playwright/test';

test.describe('Quick Card Test', () => {
  test('should check retention plan cards after response', async ({ page }) => {
    // Navigate and login quickly
    await page.goto('http://localhost:3000/dashboard/overview');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('/login')) {
      const email = process.env.TEST_USER_EMAIL;
      const password = process.env.TEST_USER_PASSWORD;
      if (!email || !password) {
        throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be set for E2E tests');
      }
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      await page.goto('http://localhost:3000/dashboard/overview');
      await page.waitForTimeout(2000);
    }
    
    // Send message
    const chatInput = page.locator('input[placeholder*="Fragen Sie nach"]').first();
    await chatInput.waitFor({ state: 'visible' });
    await chatInput.fill('Erstelle einen Retention-Plan für Mitglied 12345');
    
    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();
    
    console.log('✅ Message sent, waiting for response...');
    
    // Wait for any text response first
    await page.waitForSelector('text=Retention, text=Plan, text=Mitglied', { timeout: 30000 });
    
    // Take screenshot immediately after response
    await page.screenshot({ path: 'test-results/quick-card-test-response.png', fullPage: true });
    
    // Check for specific retention plan indicators
    const hasRetentionText = await page.locator('text=Retention-Plan').count() > 0;
    const hasKundenprofil = await page.locator('text=KUNDENPROFIL').count() > 0;
    const hasChurnRisiko = await page.locator('text=Churn-Risiko').count() > 0;
    const hasMitglied12345 = await page.locator('text=Mitglied 12345').count() > 0;
    
    // Check for card-like structures
    const hasCards = await page.locator('[class*="card"], [class*="Card"], [class*="border"], [class*="shadow"]').count();
    
    // Check for no error
    const hasError = await page.locator('text=Strukturierte Plan-Daten fehlen').count() > 0;
    
    console.log('=== QUICK CARD TEST RESULTS ===');
    console.log('Has retention text:', hasRetentionText);
    console.log('Has customer profile:', hasKundenprofil);
    console.log('Has churn risk:', hasChurnRisiko);
    console.log('Has member 12345:', hasMitglied12345);
    console.log('Card elements found:', hasCards);
    console.log('Has structured data error:', hasError);
    
    // Check if it's displaying as structured cards vs plain text
    if (hasCards > 5 && (hasKundenprofil || hasChurnRisiko)) {
      console.log('✅ SUCCESS: Structured retention plan cards are working!');
    } else if (hasRetentionText || hasMitglied12345) {
      console.log('⚠️ PARTIAL: Retention plan displayed but might be plain text format');
    } else {
      console.log('❌ ISSUE: No clear retention plan display detected');
    }
    
    // Primary assertion: No error
    expect(hasError).toBeFalsy();
    
    // Secondary assertion: Some content exists
    expect(hasRetentionText || hasKundenprofil || hasMitglied12345).toBeTruthy();
    
    console.log('✅ Quick card test completed successfully!');
  });
});