import './RepriseArticle.css'

function RepriseArticle() {
  return (
    <div className="reprise-story">
      <div className="reprise-status">
        <span className="article-stage">03 — Interaction report</span>
        <span className="reprise-badge">Resolved</span>
      </div>
      <p className="article-lead">The animation worked perfectly—as long as nobody behaved like a person.</p>

      <div className="reprise-incident">
        <div><span>Trigger</span><p>Rapid clicks, long presses, and leaving midway through a transition.</p></div>
        <div><span>Failure</span><p>Several timelines wrote to the same transform. Cleanup depended on the happy path.</p></div>
        <div><span>Decision</span><p>Take the interaction offline before rebuilding it.</p></div>
      </div>

      <section className="reprise-change">
        <h2>One object,<br />three owners</h2>
        <div className="reprise-layers">
          <p><b>Outer card</b><span>page position and transition</span></p>
          <p><b>Inner layer</b><span>press, stretch, release</span></p>
          <p><b>SVG path</b><span>drawing progress</span></p>
        </div>
      </section>

      <div className="reprise-test">
        <span>New rule</span>
        <p>Input received during a locked moment is not discarded. If the pointer is still held when the transition finishes, the interaction continues from the user’s intent—not from a replay of old events.</p>
      </div>

      <p className="reprise-ending">Robust motion is choreography that survives interruption.</p>
    </div>
  )
}

export default RepriseArticle
