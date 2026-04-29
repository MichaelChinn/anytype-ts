import React, { forwardRef, useState } from 'react';
import { Title, Label, Button, Icon } from 'Component';
import * as I from 'Interface';

const PageMainSettingsForkExclude = forwardRef<I.PageRef, I.PageSettingsComponent>((_props, _ref) => {

	const cfg = S.Common.config || {};
	const spaceview = U.Space.getSpaceview();
	const spaceId = spaceview?.targetSpaceId || '';
	const spaceName = spaceview?.name || translate('defaultNamePage');

	const stored = (cfg.workspaces || {})[spaceId] || {};
	const workspacePath = stored.path || '';
	// Live read every render — auto-observer keeps this in sync with config IPC.
	const excludes: string[] = stored.excludes || [];

	const [ error, setError ] = useState<string>('');
	const [ applying, setApplying ] = useState<boolean>(false);

	const isUnderRoot = (candidate: string): boolean => {
		if (!workspacePath || !candidate) return false;
		const a = U.Common.isPlatformWindows() ? candidate.toLowerCase() : candidate;
		const b = U.Common.isPlatformWindows() ? workspacePath.toLowerCase() : workspacePath;
		if (a === b) return false; // can't exclude root itself
		return a.startsWith(b + '\\') || a.startsWith(b + '/');
	};

	const apply = async (next: string[]) => {
		if (!spaceId) {
			setError(translate('pageSettingsForkNoSpace'));
			return;
		};
		setApplying(true);
		setError('');
		const result: { ok: boolean; error?: string } = await Renderer.send('setSyncFsSpaceConfig', {
			spaceId,
			workspaceExcludes: next,
		});
		setApplying(false);
		if (!result?.ok) {
			setError(U.String.sprintf(translate('pageSettingsForkApplyError'), result?.error || 'unknown'));
		};
	};

	const onAdd = () => {
		setError('');
		Action.openDirectoryDialog({
			defaultPath: workspacePath || undefined,
		}, (paths: string[]) => {
			if (!paths || !paths.length) return;
			const picked = paths[0];

			if (!isUnderRoot(picked)) {
				setError(translate('pageSettingsForkExcludeNotUnderRoot'));
				return;
			};

			if (excludes.includes(picked)) {
				return;
			};

			apply([ ...excludes, picked ]);
		});
	};

	const onRemove = (target: string) => {
		setError('');
		apply(excludes.filter(p => p !== target));
	};

	if (!spaceId) {
		return (
			<>
				<Title text={translate('pageSettingsForkExcludeTitle')} />
				<Label text={translate('pageSettingsForkNoSpace')} />
			</>
		);
	};

	if (!workspacePath) {
		return (
			<>
				<Title text={translate('pageSettingsForkExcludeTitle')} />
				<Label className="forkSpaceContext" text={U.String.sprintf(translate('pageSettingsForkSpaceContext'), spaceName)} />
				<Label text={translate('pageSettingsForkExcludeNoRoot')} />
			</>
		);
	};

	return (
		<>
			<Title text={translate('pageSettingsForkExcludeTitle')} />
			<Label text={translate('pageSettingsForkExcludeDescription')} />
			<Label className="forkSpaceContext" text={U.String.sprintf(translate('pageSettingsForkSpaceContext'), spaceName)} />

			<div className="forkSettingsActions">
				<Button
					color="black"
					size={28}
					className={applying ? 'disabled' : ''}
					text={translate('pageSettingsForkExcludeAdd')}
					onClick={() => { if (!applying) onAdd(); }}
				/>
				{error ? <div className="forkError">{error}</div> : ''}
			</div>

			{excludes.length ? (
				<div className="forkExcludeList">
					{excludes.map((p) => (
						<div className="row" key={p}>
							<div className="path">{p}</div>
							<Icon className="remove" name="common/bin" onClick={() => onRemove(p)} />
						</div>
					))}
				</div>
			) : (
				<div className="forkExcludeEmpty">{translate('pageSettingsForkExcludeEmpty')}</div>
			)}
		</>
	);

});

export default PageMainSettingsForkExclude;
