const Card = ({ children, neonColor = 'cyan', className = '' }) => {
  const accents = {
    cyan: {
      border: 'rgba(245, 158, 11, 0.22)',
      glow: 'rgba(245, 158, 11, 0.10)',
      highlight: 'rgba(251, 191, 36, 0.10)',
    },
    pink: {
      border: 'rgba(245, 158, 11, 0.24)',
      glow: 'rgba(245, 158, 11, 0.12)',
      highlight: 'rgba(251, 191, 36, 0.12)',
    },
    yellow: {
      border: 'rgba(245, 158, 11, 0.28)',
      glow: 'rgba(245, 158, 11, 0.14)',
      highlight: 'rgba(252, 211, 77, 0.16)',
    },
    green: {
      border: 'rgba(217, 119, 6, 0.22)',
      glow: 'rgba(217, 119, 6, 0.10)',
      highlight: 'rgba(251, 191, 36, 0.10)',
    },
    orange: {
      border: 'rgba(234, 88, 12, 0.24)',
      glow: 'rgba(234, 88, 12, 0.12)',
      highlight: 'rgba(251, 146, 60, 0.14)',
    },
    purple: {
      border: 'rgba(180, 83, 9, 0.22)',
      glow: 'rgba(180, 83, 9, 0.10)',
      highlight: 'rgba(251, 191, 36, 0.10)',
    },
  }

  const tone = accents[neonColor] || accents.cyan

  return (
    <div
      className={`
        rounded-2xl border p-6 backdrop-blur-md
        bg-[rgba(24,24,27,0.82)] dark:bg-[rgba(24,24,27,0.82)]
        text-slate-100
        ${className}
      `}
      style={{
        borderColor: tone.border,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.04),
          0 10px 30px rgba(0,0,0,0.28),
          0 0 0 1px ${tone.highlight},
          0 0 24px ${tone.glow}
        `,
      }}
    >
      {children}
    </div>
  )
}

export default Card