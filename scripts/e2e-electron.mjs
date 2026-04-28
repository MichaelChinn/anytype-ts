// E2E driver — launches the actual Electron build via Playwright and walks
// the app to verify (1) startup, (2) the onboarding-skip path, and (3) the
// file explorer renders. Assumes Vite is already serving on localhost:8080.
//
// Usage:  node scripts/e2e-electron.mjs

import { _electron as electron } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(root, 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const shot = async (page, name) => {
	const out = path.join(outDir, `e2e-${name}.png`);
	await page.screenshot({ path: out, fullPage: false });
	return out;
};

const log = (...a) => console.log('[e2e]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const record = (name, ok, note = '') => {
	const status = ok ? 'PASS' : 'FAIL';
	console.log(`[${status}] ${name}${note ? ' — ' + note : ''}`);
	results.push({ name, ok, note });
};

let app;
try {
	log('launching electron');
	app = await electron.launch({
		executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
		args: [ path.join(root, 'electron.js') ],
		cwd: root,
		env: { ...process.env, NODE_ENV: 'development' },
		timeout: 60000,
	});

	// Anytype's main process opens two BrowserWindows: the outer "tabs.html"
	// chrome and the inner "index.html" React app. Wait until both exist,
	// then pick the inner one.
	await app.firstWindow({ timeout: 60000 });
	const deadline = Date.now() + 60000;
	let page = null;
	while (Date.now() < deadline) {
		const found = app.windows().find(w => w.url().includes('index.html'));
		if (found) { page = found; break; }
		await sleep(500);
	};
	if (!page) {
		throw new Error('inner app window (index.html) never appeared');
	};
	await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
	log(`inner window loaded: ${page.url()}`);

	const consoleErrors = [];
	page.on('pageerror', e => consoleErrors.push(`PAGE ERROR: ${e.message}`));
	page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`CONSOLE: ${m.text()}`); });

	// Wait for the React tree to actually mount — give heart time to spawn
	// and the app to initialize.
	await sleep(8000);
	const url = page.url();
	const title = await page.title();
	const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 400) || '');
	log(`url=${url}  title=${title}`);

	await shot(page, '01-initial');

	const onAuthSelect = bodyText.match(/I am new here|already have a Key|Sign\s*up/i);
	const onAuthOnboard = bodyText.match(/This is your Key|Reveal and Copy|I am a|I will use/i);
	const onMainApp = (
		bodyText.match(/Welcome to Anytype/i) ||
		bodyText.match(/Files/i) ||
		bodyText.match(/Get Started Desktop/i)
	);

	record('Electron window opens', true, `title="${title}"`);

	if (onAuthSelect) {
		log('on auth/select — clicking signup to test onboarding-skip');
		// Find the signup button — Anytype labels it "I am new here".
		const signup = page.getByText(/I am new here|Sign\s*up/i).first();
		if (await signup.count() === 0) {
			record('Signup button visible', false, 'no signup button found');
		} else {
			record('Signup button visible', true);
			await signup.click({ timeout: 10000 });
			log('clicked signup, waiting for redirect');

			// Onboarding skip means we land in the main app, not on /auth/onboard
			// Give the inflate animation (1s) + accountCreate + space switch time.
			await sleep(15000);
			const afterText = await page.evaluate(() => document.body?.innerText?.slice(0, 400) || '');
			await shot(page, '02-after-signup');

			const stillOnboarding = afterText.match(/recovery|This is your Key|Reveal|I'm a/i);
			const inMainApp = afterText.match(/Welcome to Anytype|Files|Search/i);

			record('Onboarding screens skipped', !stillOnboarding,
				stillOnboarding ? `saw onboarding text: "${(afterText.match(/.{0,100}recovery.{0,100}/i) || ['?'])[0]}"` : '');
			record('Landed in main app after signup', !!inMainApp,
				inMainApp ? '' : `body=${afterText.slice(0, 200)}`);
		};
	} else
	if (onAuthOnboard) {
		record('Stuck on onboarding screen', false, 'expected to skip but onboard page rendered');
		await shot(page, '02-stuck-onboard');
	} else
	if (onMainApp) {
		log('already logged into existing account');
		record('Auto-login from prior session', true);
	} else {
		record('Recognized initial state', false, `body sample: ${bodyText.slice(0, 200)}`);
	};

	// Whatever state we're in, look for the file explorer DOM.
	const explorerProbe = await page.evaluate(() => {
		const explorer = document.querySelector('.sidebarPage.pageExplorer');
		if (!explorer) return { found: false };
		const body = explorer.querySelector('.body');
		const items = explorer.querySelectorAll('.body .item');
		const r = body?.getBoundingClientRect();
		return {
			found: true,
			bodyHeight: r ? r.height : 0,
			bodyWidth: r ? r.width : 0,
			itemCount: items?.length || 0,
		};
	});
	log('explorer probe:', JSON.stringify(explorerProbe));

	if (explorerProbe.found) {
		record('Explorer page rendered', explorerProbe.bodyHeight > 0,
			`bodyHeight=${explorerProbe.bodyHeight} items=${explorerProbe.itemCount}`);
	} else {
		// Maybe the legacy widget is showing — check for that as a sanity signal.
		const widgetProbe = await page.evaluate(() => !!document.querySelector('.sidebarPage.pageWidget'));
		record('Explorer page rendered', false, widgetProbe ? 'widget sidebar showing instead' : 'no sidebar at all');
	};

	await shot(page, '03-final');

	if (consoleErrors.length) {
		console.log('--- console errors during run ---');
		consoleErrors.slice(0, 10).forEach(e => console.log(e));
	};
} catch (e) {
	console.error('[e2e] error:', e.message);
	results.push({ name: 'driver crashed', ok: false, note: e.message });
} finally {
	if (app) {
		try { await app.close(); } catch {};
	};
};

console.log('\n=== summary ===');
let passed = 0, failed = 0;
for (const r of results) {
	console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.note ? ' — ' + r.note : ''}`);
	if (r.ok) passed++; else failed++;
};
console.log(`${passed}/${passed + failed} passed`);
process.exit(failed > 0 ? 1 : 0);
