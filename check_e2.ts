import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000');
  
  await page.waitForTimeout(2000); // let data fetch
  
  // click "Criar Primeiro Projeto" or "+ Projeto"
  try {
    await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('div'));
      const btn = texts.find(t => t.textContent === '+ Projeto');
      if (btn) btn.click();
    });
  } catch (e) {
    console.log('Error clicking:', e);
  }
  
  await page.waitForTimeout(1000);
  
  await browser.close();
})();
