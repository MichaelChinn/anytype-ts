import React, { forwardRef, useRef, MouseEvent, DragEvent } from 'react';
import { Icon, IconObject, ObjectName, Label } from 'Component';
import Storage from 'Lib/storage';

interface ExplorerItemProps {
	id: string;
	parentId: string;
	depth: number;
	numChildren: number;
	branch: string;
	isSection?: boolean;
	treeKey: string;
	index: number;
	style?: any;
	onClick(e: MouseEvent, object: any): void;
	onToggle(e: MouseEvent, props: ExplorerItemProps): void;
	getSubId(): string;
	getSubKey(): string;
	onItemDragStart?(e: DragEvent, props: ExplorerItemProps, object: any): void;
	onItemDragOver?(e: DragEvent, props: ExplorerItemProps, object: any): void;
	onItemDragLeave?(e: DragEvent): void;
	onItemDrop?(e: DragEvent, props: ExplorerItemProps, object: any): void;
	onItemContextMenu?(e: MouseEvent, props: ExplorerItemProps, object: any): void;
};

const ExplorerItem = forwardRef<HTMLDivElement, ExplorerItemProps>((props, ref) => {

	const {
		id, depth, numChildren, isSection, treeKey, style,
		onClick, onToggle, getSubId, getSubKey,
		onItemDragStart, onItemDragOver, onItemDragLeave, onItemDrop, onItemContextMenu,
	} = props;
	const nodeRef = useRef<HTMLDivElement>(null);
	const subId = getSubId();
	const subKey = getSubKey();
	const isOpen = Storage.checkToggle(subKey, treeKey);
	const object = isSection ? null : S.Detail.get(subId, id, J.Relation.sidebar);
	const layout = object?.resolvedLayout ?? object?.layout;
	const isCollection = object && U.Object.isCollectionLayout(layout);
	const paddingLeft = (depth > 1) ? ((depth - 1) * 12) : 4;
	const canDrag = !!object && !!onItemDragStart && U.Space.canMyParticipantWrite();

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

	return (
		<div
			ref={nodeRef}
			id={treeKey}
			className={cn.join(' ')}
			style={style}
			draggable={canDrag}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			onContextMenu={onContextMenu}
		>
			<div className="inner" style={{ paddingLeft }}>
				<div className="clickable" onMouseDown={e => onClick(e, object)}>
					{arrow}
					<IconObject
						id={`explorer-icon-${treeKey}`}
						object={object}
						size={20}
						iconSize={20}
					/>
					<ObjectName object={object} withPlural={true} />
				</div>
			</div>
		</div>
	);

});

export default ExplorerItem;
