import React, { forwardRef, useImperativeHandle, useEffect, useRef, useState, MouseEvent, DragEvent } from 'react';
import { AutoSizer, CellMeasurer, CellMeasurerCache, List } from 'react-virtualized';
import { Filter, Icon, Label, SpaceName } from 'Component';
import * as I from 'Interface';
import Storage from 'Lib/storage';
import ExplorerItem from './explorer/item';

const HEIGHT_ITEM = 28;
const HEIGHT_SECTION = 44;
const HEIGHT_SECTION_FIRST = 28;
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
	const cache = useRef(new CellMeasurerCache({ fixedHeight: true, defaultHeight: HEIGHT_ITEM }));
	const [ searchIds, setSearchIds ] = useState<string[]>([]);
	const [ , setDummy ] = useState(0);
	const forceUpdate = () => setDummy(v => v + 1);

	const getRecords = (): any[] => {
		const ids = S.Record.getRecordIds(subId, '');
		return ids
			.map(id => S.Detail.get(subId, id, [ ...J.Relation.sidebar, 'targetObjectType' ]))
			.filter(it => it && !it._empty_)
			// Anytype-fork: hide templates from the working-dir view. Sync-fs
			// writes them under `.anytype/templates/` which the explorer treats
			// as a hidden dir, so showing them inline would be inconsistent.
			// Templates are identified by `targetObjectType` being set (the
			// type they're a template of); regular pages leave it empty.
			.filter(it => !it.targetObjectType);
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

	// --- Drag-drop -----------------------------------------------------------
	// HTML5 native drag (mirrors widget.tsx pattern). Drop targets are
	// collection items and the workspace root. Drop on a collection ->
	// ObjectCollectionAdd + ObjectCollectionRemove from old parent. Drop on
	// root area -> ObjectCollectionRemove only (move to top-level).

	const isDraggingRef = useRef(false);
	const draggedIdRef = useRef<string>('');
	const draggedParentIdRef = useRef<string>('');

	// wouldCycle returns true if dropping draggedId into targetId would create
	// a cycle (target is dragged itself or a descendant of dragged).
	const wouldCycle = (draggedId: string, targetId: string): boolean => {
		if (!draggedId || !targetId) {
			return false;
		};
		if (draggedId == targetId) {
			return true;
		};

		const records = getRecords();
		const byId = new Map<string, any>(records.map(r => [ r.id, r ]));
		const dragged = byId.get(draggedId);
		if (!dragged || !isCollection(dragged)) {
			return false;
		};

		const seen = new Set<string>();
		const queue: string[] = getChildIds(dragged);
		while (queue.length) {
			const id = queue.shift();
			if (id == targetId) {
				return true;
			};
			if (seen.has(id)) {
				continue;
			};
			seen.add(id);

			const o = byId.get(id);
			if (o && isCollection(o)) {
				queue.push(...getChildIds(o));
			};
		};
		return false;
	};

	const clearDropHighlight = () => {
		const body = nodeRef.current;
		if (!body) {
			return;
		};
		U.Dom.selectAll('.item.isDropTarget', body).forEach(el => U.Dom.removeClass(el, 'isDropTarget'));
	};

	const onItemDragStart = (e: DragEvent, node: ExplorerNode, object: any): void => {
		if (!U.Space.canMyParticipantWrite() || !object) {
			return;
		};

		isDraggingRef.current = true;
		draggedIdRef.current = node.id;
		draggedParentIdRef.current = node.parentId || '';

		try {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', JSON.stringify({ id: node.id, parentId: node.parentId || '' }));
		} catch (err) { /* noop */ };

		U.Dom.addClass(document.body, 'isDragging');
		keyboard.disableCommonDrop(true);
		keyboard.setDragging(true);
	};

	const onItemDragOver = (e: DragEvent, node: ExplorerNode, object: any): void => {
		if (!isDraggingRef.current || !object) {
			return;
		};
		if (!isCollection(object)) {
			return;
		};
		if (wouldCycle(draggedIdRef.current, node.id)) {
			return;
		};

		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';

		const target = e.currentTarget as HTMLElement;
		U.Dom.addClass(target, 'isDropTarget');
	};

	const onItemDragLeave = (e: DragEvent): void => {
		const target = e.currentTarget as HTMLElement;
		U.Dom.removeClass(target, 'isDropTarget');
	};

	const onItemDrop = (e: DragEvent, node: ExplorerNode, object: any): void => {
		if (!isDraggingRef.current) {
			return;
		};
		e.preventDefault();
		e.stopPropagation();

		const draggedId = draggedIdRef.current;
		const draggedParentId = draggedParentIdRef.current;

		clearDropHighlight();

		if (!object || !isCollection(object)) {
			finishDrag();
			return;
		};
		if (wouldCycle(draggedId, node.id)) {
			finishDrag();
			return;
		};
		if (draggedParentId == node.id) {
			// Already a child of this collection — no-op.
			finishDrag();
			return;
		};

		applyMove(draggedId, draggedParentId, node.id);
		finishDrag();
	};

	const onRootDragOver = (e: DragEvent): void => {
		if (!isDraggingRef.current) {
			return;
		};
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
	};

	const onRootDrop = (e: DragEvent): void => {
		if (!isDraggingRef.current) {
			return;
		};

		const draggedId = draggedIdRef.current;
		const draggedParentId = draggedParentIdRef.current;

		clearDropHighlight();

		if (!draggedParentId) {
			// Already at top level.
			finishDrag();
			return;
		};

		applyMove(draggedId, draggedParentId, '');
		finishDrag();
	};

	const applyMove = (draggedId: string, fromParentId: string, toParentId: string): void => {
		if (!draggedId || (fromParentId == toParentId)) {
			return;
		};

		const removeFromOld = (cb: () => void) => {
			if (!fromParentId) {
				cb();
				return;
			};
			C.ObjectCollectionRemove(fromParentId, [ draggedId ], () => cb());
		};
		const addToNew = () => {
			if (!toParentId) {
				return;
			};
			C.ObjectCollectionAdd(toParentId, [ draggedId ]);
		};

		removeFromOld(() => {
			addToNew();
			analytics.event('SidebarExplorerMove');
		});
	};

	const finishDrag = () => {
		isDraggingRef.current = false;
		draggedIdRef.current = '';
		draggedParentIdRef.current = '';
		U.Dom.removeClass(document.body, 'isDragging');
		keyboard.disableCommonDrop(false);
		keyboard.setDragging(false);
	};

	// --- Create new page / folder --------------------------------------------
	// Both call C.ObjectCreate with the appropriate uniqueKey. Heart emits an
	// event after creation -> sync-fs writes the file or directory under the
	// workspace root (via writePageObject / writeCollectionObject in pipeline.go).
	// New pages open in the editor; new folders just appear in the explorer.

	const createObject = (typeKey: string, openAfter: boolean, route: string): void => {
		if (!space) {
			return;
		};
		if (!U.Space.canMyParticipantWrite()) {
			return;
		};

		C.ObjectCreate({}, [], '', typeKey, space, (message: any) => {
			if (message.error?.code) {
				return;
			};

			const object = message.details;
			analytics.createObject(object?.type, object?.layout, route, message.middleTime);

			if (openAfter && object) {
				U.Object.openConfig(null, object);
			};
		});
	};

	const onNewPage = (e: MouseEvent): void => {
		e.preventDefault();
		e.stopPropagation();
		createObject('ot-page', true, 'SidebarExplorerNewPage');
	};

	const onNewFolder = (e: MouseEvent): void => {
		e.preventDefault();
		e.stopPropagation();
		createObject('ot-collection', false, 'SidebarExplorerNewFolder');
	};

	// --- Context menu --------------------------------------------------------

	const onItemContextMenu = (e: MouseEvent, node: ExplorerNode, object: any): void => {
		if (!object) {
			return;
		};
		e.preventDefault();
		e.stopPropagation();

		const canWrite = U.Space.canMyParticipantWrite();
		const hasParent = !!node.parentId;
		const isCollObj = isCollection(object);

		const options: any[] = [
			{ id: 'open', name: translate('sidebarExplorerOpen') },
			{ id: 'openWindow', name: translate('sidebarExplorerOpenInNewWindow') },
		];
		if (hasParent && canWrite) {
			options.push({ isDiv: true });
			options.push({ id: 'removeFromCollection', name: translate('sidebarExplorerRemoveFromCollection') });
		};
		if (canWrite && !object.isArchived) {
			if (!hasParent || !options.some(o => o.id == 'removeFromCollection')) {
				options.push({ isDiv: true });
			};
			options.push({ id: 'moveToBin', name: translate('commonMoveToBin'), color: 'red' });
		};
		// Suppress unused "isCollObj" warning when the menu doesn't differ for
		// collections vs pages today; reserved for future per-type entries.
		void isCollObj;

		S.Menu.open('select', {
			classNameWrap: 'fromSidebar',
			className: 'fixed',
			recalcRect: () => ({ x: e.pageX, y: e.pageY, width: 0, height: 0 }),
			data: {
				options,
				onSelect: (_e: any, item: any) => {
					switch (item.id) {
						case 'open': {
							U.Object.openConfig(_e, object);
							break;
						};
						case 'openWindow': {
							U.Object.openWindow(object);
							break;
						};
						case 'removeFromCollection': {
							if (node.parentId) {
								C.ObjectCollectionRemove(node.parentId, [ node.id ]);
								analytics.event('SidebarExplorerRemoveFromCollection');
							};
							break;
						};
						case 'moveToBin': {
							C.ObjectListSetIsArchived([ node.id ], true);
							analytics.event('SidebarExplorerMoveToBin');
							break;
						};
					};
				},
			},
		});
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
			keys: [ ...J.Relation.sidebar, 'targetObjectType' ],
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
				{
					relationKey: 'targetObjectType',
					condition: I.FilterCondition.Empty,
					value: '',
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
					onItemDragStart={onItemDragStart}
					onItemDragOver={onItemDragOver}
					onItemDragLeave={onItemDragLeave}
					onItemDrop={onItemDrop}
					onItemContextMenu={onItemContextMenu}
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
						rowHeight={({ index }) => {
							const node = nodes[index];
							if (!node?.isSection) {
								return HEIGHT_ITEM;
							};
							return (index === 0) ? HEIGHT_SECTION_FIRST : HEIGHT_SECTION;
						}}
						rowRenderer={rowRenderer}
						overscanRowCount={20}
						onScroll={onScroll}
					/>
				)}
			</AutoSizer>
		);
	};

	return (
		<>
			<div id="head" className="head isDefault">
				<div className="side left">
					<Icon
						id="button-explorer-panel-toggle"
						name="widget/vaultToggle"
						className="vaultToggle"
						withBackground={true}
						onClick={() => sidebar.leftPanelToggle(true, true)}
						tooltipParam={{ text: translate('commonToggleSidebar'), typeY: I.MenuDirection.Bottom }}
					/>
				</div>
				<div className="side right">
					<Icon
						id="button-explorer-new-folder"
						name="plus/newFolder"
						className="plus newFolder"
						withBackground={true}
						onClick={onNewFolder}
						tooltipParam={{ text: translate('sidebarExplorerNewFolder'), typeY: I.MenuDirection.Bottom }}
					/>
					<Icon
						id="button-explorer-new-page"
						name="plus/newPage"
						className="plus newPage"
						withBackground={true}
						onClick={onNewPage}
						tooltipParam={{ text: translate('sidebarExplorerNewPage'), typeY: I.MenuDirection.Bottom }}
					/>
				</div>
			</div>

			<div
				id="body"
				ref={nodeRef}
				className="body"
				onDragOver={onRootDragOver}
				onDrop={onRootDrop}
			>
				<SpaceName />
				<Filter
					ref={filterRef}
					iconParam={{ name: 'common/search' }}
					placeholder={translate('commonSearch')}
					onChange={onFilterChange}
				/>
				<div className="explorerList">{body}</div>
			</div>
		</>
	);

});

export default SidebarPageExplorer;
