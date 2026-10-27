import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'light',
  showTagline = false,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
  }[size];

  const textColorRe = variant === 'dark' ? 'text-white' : 'text-slate-900';
  const textColorValue = variant === 'dark' ? 'text-emerald-400' : 'text-emerald-600';
  const taglineColor = variant === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Brand Emblem */}
      <div className={`${iconDimensions} rounded-lg bg-slate-950 flex items-center justify-center p-1.5 shadow-2xs shrink-0 border border-slate-800`}>
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <rect x="5" y="2" width="14" height="20" rx="3" stroke="#059669" strokeWidth="1.75" />
          <path d="M10 5H14" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8.5 13.5L12 10L15.5 13.5" stroke="#10b981" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 10V16" stroke="#10b981" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="flex flex-col">
        <div className="flex items-center">
          <span className={`${textSizes} font-black tracking-tight ${textColorRe}`}>
            Re
          </span>
          <span className={`${textSizes} font-black tracking-tight ${textColorValue}`}>
            Value
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5 inline-block" />
        </div>
        {showTagline && (
          <span className={`text-[9.5px] font-medium tracking-tight -mt-0.5 ${taglineColor}`}>
            Every phone has more value
          </span>
        )}
      </div>
    </div>
  );
};
