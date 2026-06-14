import './Card.css'

function Card({ bgColor, size = 320, variant = 'default', children }) {
  const isLarge = size === 480
  const isPlaceholder = variant === 'placeholder'

  const className = [
    'card',
    isLarge && 'card--large',
    isPlaceholder && 'card--placeholder',
  ]
    .filter(Boolean)
    .join(' ')

  const style = {}
  if (!isPlaceholder && bgColor) {
    style.background = bgColor
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}

export default Card
