type LogoProps = {
  compact?: boolean;
};

type CurrencyProps = {
  size?: "sm" | "md" | "lg";
};

export function UpliksLogo({ compact = false }: LogoProps) {
  return (
    <div className={`upliks-logo${compact ? " compact" : ""}`}>
      <svg viewBox="0 0 84 84" aria-hidden="true" className="upliks-mark">
        <defs>
          <linearGradient id="upliks-u-body" x1="10%" x2="84%" y1="94%" y2="8%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="48%" stopColor="#8A4DFF" />
            <stop offset="100%" stopColor="#C6FF4D" />
          </linearGradient>
          <linearGradient id="upliks-u-arrow" x1="24%" x2="80%" y1="100%" y2="0%">
            <stop offset="0%" stopColor="#A7FF37" />
            <stop offset="100%" stopColor="#D3FF74" />
          </linearGradient>
          <filter id="upliks-u-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M16 23c0-6.1 4.9-11 11-11h3.2c6.1 0 11 4.9 11 11v23.4c0 8 5.9 14.4 13.4 14.4 7.2 0 12.9-5.6 13.4-12.7V23c0-6.1 4.9-11 11-11h1.8c6.1 0 11 4.9 11 11v25c0 17.6-14.2 31.8-31.8 31.8C32.8 79.8 16 63 16 42.2V23Z"
          fill="url(#upliks-u-body)"
          filter="url(#upliks-u-glow)"
        />
        <path
          d="M43.8 16h13.1l-8.2 8.3h10.6V38h-12V28.9l-9.1 9-6.5-6.5L43.8 16Z"
          fill="url(#upliks-u-arrow)"
        />
      </svg>
      {!compact ? <span className="upliks-wordmark">Upliks</span> : null}
    </div>
  );
}

export function CurrencyGlyph({ size = "md" }: CurrencyProps) {
  return (
    <span className={`currency-glyph ${size}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <defs>
          <linearGradient id="upliks-currency-ring" x1="6%" x2="90%" y1="100%" y2="6%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="48%" stopColor="#8A4DFF" />
            <stop offset="100%" stopColor="#C6FF4D" />
          </linearGradient>
          <linearGradient id="upliks-currency-core" x1="20%" x2="80%" y1="100%" y2="0%">
            <stop offset="0%" stopColor="#A7FF37" />
            <stop offset="100%" stopColor="#D3FF74" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="9.4" fill="rgba(198,255,77,0.1)" stroke="url(#upliks-currency-ring)" strokeWidth="1.4" />
        <path
          d="M8 8.2v5.1a3.9 3.9 0 0 0 3.9 3.9 3.9 3.9 0 0 0 3.9-3.8v-5"
          fill="none"
          stroke="url(#upliks-currency-ring)"
          strokeLinecap="round"
          strokeWidth="1.9"
        />
        <path d="M11 8h5.7v5.7" fill="none" stroke="url(#upliks-currency-core)" strokeLinecap="round" strokeWidth="1.9" />
        <path d="m10.8 13.2 5.7-5.7" fill="none" stroke="url(#upliks-currency-core)" strokeLinecap="round" strokeWidth="1.9" />
      </svg>
    </span>
  );
}

export function InlineValue({ value, prefix }: { value: number; prefix?: string }) {
  return (
    <span className="inline-value">
      {prefix ? <span>{prefix}</span> : null}
      <strong>{value.toLocaleString("ru-RU")}</strong>
      <CurrencyGlyph size="sm" />
    </span>
  );
}
