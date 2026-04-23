import React, { forwardRef } from 'react';
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
			<div className="hero">
				<div className="heroText">
					<div className="line left">{translate('popupSupportAnytypeHeroLine1')}</div>
					<div className="line right">{translate('popupSupportAnytypeHeroLine2')}</div>
					<div className="line left">{translate('popupSupportAnytypeHeroLine3')}</div>
				</div>
			</div>

			<div className="body">
				<div className="group intro">
					<p className="paragraph">{translate('popupSupportAnytypeIntro')}</p>
					<p className="section">{translate('popupSupportAnytypeWhyTitle')}</p>
					<p className="paragraph">{translate('popupSupportAnytypeWhyText')}</p>
					<p className="section">{translate('popupSupportAnytypeNeedTitle')}</p>
					<p className="paragraph">{translate('popupSupportAnytypeNeedText')}</p>
				</div>

				<div className="buttons">
					<div className="cta" onClick={onBuyPlan}>
						<div className="ctaIcon card" />
						<div className="ctaLabel">{translate('popupSupportAnytypeBuyPlan')}</div>
					</div>
					<div className="cta" onClick={onDonate}>
						<div className="ctaIcon heart" />
						<div className="ctaLabel">{translate('popupSupportAnytypeDonate')}</div>
					</div>
				</div>

				<div className="group outro">
					<p className="paragraph">{translate('popupSupportAnytypeClosing')}</p>
					<p className="paragraph">{translate('popupSupportAnytypeThanks')}</p>
					<p className="paragraph">{translate('popupSupportAnytypeSignoff')}</p>
					<p className="paragraph">{translate('popupSupportAnytypeSignature')}</p>
				</div>
			</div>
		</>
	);

});

export default PopupSupportAnytype;
