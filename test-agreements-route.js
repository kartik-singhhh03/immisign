const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        
        page.on('dialog', async dialog => {
            console.log("DIALOG POPUP:", dialog.message());
            await dialog.accept();
        });

        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
        
        console.log("Clicking quick login for owner@demoagency.com...");
        const clicked = await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll('button')).find(e => e.textContent.includes('Rajwant Singh'));
            if (el) {
                el.click();
                return true;
            }
            return false;
        });
        
        if (!clicked) throw new Error("Could not find login button");
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        await page.waitForFunction(() => window.location.href.includes('/dashboard'), { timeout: 30000 });
        console.log("Logged in successfully. Navigating to agreements/new...");
        
        const response = await page.goto('http://localhost:3000/workspace/avc-migration/agreements/new', { waitUntil: 'networkidle2' });
        console.log("Response status:", response.status());
        
        const is404 = await page.evaluate(() => document.body.innerText.includes("Page not found"));
        if (is404) {
            console.error("❌ Test Failed: Page is still 404.");
            process.exit(1);
        } else {
            console.log("✅ Test Passed: Page loaded successfully without 404.");
            process.exit(0);
        }
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
