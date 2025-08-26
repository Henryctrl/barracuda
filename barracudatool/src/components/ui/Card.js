const Card = ({ children, neonColor = 'cyan', className = '' }) => {
    const neonColors = {
      cyan: '#00ffff',
      pink: '#ff00ff',
      yellow: '#ffff00',
      green: '#00ff00',
      orange: '#ff8000',
      purple: '#8000ff'
    }
  
    return (
      <div 
        className={`
          bg-surface/80 backdrop-blur-sm
          border-2 rounded-lg p-6
          ${className}
        `}
        style={{ 
          borderColor: neonColors[neonColor],
          boxShadow: `0 0 20px ${neonColors[neonColor]}30`
        }}
      >
        {children}
      </div>
    )
  }
  
  export default Card
  