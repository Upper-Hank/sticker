import './Card.css'

function Card({ bgColor, size = 320, children, onClick }) {
  const isLarge = size === 480

  const className = [
    'card',
    isLarge && 'card--large',
  ]
    .filter(Boolean)
    .join(' ')

  const style = {}
  if (bgColor) {
    style.background = bgColor
  }

  return (
    <div
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Card
