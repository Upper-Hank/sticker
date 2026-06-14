import './Graphic.css'

const svgModules = import.meta.glob('/src/assets/*.svg', {
  eager: true,
  query: 'url',
  import: 'default',
})

function Graphic({ name, size = 300 }) {
  const key = `/src/assets/${name}.svg`
  const src = svgModules[key]

  if (!src) {
    return <div className="graphic-placeholder" style={{ width: size, height: size }} />
  }

  return (
    <div className="graphic" style={{ width: size, height: size }}>
      <img src={src} alt="" draggable={false} />
    </div>
  )
}

export default Graphic
