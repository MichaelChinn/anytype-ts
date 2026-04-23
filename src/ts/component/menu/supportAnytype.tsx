import React, { forwardRef } from 'react';
import { Icon, Label } from 'Component';
import * as I from 'Interface';

const MenuSupportAnytype = forwardRef<I.MenuRef, I.Menu>((props, ref) => {

	const { close } = props;
	const route = 'MenuSupportAnytype';

	const onBuyPlan = () => {
		close(() => Action.membershipUpgrade({ type: 'SupportAnytype', route }));
	};

	const onDonate = () => {
		Action.openUrl(J.Url.donate);
		analytics.event('ClickSupportAnytypeDonate', { route });
		close();
	};

	const onLearnMore = () => {
		S.Popup.open('supportAnytype', {});
		analytics.event('ClickSupportAnytypeLearnMore', { route });
		close();
	};

	return (
		<>
			<div className="head">
				<Icon className="heart" />
				<div className="text">
					<Label className="tag" text={translate('sidebarSupportBannerImportant')} />
					<Label text={translate('sidebarSupportBannerTitle')} />
				</div>
			</div>

			<Label className="description" text={translate('sidebarSupportBannerDescription')} />

			<div className="items">
				<div className="item" onClick={onBuyPlan}>
					<Icon className="card" />
					<Label text={translate('sidebarSupportBannerBuyPlan')} />
				</div>
				<div className="item" onClick={onDonate}>
					<Icon className="heart small" />
					<Label text={translate('sidebarSupportBannerDonate')} />
				</div>
			</div>

			<div className="separator">
				<div className="inner" />
			</div>

			<div className="items">
				<div className="item" onClick={onLearnMore}>
					<Icon className="info" />
					<Label text={translate('sidebarSupportBannerLearnMore')} />
				</div>
			</div>
		</>
	);

});

export default MenuSupportAnytype;
