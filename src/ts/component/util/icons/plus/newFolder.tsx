import React from 'react';

// Outline folder shape with a "+" centered in the body — matches the stroke
// style of menu/action/folder.tsx (1.5px stroke, rounded joins) so the icon
// reads consistently next to other Anytype icons.
const NewFolder = (props: React.SVGProps<SVGSVGElement>) => (
	<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
		<path
			d="M16.6666 14.6667C16.6666 15.0203 16.5261 15.3594 16.2761 15.6095C16.026 15.8595 15.6869 16 15.3333 16H4.66659C4.31296 16 3.97382 15.8595 3.72378 15.6095C3.47373 15.3594 3.33325 15.0203 3.33325 14.6667V5.33333C3.33325 4.97971 3.47373 4.64057 3.72378 4.39052C3.97382 4.14048 4.31296 4 4.66659 4H7.46474C7.79909 4 8.11132 4.1671 8.29679 4.4453L9.03639 5.5547C9.22185 5.8329 9.53408 6 9.86844 6H15.3333C15.6869 6 16.026 6.14048 16.2761 6.39052C16.5261 6.64057 16.6666 6.97971 16.6666 7.33333V14.6667Z"
			stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
		/>
		<path d="M10 9.25V12.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
		<path d="M8.25 11H11.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
	</svg>
);

export default NewFolder;
