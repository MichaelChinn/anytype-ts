import React from 'react';

/**
 * Anytype-fork custom-type renderer registry.
 *
 * Per PLAN.md §"Renderer Registry": each custom type can define a layout
 * configuration as JSON (in `.anytype/renderers/<type-key>.json`) that maps
 * relation values to visual components. This registry resolves the component
 * keys used in those configs to the React components that render them.
 *
 * The block-based renderer is the default. The custom renderer is a parallel
 * pipeline opted into by the runtime feature flag `experimentalRenderers`.
 */

export interface SectionConfig {
	/** Component key — must be present in the registry. */
	component: string;
	/** Relation key whose value the component reads from. */
	source?: string;
	/** Multi-source variant (e.g. badge-row pulls multiple relations). */
	sources?: string[];
	/** For `markdown-render`: relation key whose value is a URL to fetch at render time. */
	fetchFrom?: string;
	/** Visual style hint (e.g. `card`, `inline`). */
	style?: string;
	/** Static label (e.g. for `link`'s "View on GitHub"). */
	label?: string;
};

export interface LayoutConfig {
	sections: SectionConfig[];
};

export interface SectionProps {
	/** The Anytype object whose relation values feed the section. */
	object: any;
	/** The section's slice of the layout config. */
	config: SectionConfig;
};

type SectionComponent = React.ComponentType<SectionProps>;

const components: Map<string, SectionComponent> = new Map();

const RendererRegistry = {

	/** Register a section component under the given key. Idempotent. */
	register (key: string, component: SectionComponent): void {
		components.set(key, component);
	},

	/** Look up a section component by key. Returns `null` if unknown. */
	resolve (key: string): SectionComponent | null {
		return components.get(key) || null;
	},

	/** Returns all registered keys (sorted) — useful for tooling. */
	keys (): string[] {
		return [ ...components.keys() ].sort();
	},

	/** Test helper — clear all registrations. Don't call from production code. */
	__resetForTests (): void {
		components.clear();
	},

};

export default RendererRegistry;
