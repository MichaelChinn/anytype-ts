import React, { forwardRef, useState } from 'react';
import { Title, Label, Button } from 'Component';
import * as I from 'Interface';

const PageMainSettingsForkRoot = forwardRef<I.PageRef, I.PageSettingsComponent>((_props, _ref) => {

	const cfg = S.Common.config || {};
	const spaceview = U.Space.getSpaceview();
	const spaceId = spaceview?.targetSpaceId || '';
	const spaceName = spaceview?.name || translate('defaultNamePage');

	// Live read every render — auto-observer keeps us in sync with config IPC.
	const stored = (cfg.workspaces || {})[spaceId] || {};
	const currentRoot = stored.path || '';

	const [ applying, setApplying ] = useState<boolean>(false);
	const [ error, setError ] = useState<string>('');

	const apply = async (nextPath: string) => {
		if (!spaceId) {
			setError(translate('pageSettingsForkNoSpace'));
			return;
		};
		setApplying(true);
		setError('');
		const result: { ok: boolean; error?: string } = await Renderer.send('setSyncFsSpaceConfig', {
			spaceId,
			workspacePath: nextPath,
		});
		setApplying(false);
		if (!result?.ok) {
			setError(U.String.sprintf(translate('pageSettingsForkApplyError'), result?.error || 'unknown'));
		};
	};

	const onPick = () => {
		Action.openDirectoryDialog({
			defaultPath: currentRoot || undefined,
		}, (paths: string[]) => {
			if (paths && paths.length) {
				apply(paths[0]);
			};
		});
	};

	const onClear = () => {
		apply('');
	};

	if (!spaceId) {
		return (
			<>
				<Title text={translate('pageSettingsForkRootTitle')} />
				<Label text={translate('pageSettingsForkNoSpace')} />
			</>
		);
	};

	return (
		<>
			<Title text={translate('pageSettingsForkRootTitle')} />
			<Label text={translate('pageSettingsForkRootDescription')} />
			<Label className="forkSpaceContext" text={U.String.sprintf(translate('pageSettingsForkSpaceContext'), spaceName)} />

			<div className="forkSettingsBlock">
				<Label className="rowLabel" text={translate('pageSettingsForkRootCurrent')} />
				<div className="rowControls">
					<div className="pathDisplay">
						{currentRoot || translate('pageSettingsForkRootEmpty')}
					</div>
					<div className="rowButtons">
						<Button
							color="blank"
							size={28}
							className={applying ? 'disabled' : ''}
							text={applying ? translate('pageSettingsForkApplying') : translate('pageSettingsForkRootChange')}
							onClick={() => { if (!applying) onPick(); }}
						/>
						{currentRoot ? (
							<Button
								color="blank"
								size={28}
								className={applying ? 'disabled' : ''}
								text={translate('pageSettingsForkRootClear')}
								onClick={() => { if (!applying) onClear(); }}
							/>
						) : ''}
					</div>
				</div>
				{error ? <div className="forkError">{error}</div> : ''}
			</div>
		</>
	);

});

export default PageMainSettingsForkRoot;
