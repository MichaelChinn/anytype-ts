import path from 'path';
import childProcess from 'child_process';
import fs from 'fs';
import { app, dialog, shell } from 'electron';
import Util from './util';

const stdoutWebProxyPrefix = 'gRPC Web proxy started at: ';
const stdoutGrpcPrefix = 'gRPC server started at: ';
// Anytype-fork: structured ready marker emitted by anytype-heart once both
// gRPC and gRPC-Web listeners accept connections. See anytype-heart
// `cmd/grpcserver/grpc.go:anytypeHeartReadyPrefix`.
const stdoutHeartReadyPrefix = 'ANYTYPE_HEART_READY ';
const stdoutBufferCap = 64 * 1024;
const stdoutBufferTrim = 32 * 1024;
const winShutdownStdinMessage = 'shutdown\n';

let maxStdErrChunksBuffer = 10;

class Server {

	cp: childProcess.ChildProcess | null = null;
	address: string = '';
	grpcAddress: string = '';
	isRunning: boolean = false;
	stopTriggered: boolean = false;
	lastErrors: string[] = [];
	stdoutBuffer: string = '';

	start (binPath: string, workingDir: string): Promise<boolean> {
		console.log('[Server]: start', binPath, workingDir);

		const logPath = Util.logPath();
		const env = process.env;

		return new Promise((resolve, reject) => {

			// stop will resolve immediately in case child process is not running
			this.stop().then(() => {
				this.isRunning = false;

				try {
					if (!process.stdout.isTTY) {
						env['GOLOG_FILE'] = path.join(logPath, `anytype_${Util.dateForFile()}.log`);
					};

					this.cp = childProcess.spawn(binPath, [ '127.0.0.1:0', '127.0.0.1:0' ], { windowsHide: false, env });
				} catch (err: any) {
					console.error('[Server] Process start error: ', err.toString());
					reject(err);
				};

				this.cp.on('error', (err: any) => {
					this.isRunning = false;
					console.error('[Server] Failed to start server: ', err.toString());
					reject(err);
				});

				this.cp.stdout.on('data', (data: Buffer) => {
					const str = data.toString();

					// Do not delete — we want the raw heart logs in dev console.
					console.log(str);

					if (this.isRunning) {
						return;
					};

					// Buffer chunks because boundary lines can split across `data`
					// events; we need to be able to scan for both legacy lines
					// regardless of how stdout was framed.
					this.stdoutBuffer += str;
					if (this.stdoutBuffer.length > stdoutBufferCap) {
						this.stdoutBuffer = this.stdoutBuffer.slice(-stdoutBufferTrim);
					};

					// Fast path: structured marker from the anytype-heart fork —
					// single line, JSON tail; gives us both addresses at once.
					const markerStart = this.stdoutBuffer.indexOf(stdoutHeartReadyPrefix);
					if (markerStart >= 0) {
						const lineEnd = this.stdoutBuffer.indexOf('\n', markerStart);
						if (lineEnd >= 0) {
							const payload = this.stdoutBuffer.slice(markerStart + stdoutHeartReadyPrefix.length, lineEnd).trim();
							try {
								const parsed = JSON.parse(payload);
								if (parsed.grpcWeb) {
									this.address = 'http://' + parsed.grpcWeb;
								};
								if (parsed.grpc) {
									this.grpcAddress = parsed.grpc;
								};
								if (this.address) {
									this.isRunning = true;
									this.stdoutBuffer = '';
									console.log('[Server] heart ready (marker):', this.grpcAddress, this.address);
									resolve(true);
									return;
								};
							} catch (e) {
								console.error('[Server] Failed to parse ready marker:', payload, e);
							};
						};
					};

					// Legacy path: stock heart prints two free-form lines that
					// can land in the same chunk or in separate chunks. Capture
					// both when available so sync-fs can be spawned with the
					// gRPC port. Resolve as soon as we see the web-proxy line —
					// preserves the prior contract for non-fork binaries.
					if (!this.grpcAddress) {
						const m = this.stdoutBuffer.match(new RegExp(stdoutGrpcPrefix + '(\\S+)'));
						if (m) {
							this.grpcAddress = m[1];
						};
					};
					if (!this.address) {
						const m = this.stdoutBuffer.match(new RegExp(stdoutWebProxyPrefix + '(\\S+)'));
						if (m) {
							this.address = 'http://' + m[1];
							this.isRunning = true;
							this.stdoutBuffer = '';
							const grpcLabel = this.grpcAddress || '(grpc line not seen)';
							console.log('[Server] heart ready (legacy):', grpcLabel, this.address);
							resolve(true);
						};
					};
				});

				this.cp.stderr.on('data', (data: Buffer) => {
					const chunk = data.toString();

					// max chunk size is 8192 bytes
					// https://github.com/nodejs/node/issues/12921
					// https://nodejs.org/api/buffer.html#buffer_class_property_buffer_poolsize

					if (chunk.length > 8000) {
						// in case we've got a crash lets change the max buffer to collect the whole stack trace
						maxStdErrChunksBuffer = 2048; // 2048x8192 = 16 Mb max
					};

					if (!this.lastErrors) {
						this.lastErrors = [];
					} else
					if (this.lastErrors.length >= maxStdErrChunksBuffer) {
						this.lastErrors.shift();
					};

					this.lastErrors.push(chunk);
					console.log(chunk);
				});

				this.cp.on('exit', () => {
					if (this.stopTriggered) {
						return;
					};

					this.isRunning = false;

					const log = path.join(logPath, `crash_${Util.dateForFile()}.log`);
					try {
						fs.writeFileSync(log, this.lastErrors.join('\n'), 'utf-8');
					} catch(e) {
						console.log('[Server]: Failed to save log file', log);
					};

					dialog.showErrorBox('Anytype helper crashed', 'You will be redirected to the crash log file. You can send it to Anytype developers by creating issue at https://community.anytype.io');
					shell.showItemInFolder(log);

					app.exit(0);
				});
			});
		});
	};

	stop (signal?: string): Promise<boolean> {
		signal = String(signal || 'SIGTERM');

		return new Promise((resolve, reject) => {
			if (this.cp && this.isRunning) {
				this.cp.on('exit', () => {
					resolve(true);

					this.isRunning = false;
					this.cp = null;
				});

				this.stopTriggered = true;
 				if (process.platform === 'win32') {
					 // it is not possible to handle os signals on windows, so we can't do graceful shutdown on go side
					this.cp.stdin.write(winShutdownStdinMessage);
				} else {
					this.cp.kill(signal as NodeJS.Signals);
				};
			} else {
				resolve(true);
			};
		});
	};

	getAddress (): string {
		return this.address;
	};

	setAddress (address: string): void {
		this.address = address;
	};

	getGrpcAddress (): string {
		return this.grpcAddress;
	};

};

export default new Server();
