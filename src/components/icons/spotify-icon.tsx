import type { SVGProps } from 'react';

export function SpotifyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 11.973c2.5-1.473 5-1.473 7.5 0" />
      <path d="M9 15.019c2-1.019 4-1.019 6 0" />
      <path d="M7 9.027c3-2.027 6-2.027 9 0" />
    </svg>
  );
}
