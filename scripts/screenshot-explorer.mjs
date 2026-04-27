import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const stories = [
	'widget-tree-item--default',
	'sidebar-explorer-item--page',
	'sidebar-explorer-item--collection',
	'sidebar-explorer-item--section',
	'sidebar-explorer-item--nested',
];

const outDir = resolve(process.cwd(), 'screenshots');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
	const ctx = await browser.newContext({ viewport: { width: 400, height: 120 } });
	const page = await ctx.newPage();

	const errors = [];
	page.on('pageerror', e => errors.push(`PAGE ERROR: ${e.message}\n${e.stack}`));
	page.on('console', m => {
		if (m.type() === 'error') errors.push(`CONSOLE ERROR: ${m.text()}`);
		else if (m.type() === 'warning') errors.push(`CONSOLE WARN: ${m.text()}`);
	});
	page.on('requestfailed', r => errors.push(`REQUEST FAILED: ${r.url()} ${r.failure()?.errorText}`));

	for (const id of stories) {
		const url = `http://localhost:6006/iframe.html?id=${id}&viewMode=story`;
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
		await page.waitForFunction(() => {
			const root = document.getElementById('storybook-root');
			return root && root.children.length > 0;
		}, { timeout: 60000 }).catch(() => {});
		await page.waitForTimeout(2000);
		const html = await page.evaluate(() => document.getElementById('storybook-root')?.innerHTML || '<missing>');
		console.log(`  HTML len: ${html.length}, sample: ${html.slice(0, 200)}`);
		const out = resolve(outDir, `${id}.png`);
		await page.screenshot({ path: out, fullPage: true });
		console.log(`OK  ${id} -> ${out}`);
	}

	if (errors.length) {
		console.log('--- runtime issues ---');
		errors.forEach(e => console.log(e));
	}
} finally {
	await browser.close();
}
