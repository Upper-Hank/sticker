import './DetourArticle.css'

function DetourArticle() {
  return (
    <div className="detour-story">
      <span className="article-stage">04 — Two screens, two behaviors</span>
      <p className="article-lead">The smaller screen did not ask for a compressed desktop experience. It asked for a different project.</p>

      <div className="detour-comparison">
        <section>
          <span>Desktop</span>
          <h2>A journey</h2>
          <p>Move through a horizontal sequence. Watch the system assemble itself. Reach the tickets after the visual language has been introduced.</p>
          <ul><li>scroll</li><li>sequence</li><li>reveal</li></ul>
        </section>
        <section>
          <span>Mobile</span>
          <h2>A playground</h2>
          <p>Meet the stickers immediately. Drag one into place. Open its ticket. The hand becomes the shortest route into the idea.</p>
          <ul><li>touch</li><li>place</li><li>discover</li></ul>
        </section>
      </div>

      <div className="detour-cut">
        <p>Five destination slots</p><span>became</span><p>One clear target</p>
        <p>Ticket navigation</p><span>became</span><p>A closing gesture</p>
        <p>Desktop instructions</p><span>became</span><p>Immediate play</p>
      </div>

      <section className="detour-principle">
        <span>Responsive principle</span>
        <p>Preserve the reason for the interaction, not the arrangement of its parts.</p>
      </section>
    </div>
  )
}

export default DetourArticle
