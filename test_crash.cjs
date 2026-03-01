const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        }
    });

    page.on('pageerror', error => {
        console.log('PAGE ERROR STR:', error.message);
        console.log('PAGE ERROR STACK:', error.stack);
    });

    console.log('Navigating to http://localhost:5178...');
    await page.goto('http://localhost:5178', { waitUntil: 'networkidle' }).catch(e => console.error(e));

    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
