import React, { forwardRef } from 'react';
import { Title, Icon, Label, Button } from 'Component';
import * as I from 'Interface';

const PopupSupportAnytype = forwardRef<{}, I.Popup>(({ close }, ref) => {

	const route = 'PopupSupportAnytype';

	const onBuyPlan = () => {
		close(() => Action.membershipUpgrade({ type: 'SupportAnytype', route }));
	};

	const onDonate = () => {
		Action.openUrl(J.Url.donate);
		analytics.event('ClickSupportAnytypeDonate', { route });
		close();
	};

	return (
		<>
			<div className="iconWrapper">
				<Icon name="vault/heart" className="heart" />
			</div>
			<Title text={translate('popupSupportAnytypeTitle')} />
			<Label text={translate('popupSupportAnytypeText')} />

			<div className="buttons">
				<Button text={translate('popupSupportAnytypeBuyPlan')} color="black" size={36} onClick={onBuyPlan} />
				<Button text={translate('popupSupportAnytypeDonate')} color="blank" size={36} onClick={onDonate} />
			</div>
		</>
	);

});

export default PopupSupportAnytype;
