import React, { forwardRef, useImperativeHandle, useEffect, useRef, useState, MouseEvent } from 'react';
import { AutoSizer, CellMeasurer, CellMeasurerCache, List } from 'react-virtualized';
import { Filter, Label, SpaceName } from 'Component';
import * as I from 'Interface';
import Storage from 'Lib/storage';
import ExplorerItem from './explorer/item';

const HEIGHT = 28;
const MAX_DEPTH = 15;
const SUB_KEY = 'sidebarExplorer';

interface ExplorerNode {
	id: string;
	parentId: string;
	depth: number;
	numChildren: number;
	branch: string;
	isSection?: boolean;
};

const SidebarPageExplorer = forwardRef<{}, I.SidebarPageComponent>((props, ref) => {

	const { isPopup, getId } = props;
	const { space } = S.Common;
	const subId = U.Subscription.spaceSubId(J.Constant.subId.sidebarExplorer);
	const nodeRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<List>(null);
	const filterRef = useRef(null);
	const filterValue = useRef('');
	const filterTimeout = useRef(0);
	const branches = useRef<Set<string>>(new Set());
	const top = useRef(0);
	const cache = useRef(new CellMeasurerCache({ fixedHeight: true, defaultHeight: HEIGHT }));
	const [ searchIds, setSearchIds ] = useState<string[]>([]);
	const [ , setDummy ] = useState(0);
	const forceUpdate = () => setDummy(v => v + 1);

	const getRecords = (): any[] => {
		const ids = S.Record.getRecordIds(subId, '');
		return ids.map(id => S.Detail.get(subId, id, J.Relation.sidebar)).filter(it => it && !it._empty_);
	};

	const isCollection = (o: any): boolean => U.Object.isCollectionLayout(o.layout) || U.Object.isCollectionLayout(o.resolvedLayout);

	const isVisibleLayout = (o: any): boolean => {
		const layout = o.resolvedLayout || o.layout;
		if (U.Object.isInPageLayouts(layout)) {
			return true;
		};
		if (U.Object.isCollectionLayout(layout) || U.Object.isSetLayout(layout)) {
			return true;
		};
		if (U.Object.isInFileLayouts(layout)) {
			return true;
		};
		return false;
	};

	const getChildIds = (o: any): string[] => {
		const links = Relation.getArrayValue(o.links);
		return links.filter(id => id && (id != J.Constant.missingObjectId));
	};

	const buildTree = (): ExplorerNode[] => {
		const records = getRecords().filter(isVisibleLayout);
		const byId = new Map<string, any>(records.map(r => [ r.id, r ]));

		const childOf = new Set<string>();
		for (const r of records) {
			if (!isCollection(r)) {
				continue;
			};

			for (const cid of getChildIds(r)) {
				if (byId.has(cid)) {
					childOf.add(cid);
				};
			};
		};

		const filterIds = ((!!filterValue.current) && (!!searchIds.length)) ? new Set(searchIds) : null;
		const passesFilter = (id: string) => (!filterIds) || filterIds.has(id);

		const collections = records
			.filter(r => isCollection(r) && !childOf.has(r.id))
			.sort(byName);
		const orphans = records
			.filter(r => !isCollection(r) && !childOf.has(r.id))
			.sort(byName);

		branches.current = new Set();

		const out: ExplorerNode[] = [];

		const pushNode = (node: ExplorerNode, hasFilter: boolean) => {
			if (!hasFilter || passesFilter(node.id)) {
				out.push(node);
			};
		};

		const walk = (id: string, parentId: string, depth: number, branch: string) => {
			if (depth > MAX_DEPTH) {
				return;
			};

			const o = byId.get(id);
			if (!o) {
				return;
			};

			const childBranch = [ branch, id ].join('-');
			if (branches.current.has(childBranch)) {
				return;
			};
			branches.current.add(childBranch);

			const childIds = isCollection(o) ? getChildIds(o).filter(cid => byId.has(cid)) : [];
			const node: ExplorerNode = {
				id,
				parentId,
				depth,
				numChildren: childIds.length,
				branch: childBranch,
			};
			pushNode(node, !!filterIds);

			if (!childIds.length) {
				return;
			};

			const isOpen = Storage.checkToggle(SUB_KEY, getNodeKey(node));
			if (!isOpen) {
				return;
			};

			const children = childIds
				.map(cid => byId.get(cid))
				.filter(it => it && isVisibleLayout(it))
				.sort(byName);

			for (const child of children) {
				walk(child.id, id, depth + 1, childBranch);
			};
		};

		for (const c of collections) {
			walk(c.id, '', 1, '');
		};

		if (orphans.length) {
			out.push({
				id: 'section-files',
				parentId: '',
				depth: 0,
				numChildren: 0,
				branch: 'section-files',
				isSection: true,
			});

			for (const o of orphans) {
				walk(o.id, '', 1, 'orphan');
			};
		};

		return out;
	};

	const byName = (a: any, b: any): number => {
		const an = String(a.name || '').toLowerCase();
		const bn = String(b.name || '').toLowerCase();
		if (an < bn) return -1;
		if (an > bn) return 1;
		return 0;
	};

	const getNodeKey = (node: ExplorerNode): string => {
		return [ node.branch, node.depth ].join('-');
	};

	const getSubId = (): string => subId;
	const getSubKey = (): string => SUB_KEY;

	const onToggle = (e: MouseEvent, node: ExplorerNode): void => {
		e.preventDefault();
		e.stopPropagation();

		const key = getNodeKey(node);
		const isOpen = Storage.checkToggle(SUB_KEY, key);

		Storage.setToggle(SUB_KEY, key, !isOpen);
		analytics.event(!isOpen ? 'OpenSidebarObjectToggle' : 'CloseSidebarObjectToggle');

		forceUpdate();
	};

	const onClick = (e: MouseEvent, item: any): void => {
		if (U.Common.checkAuxButton(e)) {
			return;
		};

		e.preventDefault();
		e.stopPropagation();

		U.Object.openConfig(e, item);
		analytics.event('OpenSidebarObject');
	};

	const onScroll = ({ scrollTop }: { scrollTop: number }): void => {
		top.current = scrollTop;
	};

	const onFilterChange = (v: string): void => {
		window.clearTimeout(filterTimeout.current);
		filterTimeout.current = window.setTimeout(() => {
			if (filterValue.current == v) {
				return;
			};

			filterValue.current = v;

			if (!v) {
				setSearchIds([]);
				return;
			};

			U.Subscription.search({
				filters: [],
				sorts: [],
				fullText: v,
				keys: [ 'id' ],
			}, (message: any) => {
				setSearchIds((message.records || []).map(it => it.id));
			});
		}, J.Constant.delay.keyboard);
	};

	useEffect(() => {
		if (!space) {
			return;
		};

		U.Subscription.subscribe({
			spaceId: space,
			subId,
			keys: J.Relation.sidebar,
			filters: [
				{
					relationKey: 'resolvedLayout',
					condition: I.FilterCondition.In,
					value: [
						I.ObjectLayout.Page,
						I.ObjectLayout.Note,
						I.ObjectLayout.Task,
						I.ObjectLayout.Bookmark,
						I.ObjectLayout.Human,
						I.ObjectLayout.Collection,
						I.ObjectLayout.Set,
						I.ObjectLayout.File,
						I.ObjectLayout.Image,
						I.ObjectLayout.Audio,
						I.ObjectLayout.Video,
						I.ObjectLayout.Pdf,
					],
				},
			],
			sorts: [
				{ relationKey: 'name', type: I.SortType.Asc },
			],
			noDeps: true,
		}, () => forceUpdate());

		return () => {
			U.Subscription.destroyList([ subId ]);
		};
	}, [ space ]);

	useEffect(() => {
		listRef.current?.recomputeRowHeights(0);
		listRef.current?.scrollToPosition(top.current);
	});

	useImperativeHandle(ref, () => ({
		resize: () => listRef.current?.recomputeRowHeights(0),
	}));

	const nodes = buildTree();
	const length = nodes.length;

	const rowRenderer = ({ index, parent, style, key }) => {
		const node = nodes[index];
		const treeKey = getNodeKey(node);

		return (
			<CellMeasurer
				key={key}
				parent={parent}
				cache={cache.current}
				columnIndex={0}
				rowIndex={index}
				fixedWidth
			>
				<ExplorerItem
					{...node}
					treeKey={treeKey}
					index={index}
					style={style}
					onClick={onClick}
					onToggle={onToggle}
					getSubId={getSubId}
					getSubKey={getSubKey}
				/>
			</CellMeasurer>
		);
	};

	let body = null;
	if ((!length) && (!filterValue.current)) {
		body = (
			<div className="emptyWrap">
				<Label className="empty" text={translate('sidebarExplorerEmpty')} />
			</div>
		);
	} else
	if (!length) {
		body = (
			<div className="emptyWrap">
				<Label className="empty" text={translate('sidebarExplorerNoMatches')} />
			</div>
		);
	} else {
		body = (
			<AutoSizer className="scrollArea">
				{({ width, height }) => (
					<List
						ref={listRef}
						width={width}
						height={height}
						deferredMeasurmentCache={cache.current}
						rowCount={length}
						rowHeight={HEIGHT}
						rowRenderer={rowRenderer}
						overscanRowCount={20}
						onScroll={onScroll}
					/>
				)}
			</AutoSizer>
		);
	};

	return (
		<div ref={nodeRef} id={getId?.()} className="sidebarPageExplorer">
			<div className="head">
				<SpaceName />
				<Filter
					ref={filterRef}
					iconParam={{ name: 'common/search' }}
					placeholder={translate('commonSearch')}
					onChange={onFilterChange}
				/>
			</div>
			<div className="body">{body}</div>
		</div>
	);

});

export default SidebarPageExplorer;
