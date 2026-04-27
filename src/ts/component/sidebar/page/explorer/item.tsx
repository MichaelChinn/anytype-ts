import React, { forwardRef, useRef, MouseEvent } from 'react';
import { Icon, IconObject, ObjectName, Label } from 'Component';
import * as I from 'Interface';
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
};

const ExplorerItem = forwardRef<HTMLDivElement, ExplorerItemProps>((props, ref) => {

	const { id, depth, numChildren, isSection, treeKey, style, onClick, onToggle, getSubId, getSubKey } = props;
	const nodeRef = useRef<HTMLDivElement>(null);
	const subId = getSubId();
	const subKey = getSubKey();
	const isOpen = Storage.checkToggle(subKey, treeKey);
	const object = isSection ? null : S.Detail.get(subId, id, J.Relation.sidebar);
	const layout = object?.resolvedLayout ?? object?.layout;
	const isCollection = object && U.Object.isCollectionLayout(layout);
	const paddingLeft = (depth > 1) ? ((depth - 1) * 12) : 4;

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

	return (
		<div
			ref={nodeRef}
			id={treeKey}
			className={cn.join(' ')}
			style={style}
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
