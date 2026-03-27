'use client';

/**
 * NiyoplanLoader – full-screen loading overlay with the animated conveyor SVG.
 * Used in Next.js `loading.jsx` files to show before skeleton screens appear.
 */
export default function NiyoplanLoader() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d1117',
        zIndex: 9999,
        gap: '24px',
      }}
    >
      {/* Brand mark with conveyor animation */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="72" height="72">
        <defs>
          <linearGradient id="niyoLoader_g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0C66E4" />
            <stop offset="55%" stopColor="#1D7AFC" />
            <stop offset="100%" stopColor="#0A4CB5" />
          </linearGradient>
          <clipPath id="niyoLoader_clip">
            <rect width="180" height="180" rx="40" />
          </clipPath>
          <style>{`
            .niyobar {
              animation: niyoconveyor 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
            }
            .niyobar-1 { animation-delay: 0s; }
            .niyobar-2 { animation-delay: 0.15s; }
            .niyobar-3 { animation-delay: 0.3s; }
            @keyframes niyoconveyor {
              0%, 20%  { transform: translateX(0); }
              40%      { transform: translateX(180px); }
              40.1%    { transform: translateX(-180px); }
              60%, 100%{ transform: translateX(0); }
            }
          `}</style>
        </defs>
        <rect width="180" height="180" rx="40" fill="url(#niyoLoader_g)" />
        <g clipPath="url(#niyoLoader_clip)">
          <rect className="niyobar niyobar-1" x="95" y="35" width="55" height="30" rx="15" fill="#FFFFFF" />
          <rect className="niyobar niyobar-2" x="65" y="75" width="55" height="30" rx="15" fill="#FFFFFF" opacity="0.8" />
          <rect className="niyobar niyobar-3" x="35" y="115" width="55" height="30" rx="15" fill="#FFFFFF" opacity="0.5" />
        </g>
      </svg>

      {/* Label */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'inherit',
          }}
        >
          Loading
        </span>
        {/* Animated dots */}
        <div
          style={{
            display: 'flex',
            gap: '5px',
            alignItems: 'center',
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.4)',
                animation: `niyoDot 1.2s ${i * 0.2}s infinite ease-in-out both`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes niyoDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
