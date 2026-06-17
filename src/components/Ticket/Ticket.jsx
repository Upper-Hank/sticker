import Card from '../Card/Card'
import Graphic from '../Graphic/Graphic'
import Logo from '../Graphic/Graphic'
import './Ticket.css'

function Ticket({ data, onCardPointerDown, onCardPointerUp, onCardPointerLeave }) {
  const { bgColor, title, letter, intro, graphic, logo } = data

  return (
    <article className="ticket">
      <div className="ticket-left">
        <Card
          bgColor={bgColor}
          size={480}
          onPointerDown={onCardPointerDown}
          onPointerUp={onCardPointerUp}
          onPointerLeave={onCardPointerLeave}
        >
          <Graphic name={graphic} />
        </Card>
      </div>
      <div className="ticket-right">
        <div className="ticket-head">
          <span className="ticket-title">{title}</span>
          <span className="ticket-letter">{letter}</span>
        </div>
        <div className="ticket-content">
          <div className="ticket-intro">
            {intro.map((line, i) => (
              <span key={i} className="ticket-intro-line">{line}</span>
            ))}
          </div>
          <div className="ticket-logo">
            <Logo name={logo} size={60} />
          </div>
        </div>
      </div>
    </article>
  )
}

export default Ticket
