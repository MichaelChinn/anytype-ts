import React from 'react';
import RendererRegistry, { LayoutConfig, SectionConfig } from './registry';
import './sections';

interface CustomRendererProps {
	object: any;
	config: LayoutConfig | null;
};

/**
 * Renders an Anytype object using a custom layout config — a parallel
 * pipeline to the block-based renderer. Falls back to `null` when the layout
 * is missing or any required component isn't registered, so the caller can
 * route to the default renderer.
 *
 * Phase 6.3 wires the registry + section components. Layout config loading
 * (from `.anytype/renderers/<type-key>.json`) and integration into the editor
 * page are follow-up work — see docs/HANDOFF.md.
 */
const CustomRenderer: React.FC<CustomRendererProps> = ({ object, config }) => {
	if (!config || !config.sections?.length) {
		return null;
	};

	return (
		<div className="customRenderer">
			{config.sections.map((section: SectionConfig, idx: number) => {
				const Component = RendererRegistry.resolve(section.component);
				if (!Component) {
					console.warn(`[CustomRenderer] unknown component "${section.component}"`);
					return null;
				};
				return <Component key={idx} object={object} config={section} />;
			})}
		</div>
	);
};

export default CustomRenderer;
