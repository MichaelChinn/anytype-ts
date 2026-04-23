import React from 'react';

const Heart = (props: React.SVGProps<SVGSVGElement>) => (
	<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
		<path fillRule="evenodd" clipRule="evenodd" d="M10 17.25l-1.087-.99C5.053 12.746 2.5 10.426 2.5 7.592 2.5 5.272 4.318 3.5 6.625 3.5c1.302 0 2.552.607 3.375 1.56.823-.953 2.073-1.56 3.375-1.56 2.307 0 4.125 1.772 4.125 4.092 0 2.834-2.553 5.154-6.413 8.668L10 17.25z" fill="currentColor" />
	</svg>
);

export default Heart;
