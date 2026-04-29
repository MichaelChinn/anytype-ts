import childProcess from 'child_process';
import fs from 'fs';

const stdoutReadyPrefix = 'anytype-sync-fs ready';
const winShutdownStdinMessage = 'shutdown\n';

export interface SyncFsLaunchParams {
	binPath: string;
	heartAddr: string;
	workspace: string;
	token?: string;
	spaceId?: string;
	excludes?: string[];
};

/**
 * Spawns the `anytype-sync-fs` Go binary alongside the anytype-heart process.
 * Mirrors the lifecycle of `Server` (heart): start once heart is ready, stop on
 * Electron app quit. Logs stdout/stderr to the main-process console.
 *
 * Skips launching when:
 *  - the binary file is missing (e.g. dev builds without sync-fs compiled),
 *  - no workspace path is provided.
 *
 * Either condition is non-fatal: the rest of the app continues without
 * filesystem sync.
 *
 * applyConfig is the user-driven hot-reload path: when fork settings change,
 * Electron calls applyConfig with the next desired config. If only the
 * exclude list changed, sync-fs gets a JSON stdin command and stays running.
 * Anything else (workspace path / space-id / token) requires a full respawn
 * since those are only read at startup.
 */
class SyncFs {

	cp: childProcess.ChildProcess | null = null;
	isRunning = false;
	stopTriggered = false;
	current: SyncFsLaunchParams | null = null;
	applying = false;

	start (params: SyncFsLaunchParams): Promise<boolean> {
		const { binPath, heartAddr, workspace, token, spaceId, excludes = [] } = params;

		if (!workspace) {
			console.log('[SyncFs] no workspace configured, skipping launch');
			this.current = null;
			return Promise.resolve(false);
		};

		if (!fs.existsSync(binPath)) {
			console.log('[SyncFs] binary not found at', binPath, '— skipping launch');
			this.current = null;
			return Promise.resolve(false);
		};

		console.log('[SyncFs] start', binPath, '->', heartAddr, workspace, 'excludes:', excludes.length);

		const args = [
			'--heart-addr', heartAddr,
			'--workspace', workspace,
		];
		if (token) {
			args.push('--token', token);
		};
		if (spaceId) {
			args.push('--space-id', spaceId);
		};
		for (const ex of excludes) {
			args.push('--exclude', ex);
		};

		return new Promise((resolve, reject) => {
			this.stop().then(() => {
				try {
					this.cp = childProcess.spawn(binPath, args, { windowsHide: false, env: process.env });
					this.stopTriggered = false;
				} catch (err: any) {
					console.error('[SyncFs] spawn error:', err.toString());
					reject(err);
					return;
				};

				this.cp.on('error', (err: any) => {
					this.isRunning = false;
					console.error('[SyncFs] process error:', err.toString());
					reject(err);
				});

				this.cp.stdout?.on('data', (data: Buffer) => {
					const str = data.toString();

					if (!this.isRunning && str.indexOf(stdoutReadyPrefix) >= 0) {
						this.isRunning = true;
						this.current = params;
						resolve(true);
					};

					console.log('[SyncFs]', str.trimEnd());
				});

				this.cp.stderr?.on('data', (data: Buffer) => {
					console.log('[SyncFs:err]', data.toString().trimEnd());
				});

				this.cp.on('exit', (code, signal) => {
					if (this.stopTriggered) {
						return;
					};

					this.isRunning = false;
					console.log('[SyncFs] exited unexpectedly:', code, signal);
				});
			});
		});
	};

	stop (signal?: string): Promise<boolean> {
		signal = String(signal || 'SIGTERM');

		return new Promise((resolve) => {
			if (!this.cp || !this.isRunning) {
				resolve(true);
				return;
			};

			this.stopTriggered = true;
			this.cp.on('exit', () => {
				this.isRunning = false;
				this.cp = null;
				resolve(true);
			});

			if (process.platform === 'win32') {
				// Same trick heart uses: stdin "shutdown\n" because Windows
				// can't deliver POSIX signals to non-console processes.
				this.cp.stdin?.write(winShutdownStdinMessage);
			} else {
				this.cp.kill(signal as NodeJS.Signals);
			};
		});
	};

	/**
	 * Apply a new desired config. Diffs against the current launch params:
	 *   - excludes-only change → write set-excludes JSON to child stdin (no restart)
	 *   - any other field changed → stop, then start with new args
	 *   - no current child (binary missing / no workspace) → start fresh
	 *   - next is null OR has no workspace → stop the running child (no replacement)
	 *
	 * Returns true on success. Throws on failure (caller surfaces to UI).
	 */
	async applyConfig (next: SyncFsLaunchParams | null): Promise<boolean> {
		if (this.applying) {
			throw new Error('SyncFs is already applying a config change');
		};
		this.applying = true;
		try {
			if (!next || !next.workspace) {
				if (this.isRunning) {
					await this.stop();
				};
				this.current = null;
				return true;
			};

			const cur = this.current;

			if (!cur || !this.isRunning) {
				return await this.start(next);
			};

			const restartRequired = (
				(cur.workspace !== next.workspace) ||
				(cur.heartAddr !== next.heartAddr) ||
				((cur.token || '') !== (next.token || '')) ||
				((cur.spaceId || '') !== (next.spaceId || '')) ||
				(cur.binPath !== next.binPath)
			);

			if (restartRequired) {
				console.log('[SyncFs] applyConfig: respawn required');
				await this.stop();
				return await this.start(next);
			};

			const nextEx = next.excludes || [];
			const curEx = cur.excludes || [];
			if (excludesEqual(curEx, nextEx)) {
				console.log('[SyncFs] applyConfig: no-op');
				return true;
			};

			const ok = await this.sendSetExcludes(nextEx);
			if (!ok) {
				console.log('[SyncFs] applyConfig: stdin set-excludes failed, falling back to respawn');
				await this.stop();
				return await this.start(next);
			};
			this.current = { ...cur, excludes: nextEx };
			return true;
		} finally {
			this.applying = false;
		};
	};

	private sendSetExcludes (paths: string[]): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.cp || !this.cp.stdin || !this.isRunning) {
				resolve(false);
				return;
			};
			const cmd = JSON.stringify({ op: 'set-excludes', paths }) + '\n';
			this.cp.stdin.write(cmd, (err) => {
				if (err) {
					console.error('[SyncFs] set-excludes write error:', err.toString());
					resolve(false);
					return;
				};
				console.log('[SyncFs] set-excludes sent (' + paths.length + ' paths)');
				resolve(true);
			});
		});
	};

	getCurrent (): SyncFsLaunchParams | null {
		return this.current;
	};

	isApplying (): boolean {
		return this.applying;
	};

};

function excludesEqual (a: string[], b: string[]): boolean {
	if (a.length !== b.length) {
		return false;
	};
	const sa = [ ...a ].sort();
	const sb = [ ...b ].sort();
	for (let i = 0; i < sa.length; i++) {
		if (sa[i] !== sb[i]) {
			return false;
		};
	};
	return true;
};

export default new SyncFs();
