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
  const neonColors = {
    cyan: '#00ffff',
    pink: '#ff00ff',
    yellow: '#ffff00',
    green: '#00ff00',
    orange: '#ff8000',
    purple: '#8000ff'
  }

  const variants = {
    primary: `bg-surface/90 text-white border-4 backdrop-blur-sm`,
    secondary: `bg-transparent text-white border-4`,
    ghost: `bg-transparent text-white border-2 border-transparent hover:border-current`
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }

  return (
    <button
      onClick={onClick}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        font-retro font-bold
        transition-all duration-300
        hover:scale-105 hover:brightness-125
        active:scale-95
        focus:outline-none focus:ring-4
        rounded-lg
        relative overflow-hidden
        ${className}
      `}
      style={{ 
        borderColor: neonColors[neonColor],
        color: neonColors[neonColor],
        boxShadow: `0 0 30px ${neonColors[neonColor]}40, inset 0 0 15px rgba(255, 255, 255, 0.1)`,
        textShadow: `0 0 10px ${neonColors[neonColor]}`
      }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {/* Animated background effect */}
      <div 
        className="absolute inset-0 opacity-20 transition-opacity duration-300 hover:opacity-40"
        style={{
          background: `linear-gradient(45deg, ${neonColors[neonColor]}20, transparent, ${neonColors[neonColor]}20)`
        }}
      />
    </button>
  )
}

export default Button
