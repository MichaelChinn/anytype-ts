import React from 'react';
import CustomRenderer from './index';
import { useRendererConfig } from './useRendererConfig';

interface CustomRendererHostProps {
	object: any;
	typeKey: string;
	fallback: React.ReactNode;
};

/**
 * Drop-in wrapper around CustomRenderer that handles the loading state and
 * the fallback to the default renderer. Pass the type's key (e.g. "book",
 * "github-repo") and a `fallback` element — usually the existing
 * block-based editor — and this component will render the custom layout
 * when a `.anytype/renderers/<typeKey>.json` exists, otherwise the
 * fallback.
 *
 * Editor integration sketch (see docs/HANDOFF.md "Layout config integration"):
 *
 *   <CustomRendererHost
 *     object={object}
 *     typeKey={typeKey}
 *     fallback={<EditorPage rootId={rootId} ... />}
 *   />
 *
 * The custom renderer is gated on Features.experimentalRenderers at the
 * call site — this component itself is unconditional once the flag is on.
 */
const CustomRendererHost: React.FC<CustomRendererHostProps> = ({ object, typeKey, fallback }) => {
	const config = useRendererConfig(typeKey);

	// `undefined` while loading — render the fallback to avoid flicker.
	if (config === undefined) {
		return <>{fallback}</>;
	};
	if (!config) {
		return <>{fallback}</>;
	};
	return <CustomRenderer object={object} config={config} />;
};

export default CustomRendererHost;
