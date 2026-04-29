// E2E driver focused on the new drag-drop and context-menu features in the
// explorer. Builds on e2e-electron.mjs's launch sequence but adds:
//   1. Right-click an explorer item -> select menu opens with Open / Open in
//      new window / Move to Bin entries.
//   2. Verify draggable=true is set on item rows (HTML5 drag opt-in).
// Drag *event* simulation (HTML5 dragstart -> drop) is brittle in Playwright
// because the synthetic events don't always reach React's handlers; we settle
// for the static "draggable attribute is present" assertion which is what
// actually unlocks the browser's native drag UX.
//
// Usage:  node scripts/e2e-explorer-interactions.mjs

import { _electron as electron } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(root, 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const shot = async (page, name) => {
	const out = path.join(outDir, `e2e-explorer-${name}.png`);
	await page.screenshot({ path: out, fullPage: false });
	return out;
};
const log = (...a) => console.log('[e2e-explorer]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const record = (name, ok, note = '') => {
	console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${note ? ' — ' + note : ''}`);
	results.push({ name, ok, note });
};

let app;
try {
	app = await electron.launch({
		executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
		args: [ path.join(root, 'electron.js') ],
		cwd: root,
		env: { ...process.env, NODE_ENV: 'development' },
		timeout: 60000,
	});
	await app.firstWindow({ timeout: 60000 });

	const deadline = Date.now() + 60000;
	let page = null;
	while (Date.now() < deadline) {
		const found = app.windows().find(w => w.url().includes('index.html'));
		if (found) { page = found; break; };
		await sleep(500);
	};
	if (!page) {
		throw new Error('inner app window (index.html) never appeared');
	};
	await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
	log(`inner window loaded: ${page.url()}`);
	await sleep(8000);

	// Wait for the explorer to render at least one item.
	let attempts = 0;
	let firstItemHandle = null;
	while (attempts < 30) {
		const handle = await page.$('.sidebarPage.pageExplorer .body .item:not(.isSection)');
		if (handle) { firstItemHandle = handle; break; };
		await sleep(500);
		attempts++;
	};
	if (!firstItemHandle) {
		record('Explorer item present', false, 'no .item rendered after 15s');
		throw new Error('no explorer item');
	};
	record('Explorer item present', true);

	// Static check: items opt into drag.
	const isDraggable = await firstItemHandle.evaluate(el => el.getAttribute('draggable'));
	record('Item has draggable attribute', isDraggable === 'true', `draggable="${isDraggable}"`);

	// Take a baseline screenshot.
	await shot(page, '01-explorer-initial');

	// Right-click the first item to open the context menu.
	const box = await firstItemHandle.boundingBox();
	if (!box) {
		record('First item has bounding box', false);
	} else {
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down({ button: 'right' });
		await page.mouse.up({ button: 'right' });
		await sleep(800);
		await shot(page, '02-context-menu');

		// The menu component renders into a portal under #menu-* — find it.
		const menuItems = await page.evaluate(() => {
			const items = Array.from(document.querySelectorAll('.menu .item, .menu .menuItem, .menus .item'));
			return items.map(it => (it.innerText || '').trim()).filter(Boolean);
		});
		log('menu items found:', JSON.stringify(menuItems.slice(0, 12)));

		const expected = [ 'Open', 'Open in new window', 'Move to Bin' ];
		const missing = expected.filter(e => !menuItems.some(m => m.toLowerCase().includes(e.toLowerCase())));
		record('Context menu opened with expected items', missing.length === 0,
			missing.length ? `missing: ${missing.join(', ')}; saw: ${menuItems.slice(0, 8).join(' | ')}` : `${menuItems.length} items`);

		// Dismiss the menu before exiting.
		await page.keyboard.press('Escape');
	};

	// One more screenshot after the menu is dismissed.
	await sleep(500);
	await shot(page, '03-explorer-final');

	// --- Create buttons -----------------------------------------------------
	// Verify the two header buttons (#button-explorer-new-page and
	// #button-explorer-new-folder) exist and create the right kind of object
	// when clicked. The explorer subscribes via U.Subscription so a
	// successful ObjectCreate is reflected in the item list shortly after
	// the gRPC round trip.

	const explorerItemCount = async () => page.evaluate(() => {
		const items = document.querySelectorAll('.sidebarPage.pageExplorer .body .item:not(.isSection)');
		return items.length;
	});

	const collectionItemCount = async () => page.evaluate(() => {
		// Collections render with .iconObject c14 (collection layout). Cheaper
		// proxy: count items whose icon container has the layers icon class.
		// Fall back to "items above the FILES section" in tree order, which
		// the explorer.buildTree groups before orphans.
		const items = Array.from(document.querySelectorAll('.sidebarPage.pageExplorer .body .item'));
		let beforeFiles = 0;
		for (const el of items) {
			if (el.classList.contains('isSection')) break;
			beforeFiles++;
		};
		return beforeFiles;
	});

	const newPageBtn = await page.$('#button-explorer-new-page');
	const newFolderBtn = await page.$('#button-explorer-new-folder');
	record('New page button present', !!newPageBtn);
	record('New folder button present', !!newFolderBtn);

	if (newFolderBtn) {
		const before = await collectionItemCount();
		await newFolderBtn.click();
		// Wait for the new collection to appear in the tree.
		const deadline = Date.now() + 8000;
		let after = before;
		while (Date.now() < deadline) {
			after = await collectionItemCount();
			if (after > before) break;
			await sleep(250);
		};
		record('New folder click creates a collection item', after > before,
			`collections before=${before} after=${after}`);
		await shot(page, '04-after-new-folder');
	};

	if (newPageBtn) {
		// The new page sorts to wherever "Untitled" lands in the
		// react-virtualized list and Anytype routes via Electron IPC
		// (Renderer.send), so DOM-counting and URL/hash checks are both
		// unreliable. Instead, detect creation by reading the explorer's
		// virtualized inner-list height — react-virtualized renders
		// `<div style="height: <totalRows * rowHeight>">` regardless of
		// what's currently scrolled into view.
		const readListHeight = () => page.evaluate(() => {
			const inner = document.querySelector(
				'.sidebarPage.pageExplorer .body .ReactVirtualized__Grid__innerScrollContainer'
			);
			return inner ? inner.getBoundingClientRect().height : 0;
		});
		const before = await readListHeight();
		await newPageBtn.click();
		const deadline = Date.now() + 8000;
		let after = before;
		while (Date.now() < deadline) {
			after = await readListHeight();
			if (after > before) break;
			await sleep(250);
		};
		record('New page click adds a row to the explorer list', after > before,
			`list innerHeight ${before} -> ${after}`);
		await shot(page, '05-after-new-page');
	};

} catch (e) {
	console.error('[e2e-explorer] error:', e.message);
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
