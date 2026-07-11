import './ReverieArticle.css'

const characters = [
  ['U', 'Valley', 'holds weight, then rises', '#FF5254'],
  ['P', 'Loop', 'returns without closing', '#FFD75E'],
  ['P', 'Reprise', 'repeats with a difference', '#63E8BA'],
  ['E', 'Detour', 'refuses the straight route', '#6ECAFF'],
  ['R', 'Trace', 'carries the turn forward', '#A58AE8'],
]

function ReverieArticle() {
  return (
    <div className="reverie-story">
      <span className="article-stage">02 — A visual vocabulary</span>
      <p className="reverie-statement">An identity can be a cast of characters instead of a single, obedient mark.</p>

      <div className="reverie-characters">
        {characters.map(([letter, name, behavior, color], index) => (
          <div className="reverie-character" key={`${letter}-${name}`}>
            <span className="reverie-index">0{index + 1}</span>
            <span className="reverie-swatch" style={{ backgroundColor: color }}>{letter}</span>
            <h2>{name}</h2>
            <p>{behavior}</p>
          </div>
        ))}
      </div>

      <div className="reverie-equation">
        <span>serif</span><b>slows the voice</b>
        <span>color</span><b>separates the characters</b>
        <span>motion</span><b>reveals intention</b>
        <span>space</span><b>lets each gesture finish</b>
      </div>

      <blockquote className="reverie-quote">Not a logo placed on a system.<br />A system learning how to speak.</blockquote>
    </div>
  )
}

export default ReverieArticle
