import React, { forwardRef, useRef, useState, useEffect, MouseEvent, DragEvent, KeyboardEvent } from 'react';
import { Icon, IconObject, ObjectName, Label } from 'Component';
import Storage from 'Lib/storage';

interface ExplorerItemProps {
	id: string;
	parentId: string;
	depth: number;
	numChildren: number;
	branch: string;
	isSection?: boolean;
	isSelected?: boolean;
	isRenaming?: boolean;
	treeKey: string;
	index: number;
	style?: any;
	onClick(e: MouseEvent, object: any): void;
	onDoubleClick?(e: MouseEvent, object: any): void;
	onToggle(e: MouseEvent, props: ExplorerItemProps): void;
	getSubId(): string;
	getSubKey(): string;
	onItemDragStart?(e: DragEvent, props: ExplorerItemProps, object: any): void;
	onItemDragOver?(e: DragEvent, props: ExplorerItemProps, object: any): void;
	onItemDragLeave?(e: DragEvent): void;
	onItemDrop?(e: DragEvent, props: ExplorerItemProps, object: any): void;
	onItemContextMenu?(e: MouseEvent, props: ExplorerItemProps, object: any): void;
	onCommitRename?(id: string, newName: string): void;
	onCancelRename?(): void;
};

const ExplorerItem = forwardRef<HTMLDivElement, ExplorerItemProps>((props, ref) => {

	const {
		id, depth, numChildren, isSection, isSelected, isRenaming, treeKey, style,
		onClick, onDoubleClick, onToggle, getSubId, getSubKey,
		onItemDragStart, onItemDragOver, onItemDragLeave, onItemDrop, onItemContextMenu,
		onCommitRename, onCancelRename,
	} = props;
	const nodeRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const cancelledRef = useRef(false);
	const subId = getSubId();
	const subKey = getSubKey();
	const isOpen = Storage.checkToggle(subKey, treeKey);
	const object = isSection ? null : S.Detail.get(subId, id, J.Relation.sidebar);
	const layout = object?.resolvedLayout ?? object?.layout;
	const isCollection = object && U.Object.isCollectionLayout(layout);
	const paddingLeft = (depth > 1) ? ((depth - 1) * 12) : 4;
	const canDrag = !!object && !!onItemDragStart && U.Space.canMyParticipantWrite();
	const [ renameValue, setRenameValue ] = useState<string>('');

	useEffect(() => {
		if (isRenaming) {
			cancelledRef.current = false;
			setRenameValue(String(object?.name || ''));
			// Defer focus by a tick so the input is in the DOM.
			window.setTimeout(() => {
				inputRef.current?.focus();
				inputRef.current?.select();
			}, 0);
		};
	}, [ isRenaming ]);

	const cn = [ 'item', `depth${depth}` ];
	if (isOpen) {
		cn.push('isOpen');
	};
	if (isSection) {
		cn.push('isSection');
	};
	if (object && (object.isHidden || object.isReadonly)) {
		cn.push('isMuted');
	};
	if (isSelected) {
		cn.push('isSelected');
	};
	if (isRenaming) {
		cn.push('isRenaming');
	};

	const onToggleHandler = (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onToggle(e, props);
	};

	if (isSection) {
		return (
			<div
				ref={nodeRef}
				id={treeKey}
				className={cn.join(' ')}
				style={style}
			>
				<div className="inner">
					<Label text={translate('sidebarExplorerSectionFiles')} />
				</div>
			</div>
		);
	};

	let arrow = null;
	if (isCollection && (numChildren > 0)) {
		arrow = (
			<div className="arrowWrap" onMouseDown={onToggleHandler}>
				<Icon name="arrow/select" className="arrow" />
			</div>
		);
	} else
	if (isCollection) {
		arrow = (
			<div className="arrowWrap">
				<Icon name="widget/blank" className="blank" />
			</div>
		);
	} else {
		arrow = (
			<div className="arrowWrap">
				<Icon name="widget/blank" className="blank" />
			</div>
		);
	};

	const onDragStart = (e: DragEvent) => {
		onItemDragStart?.(e, props, object);
	};
	const onDragOver = (e: DragEvent) => {
		onItemDragOver?.(e, props, object);
	};
	const onDragLeave = (e: DragEvent) => {
		onItemDragLeave?.(e);
	};
	const onDrop = (e: DragEvent) => {
		onItemDrop?.(e, props, object);
	};
	const onContextMenu = (e: MouseEvent) => {
		onItemContextMenu?.(e, props, object);
	};

	const onClickWrap = (e: MouseEvent) => {
		onClick(e, object);
	};
	const onDoubleClickWrap = (e: MouseEvent) => {
		onDoubleClick?.(e, object);
	};

	const onRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		e.stopPropagation();
		if (e.key === 'Enter') {
			e.preventDefault();
			onCommitRename?.(id, renameValue);
		} else
		if (e.key === 'Escape') {
			e.preventDefault();
			cancelledRef.current = true;
			onCancelRename?.();
		};
	};

	const onRenameBlur = () => {
		// Escape sets cancelledRef and calls onCancelRename, which un-mounts
		// this input — the synthetic blur fires after that and would otherwise
		// commit the un-edited value over what the user just discarded.
		if (cancelledRef.current) {
			return;
		};
		onCommitRename?.(id, renameValue);
	};

	const renderName = () => {
		if (isRenaming) {
			return (
				<input
					ref={inputRef}
					className="renameInput"
					type="text"
					value={renameValue}
					onChange={e => setRenameValue(e.target.value)}
					onKeyDown={onRenameKeyDown}
					onBlur={onRenameBlur}
					onClick={e => e.stopPropagation()}
					onDoubleClick={e => e.stopPropagation()}
				/>
			);
		};
		return <ObjectName object={object} withPlural={true} />;
	};

	return (
		<div
			ref={nodeRef}
			id={treeKey}
			className={cn.join(' ')}
			style={style}
			draggable={canDrag && !isRenaming}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			onContextMenu={onContextMenu}
		>
			<div className="inner" style={{ paddingLeft }}>
				<div
					className="clickable"
					onMouseDown={onClickWrap}
					onDoubleClick={onDoubleClickWrap}
				>
					{arrow}
					<IconObject
						id={`explorer-icon-${treeKey}`}
						object={object}
						size={20}
						iconSize={20}
					/>
					{renderName()}
				</div>
			</div>
		</div>
	);

});

export default ExplorerItem;
