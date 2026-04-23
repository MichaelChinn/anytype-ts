import React, { forwardRef, useRef } from 'react';
import { Icon, Label } from 'Component';
import * as I from 'Interface';

const SidebarSupportBanner = forwardRef<{}, {}>(({}, ref) => {

	const { vaultIsMinimal } = S.Common;
	const nodeRef = useRef<HTMLDivElement>(null);
	const route = 'SidebarSupportBanner';
	const cn = [ 'supportBanner' ];

	const onClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		analytics.event('ClickSupportAnytypeBanner', { route });

		S.Menu.open('supportAnytype', {
			element: vaultIsMinimal ? U.Dom.select('#sidebarPageVault .bottom') : nodeRef.current,
			vertical: I.MenuDirection.Top,
			horizontal: I.MenuDirection.Center,
			offsetY: -4,
			classNameWrap: 'fromSidebar',
		});
	};

	if (vaultIsMinimal) {
		cn.push('isMinimal');
	};

	return (
		<div ref={nodeRef} className={cn.join(' ')} onClick={onClick}>
			<Icon className="heart" />
			{!vaultIsMinimal ? (
				<div className="text">
					<Label className="tag" text={translate('sidebarSupportBannerImportant')} />
					<Label text={translate('sidebarSupportBannerTitle')} />
				</div>
			) : ''}
		</div>
	);

});

export default SidebarSupportBanner;
