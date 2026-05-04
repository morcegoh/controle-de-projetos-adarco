import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);
  
  // open editor for the first task
  const taskIdHandle = await page.evaluate(() => {
    const editBtns = Array.from(document.querySelectorAll('div')).filter(d => d.textContent === 'Editar');
    if (editBtns[0]) {
      editBtns[0].click();
      return true;
    }
    return false;
  });
  
  await page.waitForTimeout(1000);
  
  await browser.close();
})();
