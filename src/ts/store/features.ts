import { action, makeObservable, observable, set as mobxSet } from 'mobx';
import Storage from 'Lib/storage';

const STORAGE_KEY = 'features';

export type RuntimeFeatures = {
	legacyWidgetSidebar: boolean;
	showHiddenFiles: boolean;
	experimentalRenderers: boolean;
};

const DEFAULTS: RuntimeFeatures = {
	legacyWidgetSidebar: false,
	showHiddenFiles: false,
	experimentalRenderers: false,
};

class FeaturesStore {

	public values: RuntimeFeatures = { ...DEFAULTS };

	constructor () {
		makeObservable(this, {
			values: observable,
			set: action,
			init: action,
		});
	};

	/**
	 * Loads persisted runtime feature flags from Storage. Should be called once
	 * during app boot (see `app.tsx`).
	 *
	 * Long-term plan (PLAN.md §"Feature Flags") is to read `.anytype/features.json`
	 * via the sync-fs pipeline so flags can be edited by the user from the
	 * filesystem. Until that pipeline is wired up, Storage gives us functional
	 * toggleability with the same shape.
	 */
	init (): void {
		const persisted = (Storage.get(STORAGE_KEY) || {}) as Partial<RuntimeFeatures>;
		const merged: RuntimeFeatures = { ...DEFAULTS, ...persisted };
		mobxSet(this.values, merged);
	};

	get<K extends keyof RuntimeFeatures> (key: K): RuntimeFeatures[K] {
		return this.values[key];
	};

	set<K extends keyof RuntimeFeatures> (key: K, value: RuntimeFeatures[K]): void {
		this.values[key] = value;
		Storage.set(STORAGE_KEY, { ...this.values });
	};

	reset (): void {
		mobxSet(this.values, DEFAULTS);
		Storage.set(STORAGE_KEY, { ...DEFAULTS });
	};

	/**
	 * Returns the page id that should be rendered in the sub-panel of the
	 * left sidebar. Defaults to the file explorer; falls back to the legacy
	 * widget sidebar when the user opts in via the runtime flag.
	 */
	getDefaultSubPage (): 'widget' | 'explorer' {
		return this.values.legacyWidgetSidebar ? 'widget' : 'explorer';
	};

};

export const Features: FeaturesStore = new FeaturesStore();
