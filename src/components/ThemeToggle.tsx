import { useTheme } from '../hooks/useTheme'

interface Props {
  style?: React.CSSProperties
}

export function ThemeToggle({ style }: Props) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 0,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        background: isDark ? 'rgba(106, 170, 196, 0.20)' : 'rgba(78, 110, 126, 0.10)',
        boxShadow: isDark
          ? 'inset 0 0 0 1px rgba(106, 170, 196, 0.38), 0 0 10px rgba(106, 170, 196, 0.10)'
          : 'inset 0 0 0 1px rgba(78, 110, 126, 0.22)',
        transition: 'background 0.4s ease, box-shadow 0.4s ease',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {/* Sliding thumb */}
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: isDark ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'var(--clr-accent-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left 0.40s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 1px 5px rgba(0, 0, 0, 0.25)',
          color: 'white',
          pointerEvents: 'none',
        }}
      >
        {/* Sun icon — visible in light mode */}
        <span style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'scale(0.6) rotate(-30deg)' : 'scale(1) rotate(0deg)',
          transition: 'opacity 0.25s ease, transform 0.30s ease',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <line x1="12" y1="2"  x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="4.22" y1="4.22"   x2="6.34"  y2="6.34"/>
            <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
            <line x1="2"  y1="12" x2="5"  y2="12"/>
            <line x1="19" y1="12" x2="22" y2="12"/>
            <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66"/>
            <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"/>
          </svg>
        </span>

        {/* Moon icon — visible in dark mode */}
        <span style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'scale(1) rotate(0deg)' : 'scale(0.6) rotate(30deg)',
          transition: 'opacity 0.25s ease, transform 0.30s ease',
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </span>
      </span>
    </button>
  )
}
