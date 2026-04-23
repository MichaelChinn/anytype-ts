import React, { forwardRef, useState } from 'react';
import { Icon, Label, Button } from 'Component';

const SidebarSupportBanner = forwardRef<{}, {}>(({}, ref) => {

	const [ isExpanded, setIsExpanded ] = useState(false);

	const product = S.Membership.data?.getTopProduct();
	const canShow = U.Data.isAnytypeNetwork() && (!product || product.isUpgradeable);
	if (!canShow) {
		return null;
	};

	const route = 'SidebarSupportBanner';

	const onExpand = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsExpanded(true);
		analytics.event('ClickSupportAnytypeBanner', { route });
	};

	const onCollapse = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsExpanded(false);
	};

	const onBuyPlan = () => {
		Action.membershipUpgrade({ type: 'SupportAnytype', route });
	};

	const onDonate = () => {
		Action.openUrl(J.Url.donate);
		analytics.event('ClickSupportAnytypeDonate', { route });
	};

	const onDetails = () => {
		S.Popup.open('supportAnytype', {});
		analytics.event('ClickSupportAnytypeDetails', { route });
	};

	const cn = [ 'supportBanner', (isExpanded ? 'isExpanded' : 'isCollapsed') ];

	if (!isExpanded) {
		return (
			<div className={cn.join(' ')} onClick={onExpand}>
				<Icon name="vault/heart" className="heart" />
				<Label text={translate('sidebarSupportBannerTitle')} />
			</div>
		);
	};

	return (
		<div className={cn.join(' ')}>
			<div className="head">
				<Icon name="vault/heart" className="heart" />
				<Label text={translate('sidebarSupportBannerTitle')} />
				<Icon name="banner/collapse" className="collapse" onClick={onCollapse} />
			</div>
			<div className="actions">
				<Button text={translate('sidebarSupportBannerBuyPlan')} color="accent" size={28} onClick={onBuyPlan} />
				<Button text={translate('sidebarSupportBannerDonate')} color="blank" size={28} onClick={onDonate} />
				<Button text={translate('sidebarSupportBannerViewDetails')} color="blank" size={28} onClick={onDetails} />
			</div>
		</div>
	);

});

export default SidebarSupportBanner;
