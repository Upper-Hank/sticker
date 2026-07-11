import './TraceArticle.css'

function TraceArticle() {
  return (
    <div className="trace-story">
      <span className="article-stage">05 — What remains</span>
      <p className="trace-opening">A finished interface hides the number of times it had to become something else.</p>

      <div className="trace-ledger">
        <section>
          <span>Removed</span>
          <p>A desktop-only warning.</p>
          <p>Five competing drop targets.</p>
          <p>Animation that failed under pressure.</p>
          <p>Controls that explained too much.</p>
        </section>
        <section>
          <span>Kept</span>
          <p>Five letters with distinct gestures.</p>
          <p>Color as a wayfinding device.</p>
          <p>The pleasure of placing a sticker.</p>
          <p>A route back to the beginning.</p>
        </section>
      </div>

      <p className="trace-reflection">The discarded versions are no longer visible, but they are still present as decisions. A decorative handle became a real gesture. A graceful transition acquired cleanup rules. Visual design became specific through implementation.</p>

      <div className="trace-coda">
        <span>Upper is now</span>
        <p>a visual introduction</p>
        <p>a small playground</p>
        <p>an unfinished record</p>
      </div>

      <blockquote className="trace-final">The motion ends.<br />The direction remains open.</blockquote>
    </div>
  )
}

export default TraceArticle
