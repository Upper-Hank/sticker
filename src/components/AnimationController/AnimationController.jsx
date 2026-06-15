import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import './AnimationController.css'

function AnimationController({
  phase,
  gridProgress,
  ticketIndex,
  isAnimating,
  onAdvance,
  onBack,
  onTicketSelect,
  onRestart,
}) {
  const barRef = useRef(null)
  const circleRef = useRef(null)
  const ticketRef = useRef(null)
  const scatterRef = useRef(null)

  const isGrid = phase === 'grid'
  const isTicket = phase === 'ticket'
  const isScatter = phase === 'scatter'
  const isGridReady = isGrid && gridProgress >= 1

  const ticketTotal = 5
  const isLastTicket = ticketIndex >= ticketTotal - 1
  const canGoRight = isTicket && !isLastTicket && !isAnimating
  const canGoLeft = isTicket && ticketIndex > 0 && !isAnimating
  const canGoBackToGrid = isTicket && ticketIndex === 0 && !isAnimating

  useEffect(() => {
    const ctx = gsap.context(() => {
      const bar = barRef.current
      const circle = circleRef.current
      const ticket = ticketRef.current
      const scatter = scatterRef.current

      if (isGrid && !isGridReady) {
        gsap.to(bar, { autoAlpha: 1, duration: 0.2 })
        gsap.set([circle, ticket, scatter], { autoAlpha: 0 })
      } else if (isGridReady) {
        gsap.to(circle, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.7)' })
        gsap.to(bar, { autoAlpha: 0, duration: 0.25 })
        gsap.set([ticket, scatter], { autoAlpha: 0 })
      } else if (isTicket) {
        gsap.fromTo(ticket, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' })
        gsap.set([bar, circle, scatter], { autoAlpha: 0 })
      } else if (isScatter) {
        gsap.fromTo(scatter, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.7)' })
        gsap.set([bar, circle, ticket], { autoAlpha: 0 })
      }
    })

    return () => ctx.revert()
  }, [phase, isGridReady, isTicket, isScatter, isGrid])

  return (
    <div className="ac">
      <div className="ac-bar" ref={barRef}>
        <div className="ac-bar-track">
          <div
            className="ac-bar-fill"
            style={{ width: `${Math.round(gridProgress * 100)}%` }}
          />
        </div>
      </div>

      <div className="ac-circle" ref={circleRef}>
        <button
          className="ac-circle-btn"
          disabled={isAnimating}
          onClick={onAdvance}
          aria-label="Enter ticket view"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4L14 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="ac-ticket" ref={ticketRef}>
        <button
          className="ac-nav-btn ac-nav-left"
          disabled={!canGoLeft && !canGoBackToGrid}
          onClick={ticketIndex === 0 ? onBack : () => onBack()}
          aria-label={ticketIndex === 0 ? 'Back to grid' : 'Previous ticket'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.707 3.29289C16.3165 2.90237 15.6834 2.90237 15.2929 3.29289L8.70698 9.87883C7.53561 11.0504 7.53561 12.9495 8.70698 14.121L15.2929 20.707C15.6834 21.0975 16.3165 21.0975 16.707 20.707C17.0975 20.3164 17.0975 19.6834 16.707 19.2929L10.121 12.707C9.73072 12.3165 9.73072 11.6834 10.121 11.2929L16.707 4.70696C17.0975 4.31643 17.0975 3.68342 16.707 3.29289Z" fill="currentColor"/>
          </svg>
        </button>

        <div className="ac-dots">
          {Array.from({ length: ticketTotal }, (_, i) => (
            <button
              key={i}
              className={`ac-dot${i === ticketIndex ? ' ac-dot--active' : ''}`}
              disabled={isAnimating || i === ticketIndex}
              onClick={() => onTicketSelect(i)}
              aria-label={`Ticket ${i + 1}`}
            />
          ))}
        </div>

        <button
          className="ac-nav-btn ac-nav-right"
          disabled={!canGoRight && !(isTicket && isLastTicket && !isAnimating)}
          onClick={onAdvance}
          aria-label={isLastTicket ? 'Enter scatter' : 'Next ticket'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.29302 3.29289C7.68354 2.90237 8.31655 2.90237 8.70708 3.29289L15.293 9.87883C16.4644 11.0504 16.4644 12.9495 15.293 14.121L8.70708 20.707C8.31655 21.0975 7.68354 21.0975 7.29302 20.707C6.90249 20.3164 6.90249 19.6834 7.29302 19.2929L13.879 12.707C14.2693 12.3165 14.2693 11.6834 13.879 11.2929L7.29302 4.70696C6.90249 4.31643 6.90249 3.68342 7.29302 3.29289Z" fill="currentColor"/>
          </svg>
        </button>
      </div>

      <div className="ac-circle" ref={scatterRef}>
        <button
          className="ac-circle-btn ac-restart"
          disabled={isAnimating}
          onClick={onRestart}
          aria-label="Restart"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.9141 7.6377C18.1794 8.12183 18.0026 8.72954 17.5186 8.99512C17.0344 9.26073 16.4258 9.08285 16.1602 8.59863L14.4249 5.43457C14.4089 5.48373 14.3923 5.53345 14.376 5.58398C13.9386 6.94403 13.4213 8.77809 13.0879 10.6963C12.9605 11.4295 12.8619 12.1651 12.8038 12.8838C14.3655 12.809 15.9277 12.8563 17.2999 13.1299C19.1715 13.5031 20.9779 14.3601 21.6739 16.2109C22.1023 17.3507 22.1036 18.43 21.7042 19.3643C21.3102 20.2854 20.5756 20.9531 19.7344 21.3789C18.0823 22.2152 15.8252 22.2278 14.0225 21.2881C12.1394 20.3062 11.2582 18.479 10.9229 16.5293C10.8409 16.0522 10.7891 15.5592 10.7637 15.0566C8.88155 15.2696 7.07291 15.6116 5.6983 15.9121C4.9592 16.0737 4.34886 16.2224 3.92486 16.3301C3.71293 16.3839 3.54702 16.4271 3.4356 16.457C3.38032 16.4719 3.33841 16.4836 3.3106 16.4912C3.29667 16.495 3.28599 16.4982 3.27935 16.5C3.27625 16.5009 3.27398 16.5015 3.27252 16.502H3.27057C2.7389 16.6514 2.18661 16.3412 2.03717 15.8096C1.88805 15.278 2.19805 14.7266 2.72955 14.5771L3.00006 15.5391C2.73289 14.5886 2.72931 14.5774 2.72955 14.5771L2.73053 14.5762C2.73121 14.576 2.73232 14.5755 2.73346 14.5752C2.73573 14.5746 2.73919 14.5744 2.74322 14.5732C2.75169 14.5709 2.7645 14.5669 2.78033 14.5625C2.81198 14.5538 2.85847 14.5414 2.91803 14.5254C3.03751 14.4933 3.2117 14.4477 3.43267 14.3916C3.87492 14.2793 4.50666 14.125 5.27057 13.958C6.74431 13.6358 8.72322 13.2626 10.7862 13.042C10.8458 12.1363 10.9653 11.228 11.1172 10.3535C11.4718 8.31341 12.0174 6.38444 12.4717 4.97168C12.4751 4.96126 12.4782 4.95079 12.4815 4.94043L9.55572 6.33398C9.05717 6.57143 8.46026 6.3598 8.22271 5.86133C7.98525 5.36274 8.19681 4.76583 8.69537 4.52832L14.6524 1.69141L17.9141 7.6377ZM16.9092 15.0908C15.7048 14.8506 14.2644 14.807 12.7579 14.8867C12.7783 15.3393 12.8223 15.7758 12.8936 16.1904C13.1699 17.7973 13.8238 18.9288 14.9473 19.5146C16.188 20.1614 17.7643 20.1347 18.8311 19.5947C19.3494 19.3324 19.6947 18.9769 19.8653 18.5781C20.0302 18.1925 20.0798 17.6544 19.8018 16.915C19.4761 16.0486 18.5548 15.419 16.9092 15.0908Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default AnimationController
