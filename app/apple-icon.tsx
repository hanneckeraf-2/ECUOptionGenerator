import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg
        width={180}
        height={180}
        viewBox="0 0 128 128"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0f1a2b" />
            <stop offset="1" stopColor="#060a12" />
          </linearGradient>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7dd3fc" />
            <stop offset="0.5" stopColor="#0070f3" />
            <stop offset="1" stopColor="#0b3a75" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="128" height="128" rx="28" fill="url(#bg)" />

        <path d="M44,32 L20,64 L44,96" fill="none" stroke="#0070f3" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M84,32 L108,64 L84,96" fill="none" stroke="#0070f3" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />

        <rect x="60" y="8" width="2.5" height="12" rx="1" fill="#f5a623" />
        <rect x="65.5" y="8" width="2.5" height="12" rx="1" fill="#f5a623" />
        <rect x="56" y="17" width="16" height="9" rx="2" fill="#f5a623" />

        <rect x="54" y="27" width="20" height="34" rx="6" fill="url(#metal)" stroke="#06263f" strokeWidth="1.5" />
        <line x1="57" y1="37" x2="71" y2="37" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
        <line x1="57" y1="45" x2="71" y2="45" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
        <line x1="57" y1="53" x2="71" y2="53" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />

        <path d="M56,61 L72,61 L64,83 Z" fill="url(#metal)" stroke="#06263f" strokeWidth="1.5" />

        <circle cx="64" cy="90" r="3" fill="#f5a623" />
        <circle cx="57" cy="97" r="2.2" fill="#f5a623" opacity="0.85" />
        <circle cx="71" cy="97" r="2.2" fill="#f5a623" opacity="0.85" />
        <circle cx="64" cy="105" r="1.6" fill="#f5a623" opacity="0.7" />
      </svg>
    ),
    { ...size }
  );
}
