import React, { useId } from 'react';

export interface MailCraftLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark' | 'footer';
  showText?: boolean;
  badge?: string;
  className?: string;
}

const SIZE_MAP = {
  xs: { box: 'w-6 h-6', text: 'text-sm font-bold' },
  sm: { box: 'w-8 h-8', text: 'text-base font-extrabold' },
  md: { box: 'w-9 h-9', text: 'text-xl font-black' },
  lg: { box: 'w-11 h-11', text: 'text-2xl font-black' },
} as const;

export function MailCraftIcon({ className = 'w-9 h-9' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const bgId = `mc-bg-${uid}`;
  const shineId = `mc-shine-${uid}`;
  const envId = `mc-env-${uid}`;
  const sparkId = `mc-spark-${uid}`;
  const clipId = `mc-clip-${uid}`;
  const maskId = `mc-mask-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bgId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id={shineId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id={envId} x1="32" y1="22" x2="32" y2="47" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E0E7FF" />
        </linearGradient>
        <linearGradient id={sparkId} x1="44" y1="8.5" x2="54.5" y2="19.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="13" y="22" width="38" height="25" rx="5.5" />
        </clipPath>
        <mask id={maskId}>
          <rect width="64" height="64" fill="white" />
          <path
            d="M49.5 6.5 Q49.8 14.2 57.5 14.5 Q49.8 14.8 49.5 22.5 Q49.2 14.8 41.5 14.5 Q49.2 14.2 49.5 6.5 Z"
            fill="black"
          />
        </mask>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${bgId})`} />
      <rect x="2.5" y="2.5" width="59" height="59" rx="15.5" stroke={`url(#${shineId})`} strokeWidth="1" />

      <g mask={`url(#${maskId})`}>
        <rect x="13" y="22" width="38" height="25" rx="5.5" fill={`url(#${envId})`} />
        <g clipPath={`url(#${clipId})`}>
          <path d="M13 47 L32 35.5 L51 47 Z" fill="#C7D2FE" fillOpacity="0.48" />
          <path
            d="M12 23.5 L32 37 L52 23.5"
            stroke="#4F46E5"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 44.5 L24.5 37 M48.5 44.5 L39.5 37"
            stroke="#818CF8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.72"
          />
        </g>
      </g>

      <path
        d="M49.5 8.5 Q49.75 14.25 55.5 14.5 Q49.75 14.75 49.5 20.5 Q49.25 14.75 43.5 14.5 Q49.25 14.25 49.5 8.5 Z"
        fill={`url(#${sparkId})`}
      />
    </svg>
  );
}

export function MailCraftLogo({
  size = 'md',
  variant = 'light',
  showText = true,
  badge,
  className = '',
}: MailCraftLogoProps) {
  const { box, text } = SIZE_MAP[size];

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <MailCraftIcon className={`${box} shrink-0 drop-shadow-sm transition-transform group-hover:scale-105`} />
      {showText && (
        <span className="inline-flex items-center">
          {variant === 'dark' ? (
            <span className={`${text} tracking-tight text-white`}>
              Mail<span className="text-indigo-400">Craft</span>
            </span>
          ) : variant === 'footer' ? (
            <span className={`${text} tracking-tight text-slate-200`}>
              Mail<span className="text-indigo-400">Craft</span>
            </span>
          ) : (
            <span className={`${text} tracking-tight text-slate-900`}>
              Mail<span className="text-indigo-600">Craft</span>
            </span>
          )}
          {badge && (
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {badge}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

