import Card from '../Card/Card'
import Graphic from '../Graphic/Graphic'
import Logo from '../Graphic/Graphic'
import './Ticket.css'

function Ticket({ data, article, cardInteractionProps, onRead }) {
  const { bgColor, title, letter, intro, graphic, logo } = data

  return (
    <article className="ticket">
      <div className="ticket-front">
        <div className="ticket-left">
          <Card
            bgColor={bgColor}
            size={480}
            interactionProps={cardInteractionProps}
          >
            <Graphic name={graphic} />
          </Card>
        </div>
        <div className="ticket-right">
          <div className="ticket-head">
            <div className="ticket-head-backdrop" aria-hidden="true" />
            <span className="ticket-title">{title}</span>
            <div className="ticket-logo">
              <Logo name={logo} size={60} />
            </div>
            <span className="ticket-letter">{letter}</span>
          </div>
          <div className="ticket-content">
            <div className="ticket-intro">
              {intro.map((line, i) => (
                <span key={i} className="ticket-intro-line">{line}</span>
              ))}
              {onRead && (
                <button className="ticket-read" type="button" onClick={onRead}>
                  Read the story
                </button>
              )}
            </div>
          </div>
          {article && (
            <div className="ticket-article">
              <div className="ticket-article-hero">
                <span>{article.stage}</span>
                <h1>{article.title}</h1>
                <p>{article.summary}</p>
              </div>
              <div className="ticket-article-sections">
                {article.sections.map(section => (
                  <section key={section.heading}>
                    <h2>{section.heading}</h2>
                    <p>{section.body}</p>
                  </section>
                ))}
                <blockquote>{article.question}</blockquote>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default Ticket
