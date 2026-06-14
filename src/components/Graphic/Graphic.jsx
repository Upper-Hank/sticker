import './Graphic.css'

const svgModules = import.meta.glob('/src/assets/*.svg', {
  eager: true,
  query: 'raw',
  import: 'default',
})

function Graphic({ name, size = 300, className }) {
  const key = `/src/assets/${name}.svg`
  const rawSvg = svgModules[key]

  if (!rawSvg) {
    return <div className="graphic-placeholder" style={{ width: size, height: size }} />
  }

  const svg = rawSvg
    .replace(/<svg /, '<svg class="graphic-svg" ')
    .replace(/ width="[^"]*"/, '')
    .replace(/ height="[^"]*"/, '')
    .replace(/<path /g, '<path class="graphic-path" ')

  return (
    <div className={`graphic${className ? ` ${className}` : ''}`} style={{ width: size, height: size }}>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}

export default Graphic
