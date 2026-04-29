import React from 'react';

// Filled folder silhouette with a "+" cut out via fill-rule="evenodd" — same
// solid-fill style as plus/menu.tsx and header/settings.tsx so the icon reads
// as a sibling next to those in the explorer header.
const NewFolder = (props: React.SVGProps<SVGSVGElement>) => (
	<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M2 5.75C2 4.7835 2.7835 4 3.75 4H7.25C7.64556 4 8.01646 4.18437 8.25622 4.49609L9.24378 5.75391C9.48354 6.06563 9.85444 6.25 10.25 6.25H16.25C17.2165 6.25 18 7.0335 18 8V14.25C18 15.2165 17.2165 16 16.25 16H3.75C2.7835 16 2 15.2165 2 14.25V5.75ZM14.5 11.75C14.9142 11.75 15.25 12.0858 15.25 12.5C15.25 12.9142 14.9142 13.25 14.5 13.25H13.25V14.5C13.25 14.9142 12.9142 15.25 12.5 15.25C12.0858 15.25 11.75 14.9142 11.75 14.5V13.25H10.5C10.0858 13.25 9.75 12.9142 9.75 12.5C9.75 12.0858 10.0858 11.75 10.5 11.75H11.75V10.5C11.75 10.0858 12.0858 9.75 12.5 9.75C12.9142 9.75 13.25 10.0858 13.25 10.5V11.75H14.5Z"
			fill="currentColor"
		/>
	</svg>
);

export default NewFolder;
