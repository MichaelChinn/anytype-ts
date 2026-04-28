// Probe — what windows / webContents does Electron expose?
import { _electron as electron } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const app = await electron.launch({
	executablePath: path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe'),
	args: [ path.join(root, 'electron.js') ],
	cwd: root,
	env: { ...process.env, NODE_ENV: 'development' },
	timeout: 60000,
});

await new Promise(r => setTimeout(r, 12000));

const wins = app.windows();
console.log(`windows: ${wins.length}`);
for (const w of wins) {
	console.log(`  url=${w.url()}  title=${await w.title().catch(() => '?')}`);
}

const wcInfo = await app.evaluate(({ webContents }) => {
	return webContents.getAllWebContents().map(wc => ({
		id: wc.id,
		type: wc.getType(),
		url: wc.getURL(),
		title: wc.getTitle(),
	}));
});
console.log('all webContents:');
for (const wc of wcInfo) console.log(' ', wc);

await app.close();
