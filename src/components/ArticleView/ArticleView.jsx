import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import Graphic from '../Graphic/Graphic'
import './ArticleView.css'

function ArticleView({
  article,
  ticket,
  index,
  variant = 'desktop',
  viewRef,
  transitionApiRef,
  onTransitionClosed,
}) {
  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view) return

    const content = view.querySelector('.article-content')
    const reveals = Array.from(view.querySelectorAll('.article-reveal'))
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    view.scrollTop = 0
    gsap.set(view, { yPercent: 0, backgroundColor: 'rgba(239,239,231,0)' })
    gsap.set(content, { autoAlpha: 0 })
    gsap.set(reveals, { autoAlpha: 0 })

    const timeline = gsap.timeline({
      paused: true,
      onReverseComplete: onTransitionClosed,
    })

    const addContentReveal = (at) => {
      timeline
        .to(view, { backgroundColor: '#efefe7', duration: reduceMotion ? 0 : 0.16 }, at)
        .set(content, { autoAlpha: 1 }, at)
        .fromTo(reveals, {
          autoAlpha: 0,
          y: 24,
        }, {
          autoAlpha: 1,
          y: 0,
          duration: reduceMotion ? 0 : 0.52,
          stagger: reduceMotion ? 0 : 0.065,
          ease: 'power2.out',
        }, at + 0.08)
    }

    gsap.set(view, { yPercent: reduceMotion ? 0 : 100 })
    timeline.to(view, { yPercent: 0, duration: reduceMotion ? 0 : 0.56, ease: 'power3.inOut' }, 0)
    addContentReveal(reduceMotion ? 0 : 0.34)

    transitionApiRef.current = {
      close: () => {
        if (timeline.reversed()) return
        timeline.reverse()
      },
    }
    timeline.play(0)

    return () => {
      timeline.kill()
      transitionApiRef.current = null
    }
  }, [article, onTransitionClosed, ticket.bgColor, transitionApiRef, variant, viewRef])

  return (
    <article className={`article-view article-view--${variant}`} ref={viewRef}>
      <div className="article-content">
        <header className="article-hero">
          <div className="article-visual article-reveal" style={{ background: ticket.bgColor }}>
            <Graphic name={ticket.graphic} size={variant === 'mobile' ? 180 : 260} />
          </div>
          <div className="article-heading article-reveal">
            <div className="article-meta">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{article.stage}</span>
            </div>
            <h1>{article.title}</h1>
            <p>{article.summary}</p>
          </div>
        </header>

        <div className="article-body">
          {article.sections.map(section => (
            <section className="article-section article-reveal" key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          <blockquote className="article-question article-reveal">{article.question}</blockquote>
        </div>

      </div>
    </article>
  )
}

export default ArticleView
