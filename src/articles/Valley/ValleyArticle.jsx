import './ValleyArticle.css'

function ValleyArticle() {
  return (
    <div className="valley-story">
      <div className="valley-opening">
        <span className="article-stage">01 — Unknown</span>
        <p className="article-lead">Upper did not begin with a plan. It began with a curve that looked as if it wanted to move.</p>
      </div>

      <p className="valley-dropcap">There was no product brief, audience profile, or final screen waiting to be assembled. There were five letters, five colors, and a question: could a path feel alive before it meant anything?</p>

      <div className="valley-notes" aria-label="Early project notes">
        <p><span>Keep</span>The uneven turns. The moments where a line seems to hesitate.</p>
        <p><span>Remove</span>Anything added only to make the idea look finished.</p>
        <p><span>Follow</span>The forms that suggest their own behavior.</p>
      </div>

      <section className="valley-passage">
        <h2>Constraint came before direction</h2>
        <div>
          <p>Using only the letters in UPPER made every choice visible. Repetition created a family; small differences kept the family from becoming a pattern.</p>
          <p>The U settled into a valley. The two Ps became related loops, never identical twins. The E took a detour. The R left a trace. Their names arrived after their gestures.</p>
        </div>
      </section>

      <p className="valley-ending">Begin with what has energy.<br />Understanding can arrive later.</p>
    </div>
  )
}

export default ValleyArticle
