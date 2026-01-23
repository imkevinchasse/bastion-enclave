import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  animated?: boolean;
}

export const BrandLogo: React.FC<LogoProps> = ({ className, size = 24, animated = false }) => {
  return (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
    >
        <defs>
            <linearGradient id="shield_metal" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#f1f5f9" />
                <stop offset="0.4" stopColor="#94a3b8" />
                <stop offset="0.6" stopColor="#cbd5e1" />
                <stop offset="1" stopColor="#475569" />
            </linearGradient>
            
            <linearGradient id="keyhole_glow" x1="45" y1="50" x2="55" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" />
                <stop offset="1" stopColor="#3b82f6" />
            </linearGradient>

            <filter id="glow_blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Outer Metallic Shield Structure */}
        <path 
            d="M50 96L12 76V26H30V38H40V20H60V38H70V26H88V76L50 96Z" 
            fill="url(#shield_metal)" 
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
            className="drop-shadow-2xl"
        />

        {/* Inner Dark Recess */}
        <path 
            d="M50 88L20 72V32H34V44H44V28H56V44H66V32H80V72L50 88Z" 
            fill="#020617" 
            fillOpacity="0.9"
        />

        {/* Keyhole with Glow */}
        <g filter="url(#glow_blur)" className={animated ? "animate-pulse" : ""}>
            <circle cx="50" cy="54" r="7" fill="url(#keyhole_glow)" className={animated ? "animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75" : ""} />
            <circle cx="50" cy="54" r="7" fill="url(#keyhole_glow)" />
            <path d="M45 60H55L57 74H43L45 60Z" fill="url(#keyhole_glow)" />
        </g>
    </svg>
  );
};