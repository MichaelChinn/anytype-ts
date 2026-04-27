import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import CustomRenderer from './index';

const withRenderer = (Story: React.ComponentType) => (
	<div style={{ padding: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
		<Story />
	</div>
);

const meta: Meta<typeof CustomRenderer> = {
	title: 'Renderer/CustomRenderer',
	component: CustomRenderer,
	tags: ['autodocs'],
	decorators: [ withRenderer ],
};

export { meta as default };
type Story = StoryObj<typeof meta>;

const sampleObject = {
	name: 'anytype-ts',
	url: 'https://github.com/anyproto/anytype-ts',
	description: 'Official Anytype client for MacOS, Linux, and Windows',
	language: 'TypeScript',
	stars: 7400,
};

export const GithubRepo: Story = {
	args: {
		object: sampleObject,
		config: {
			sections: [
				{ component: 'header', source: 'name' },
				{ component: 'badge-row', sources: [ 'language', 'stars' ] },
				{ component: 'markdown-render', fetchFrom: 'url' },
				{ component: 'link', source: 'url', label: 'View on GitHub' },
			],
		},
	},
};

export const Bookmark: Story = {
	args: {
		object: { name: 'Example Site', url: 'https://example.com', description: 'An example.' },
		config: {
			sections: [
				{ component: 'header', source: 'name' },
				{ component: 'preview', source: 'url', style: 'card' },
				{ component: 'text', source: 'description' },
			],
		},
	},
};

export const UnknownComponent: Story = {
	args: {
		object: sampleObject,
		config: {
			sections: [
				{ component: 'header', source: 'name' },
				{ component: 'this-is-not-registered', source: 'name' },
				{ component: 'text', source: 'description' },
			],
		},
	},
};

export const EmptyConfig: Story = {
	args: { object: sampleObject, config: null },
};
