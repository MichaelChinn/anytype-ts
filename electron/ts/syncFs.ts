import path from 'path';
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
 */
class SyncFs {

	cp: childProcess.ChildProcess | null = null;
	isRunning = false;
	stopTriggered = false;

	start (params: SyncFsLaunchParams): Promise<boolean> {
		const { binPath, heartAddr, workspace, token, spaceId } = params;

		if (!workspace) {
			console.log('[SyncFs] no workspace configured, skipping launch');
			return Promise.resolve(false);
		};

		if (!fs.existsSync(binPath)) {
			console.log('[SyncFs] binary not found at', binPath, '— skipping launch');
			return Promise.resolve(false);
		};

		console.log('[SyncFs] start', binPath, '->', heartAddr, workspace);

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

		return new Promise((resolve, reject) => {
			this.stop().then(() => {
				try {
					this.cp = childProcess.spawn(binPath, args, { windowsHide: false, env: process.env });
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

};

export default new SyncFs();
