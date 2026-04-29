import React from 'react';

// Filled document silhouette with a folded top-right corner and a "+" cut out
// via fill-rule="evenodd" — matches the solid-fill style of plus/menu.tsx and
// header/settings.tsx so the icon reads as a sibling in the header bar.
const NewPage = (props: React.SVGProps<SVGSVGElement>) => (
	<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M5 3.75C5 2.7835 5.7835 2 6.75 2H11.25C11.4489 2 11.6397 2.07902 11.7803 2.21967L15.7803 6.21967C15.921 6.36032 16 6.55109 16 6.75V16.25C16 17.2165 15.2165 18 14.25 18H6.75C5.7835 18 5 17.2165 5 16.25V3.75ZM11.75 13.25H13C13.4142 13.25 13.75 12.9142 13.75 12.5C13.75 12.0858 13.4142 11.75 13 11.75H11.75V10.5C11.75 10.0858 11.4142 9.75 11 9.75C10.5858 9.75 10.25 10.0858 10.25 10.5V11.75H9C8.58579 11.75 8.25 12.0858 8.25 12.5C8.25 12.9142 8.58579 13.25 9 13.25H10.25V14.5C10.25 14.9142 10.5858 15.25 11 15.25C11.4142 15.25 11.75 14.9142 11.75 14.5V13.25Z"
			fill="currentColor"
		/>
	</svg>
);

export default NewPage;
