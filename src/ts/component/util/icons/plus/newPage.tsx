import React from 'react';

// Outline document with a folded top-right corner and a "+" centered in the
// body — same stroke language (1.5px, rounded joins) as the rest of the
// stroke-style menu icons so it reads as a sibling to NewFolder above.
const NewPage = (props: React.SVGProps<SVGSVGElement>) => (
	<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
		<path
			d="M5.33325 3.33333H11.3333L15.3333 7.33333V15.3333C15.3333 15.687 15.1928 16.0261 14.9428 16.2761C14.6927 16.5262 14.3536 16.6667 13.9999 16.6667H5.33325C4.97963 16.6667 4.64049 16.5262 4.39044 16.2761C4.1404 16.0261 3.99992 15.687 3.99992 15.3333V4.66667C3.99992 4.31304 4.1404 3.97391 4.39044 3.72386C4.64049 3.47381 4.97963 3.33333 5.33325 3.33333Z"
			stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
		/>
		<path d="M11.3333 3.33333V7.33333H15.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
		<path d="M9.66659 10.5V13.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
		<path d="M7.99992 12.1667H11.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
	</svg>
);

export default NewPage;
