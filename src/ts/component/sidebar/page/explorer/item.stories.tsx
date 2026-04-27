import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ExplorerItem from './item';

const withExplorer = (Story: React.ComponentType) => (
	<div className="sidebar left" style={{ position: 'relative' }}>
		<div className="sidebarPage pageExplorer" style={{ width: 280, padding: 8 }}>
			<div className="body">
				<Story />
			</div>
		</div>
	</div>
);

const meta: Meta<typeof ExplorerItem> = {
	title: 'Sidebar/Explorer/Item',
	component: ExplorerItem,
	tags: ['autodocs'],
	decorators: [ withExplorer ],
};

export { meta as default };
type Story = StoryObj<typeof meta>;

const baseArgs = {
	id: 'storybook-explorer-item',
	parentId: '',
	branch: 'storybook',
	treeKey: 'storybook',
	index: 0,
	depth: 1,
	numChildren: 0,
	getSubId: () => 'storybook-sub',
	getSubKey: () => 'storybook-sub-key',
	onClick: () => {},
	onToggle: () => {},
};

export const Page: Story = {
	args: { ...baseArgs },
};

export const Collection: Story = {
	args: { ...baseArgs, numChildren: 3 },
};

export const Section: Story = {
	args: { ...baseArgs, isSection: true, depth: 0 },
};

export const Nested: Story = {
	args: { ...baseArgs, depth: 3 },
};
