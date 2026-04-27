import React from 'react';
import RendererRegistry, { SectionProps } from './registry';

const valueOf = (object: any, key?: string): any => {
	if (!object || !key) {
		return null;
	};
	return object[key];
};

const HeaderSection: React.FC<SectionProps> = ({ object, config }) => {
	const text = valueOf(object, config.source) || '';
	if (!text) {
		return null;
	};
	return <h1 className="customRenderer-header">{text}</h1>;
};

const TextSection: React.FC<SectionProps> = ({ object, config }) => {
	const text = valueOf(object, config.source) || '';
	if (!text) {
		return null;
	};
	return <p className="customRenderer-text">{text}</p>;
};

const LinkSection: React.FC<SectionProps> = ({ object, config }) => {
	const url = valueOf(object, config.source);
	if (!url) {
		return null;
	};
	const label = config.label || url;
	return (
		<a className="customRenderer-link" href={url} target="_blank" rel="noreferrer">{label}</a>
	);
};

const BadgeRowSection: React.FC<SectionProps> = ({ object, config }) => {
	const sources = config.sources || [];
	const badges = sources
		.map(key => ({ key, value: valueOf(object, key) }))
		.filter(it => (it.value !== undefined) && (it.value !== null) && (it.value !== ''));

	if (!badges.length) {
		return null;
	};

	return (
		<div className="customRenderer-badgeRow">
			{badges.map(b => (
				<span key={b.key} className="customRenderer-badge">{String(b.value)}</span>
			))}
		</div>
	);
};

const ImageSection: React.FC<SectionProps> = ({ object, config }) => {
	const src = valueOf(object, config.source);
	if (!src) {
		return null;
	};
	return <img className="customRenderer-image" src={src} alt={config.label || ''} />;
};

const PreviewSection: React.FC<SectionProps> = ({ object, config }) => {
	const url = valueOf(object, config.source);
	if (!url) {
		return null;
	};
	const cn = [ 'customRenderer-preview' ];
	if (config.style) {
		cn.push(`is-${config.style}`);
	};
	return (
		<div className={cn.join(' ')}>
			<a href={url} target="_blank" rel="noreferrer">{url}</a>
		</div>
	);
};

const MarkdownRenderSection: React.FC<SectionProps> = ({ object, config }) => {
	// `fetchFrom` indicates a relation containing a URL to fetch at render
	// time. Per PLAN.md issue #12, fetched content is render-only — never
	// stored on disk or in the DB. Phase 6.3 ships the fetch stub; the actual
	// fetcher (CORS-aware, caching, sandboxing) lands in a follow-up.
	const url = valueOf(object, config.fetchFrom);
	if (!url) {
		return null;
	};
	return (
		<div className="customRenderer-markdown" data-fetch-from={url}>
			<em>Fetched preview pending — see PLAN.md Phase 6.3 follow-up.</em>
		</div>
	);
};

RendererRegistry.register('header', HeaderSection);
RendererRegistry.register('text', TextSection);
RendererRegistry.register('link', LinkSection);
RendererRegistry.register('badge-row', BadgeRowSection);
RendererRegistry.register('image', ImageSection);
RendererRegistry.register('preview', PreviewSection);
RendererRegistry.register('markdown-render', MarkdownRenderSection);

export {
	HeaderSection,
	TextSection,
	LinkSection,
	BadgeRowSection,
	ImageSection,
	PreviewSection,
	MarkdownRenderSection,
};
