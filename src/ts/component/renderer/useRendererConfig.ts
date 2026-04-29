import { useEffect, useState } from 'react';
import Renderer from 'Lib/renderer';
import { LayoutConfig } from './registry';

// In-process cache so repeated lookups for the same key don't repeatedly
// IPC into the main process. Keyed by raw type key (e.g. "github-repo").
const cache: Map<string, LayoutConfig | null> = new Map();
const inflight: Map<string, Promise<LayoutConfig | null>> = new Map();

/**
 * Loads a custom-type renderer layout config from
 * `<workspace>/.anytype/renderers/<typeKey>.json` via Electron IPC.
 *
 * Returns:
 *   - `undefined` while loading
 *   - `null` when the config doesn't exist or fails to parse
 *   - the parsed `LayoutConfig` on success
 *
 * Callers should treat `null` as "no custom renderer for this type" and fall
 * back to the default block-based renderer.
 */
export const useRendererConfig = (typeKey: string): LayoutConfig | null | undefined => {
	const [ state, setState ] = useState<LayoutConfig | null | undefined>(undefined);

	useEffect(() => {
		if (!typeKey) {
			setState(null);
			return;
		};

		if (cache.has(typeKey)) {
			setState(cache.get(typeKey) || null);
			return;
		};

		let cancelled = false;
		const load = async (): Promise<LayoutConfig | null> => {
			if (inflight.has(typeKey)) {
				return inflight.get(typeKey)!;
			};
			const p = (async () => {
				try {
					const cfg = await Promise.resolve(Renderer.send('getRendererConfig', typeKey));
					const valid = (cfg && Array.isArray(cfg.sections)) ? (cfg as LayoutConfig) : null;
					cache.set(typeKey, valid);
					return valid;
				} catch (err) {
					cache.set(typeKey, null);
					return null;
				};
			})();
			inflight.set(typeKey, p);
			try {
				return await p;
			} finally {
				inflight.delete(typeKey);
			};
		};

		load().then(cfg => {
			if (!cancelled) {
				setState(cfg);
			};
		});

		return () => {
			cancelled = true;
		};
	}, [ typeKey ]);

	return state;
};

/** Test/dev helper — drop the in-process cache so a fresh IPC fires. */
export const __resetRendererConfigCache = (): void => {
	cache.clear();
	inflight.clear();
};
