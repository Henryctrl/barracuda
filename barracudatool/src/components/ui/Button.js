'use client'

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  neonColor = 'cyan',
  onClick,
  className = '',
  ...props
}) => {
  const tones = {
    cyan: {
      solid: '#d97706',
      solidHover: '#f59e0b',
      subtle: 'rgba(245, 158, 11, 0.14)',
      border: 'rgba(245, 158, 11, 0.28)',
      text: '#f3f4f6',
      ghostText: '#fbbf24',
      ring: 'rgba(251, 191, 36, 0.45)',
    },
    pink: {
      solid: '#b45309',
      solidHover: '#d97706',
      subtle: 'rgba(217, 119, 6, 0.14)',
      border: 'rgba(217, 119, 6, 0.28)',
      text: '#f3f4f6',
      ghostText: '#f59e0b',
      ring: 'rgba(245, 158, 11, 0.42)',
    },
    yellow: {
      solid: '#f59e0b',
      solidHover: '#fbbf24',
      subtle: 'rgba(251, 191, 36, 0.16)',
      border: 'rgba(251, 191, 36, 0.30)',
      text: '#111827',
      ghostText: '#fbbf24',
      ring: 'rgba(251, 191, 36, 0.48)',
    },
    green: {
      solid: '#a16207',
      solidHover: '#ca8a04',
      subtle: 'rgba(202, 138, 4, 0.14)',
      border: 'rgba(202, 138, 4, 0.26)',
      text: '#f9fafb',
      ghostText: '#fbbf24',
      ring: 'rgba(251, 191, 36, 0.42)',
    },
    orange: {
      solid: '#c2410c',
      solidHover: '#ea580c',
      subtle: 'rgba(234, 88, 12, 0.14)',
      border: 'rgba(234, 88, 12, 0.28)',
      text: '#f9fafb',
      ghostText: '#fb923c',
      ring: 'rgba(251, 146, 60, 0.42)',
    },
    purple: {
      solid: '#92400e',
      solidHover: '#b45309',
      subtle: 'rgba(180, 83, 9, 0.14)',
      border: 'rgba(180, 83, 9, 0.28)',
      text: '#f9fafb',
      ghostText: '#f59e0b',
      ring: 'rgba(245, 158, 11, 0.42)',
    },
  }

  const tone = tones[neonColor] || tones.cyan

  const variants = {
    primary: {
      backgroundColor: tone.solid,
      color: tone.text,
      borderColor: tone.solid,
      boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
    },
    secondary: {
      backgroundColor: tone.subtle,
      color: '#f3f4f6',
      borderColor: tone.border,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: tone.ghostText,
      borderColor: 'rgba(255,255,255,0.08)',
      boxShadow: 'none',
    },
  }

  const sizes = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const current = variants[variant] || variants.primary

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl border
        font-medium tracking-[0.01em]
        transition-all duration-200
        hover:-translate-y-[1px]
        active:translate-y-0 active:scale-[0.99]
        focus-visible:outline-none
        ${sizes[size]}
        ${className}
      `}
      style={{
        backgroundColor: current.backgroundColor,
        color: current.color,
        borderColor: current.borderColor,
        boxShadow: current.boxShadow,
      }}
      onMouseEnter={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.backgroundColor = tone.solidHover
          e.currentTarget.style.borderColor = tone.solidHover
        } else if (variant === 'secondary') {
          e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.18)'
          e.currentTarget.style.borderColor = tone.solidHover
        } else {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.borderColor = tone.border
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = current.backgroundColor
        e.currentTarget.style.color = current.color
        e.currentTarget.style.borderColor = current.borderColor
        e.currentTarget.style.boxShadow = current.boxShadow
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `${current.boxShadow === 'none' ? '' : current.boxShadow + ', '}0 0 0 3px ${tone.ring}`
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = current.boxShadow
      }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  )
}

export default Button