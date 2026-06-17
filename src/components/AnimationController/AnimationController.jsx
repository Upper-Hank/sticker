import { useRef, useEffect, useLayoutEffect, useMemo, useCallback, useState } from 'react'
import gsap from 'gsap'
import './AnimationController.css'

const SH = {
  progress: { width: 240, height: 4, radius: 2 },
  ready: { width: 44, height: 44, radius: 22 },
  ticket: { width: 204, height: 46, radius: 23 },
  restart: { width: 44, height: 44, radius: 22 },
}

const BG = {
  progress: { borderWidth: 0, borderColor: 'transparent', backgroundColor: 'rgba(83,83,83,0.15)', boxShadow: 'none' },
  ready: { borderWidth: 1.5, borderColor: 'rgba(83,83,83,0.25)', backgroundColor: 'rgba(239,239,231,0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  ticket: { borderWidth: 1.5, borderColor: 'rgba(83,83,83,0.2)', backgroundColor: 'rgba(239,239,231,0.95)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  restart: { borderWidth: 1.5, borderColor: 'rgba(83,83,83,0.25)', backgroundColor: 'rgba(239,239,231,0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
}

const READY_PROGRESS = 0.995

function AnimationController({
  phase,
  gridProgress,
  ticketIndex,
  visualTicketIndex,
  isAnimating,
  onAdvance,
  onBack,
  onTicketSelect,
  onRestart,
}) {
  const shellRef = useRef(null)
  const bgRef = useRef(null)
  const progressRef = useRef(null)
  const arrowRef = useRef(null)
  const ticketUIRef = useRef(null)
  const leftNavRef = useRef(null)
  const rightNavRef = useRef(null)
  const dotsContainerRef = useRef(null)
  const restartRef = useRef(null)

  const prevVisualTickRef = useRef(visualTicketIndex)
  const visualTicketIndexRef = useRef(visualTicketIndex)

  const mode = useMemo(() => {
    if (phase === 'grid' && gridProgress < READY_PROGRESS) return 'progress'
    if (phase === 'grid') return 'ready'
    if (phase === 'ticket') return 'ticket'
    return 'restart'
  }, [phase, gridProgress])

  const ticketTotal = 5
  const isLastTicket = ticketIndex >= ticketTotal - 1

  const prevModeRef = useRef(null)
  const activeTlRef = useRef(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const isControlDisabled = isAnimating || isTransitioning

  /* ---- helpers ---- */
  const getAllDots = useCallback(() => {
    return gsap.utils.toArray('.ac-dot-core', shellRef.current)
  }, [])

  const syncDots = useCallback((activeIndex, animate = true) => {
    const cores = getAllDots()
    if (!cores.length) return

    cores.forEach((core, i) => {
      gsap.killTweensOf(core)
      const vars = {
        autoAlpha: 1,
        scale: i === activeIndex ? 1.35 : 1,
        backgroundColor: i === activeIndex ? '#535353' : 'rgba(83,83,83,0.25)',
        duration: animate ? 0.22 : 0,
        ease: i === activeIndex ? 'back.out(1.7)' : 'power2.out',
        overwrite: 'auto',
      }

      if (animate) {
        gsap.to(core, vars)
      } else {
        gsap.set(core, vars)
      }
    })
  }, [getAllDots])

  const resetLayers = useCallback(() => {
    const els = [
      progressRef.current,
      arrowRef.current,
      ticketUIRef.current,
      restartRef.current,
      leftNavRef.current,
      rightNavRef.current,
    ].filter(Boolean)
    gsap.killTweensOf(els)
    gsap.set(els, { autoAlpha: 0 })
    gsap.set([leftNavRef.current, rightNavRef.current].filter(Boolean), { x: 0, scale: 1 })
    const cores = getAllDots()
    if (cores.length) {
      gsap.killTweensOf(cores)
      gsap.set(cores, { scale: 1, backgroundColor: 'rgba(83,83,83,0.25)' })
    }
  }, [getAllDots])

  const snapToMode = useCallback((targetMode) => {
    resetLayers()
    const shell = shellRef.current
    const bg = bgRef.current
    if (!shell || !bg) return
    const s = SH[targetMode]
    const b = BG[targetMode]
    gsap.killTweensOf([shell, bg])
    gsap.set(shell, { width: s.width, height: s.height, borderRadius: s.radius })
    gsap.set(bg, { borderWidth: b.borderWidth, borderColor: b.borderColor, backgroundColor: b.backgroundColor, boxShadow: b.boxShadow })

    if (targetMode === 'progress') {
      gsap.set(progressRef.current, { autoAlpha: 1 })
    } else if (targetMode === 'ready') {
      gsap.set(arrowRef.current, { autoAlpha: 1, scale: 1 })
    } else if (targetMode === 'ticket') {
      gsap.set(ticketUIRef.current, { autoAlpha: 1 })
      gsap.set([leftNavRef.current, rightNavRef.current], { autoAlpha: 1, x: 0, scale: 1 })
      gsap.set(getAllDots(), { autoAlpha: 1 })
      syncDots(visualTicketIndexRef.current, false)
    } else if (targetMode === 'restart') {
      gsap.set(restartRef.current, { autoAlpha: 1, scale: 1, rotate: 0 })
    }
  }, [resetLayers, getAllDots, syncDots])

  /* ---- snap on mount ---- */
  useLayoutEffect(() => {
    snapToMode(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- play / reverse timelines on mode change ---- */
  useLayoutEffect(() => {
    const prev = prevModeRef.current
    prevModeRef.current = mode
    if (prev === mode) return

    if (prev == null) return

    const shell = shellRef.current
    const bg = bgRef.current
    const progress = progressRef.current
    const arrow = arrowRef.current
    const ticketUI = ticketUIRef.current
    const left = leftNavRef.current
    const right = rightNavRef.current
    const restart = restartRef.current
    const allCores = getAllDots()
    if (!shell || !bg) return

    activeTlRef.current?.kill()
    gsap.killTweensOf([shell, bg, progress, arrow, ticketUI, left, right, restart, ...allCores].filter(Boolean))

    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => {
        activeTlRef.current = null
        setIsTransitioning(false)
      },
      onInterrupt: () => setIsTransitioning(false),
    })
    activeTlRef.current = tl
    setIsTransitioning(true)

    if (prev === 'progress' && mode === 'ready') {
      tl.set([ticketUI, restart], { autoAlpha: 0 }, 0)
        .set(arrow, { autoAlpha: 0, scale: 0.5 }, 0)
        .to(shell, { width: SH.ready.width, duration: 0.28, ease: 'power2.inOut' }, 0)
        .to(progress, { autoAlpha: 0, duration: 0.18 }, 0.14)
        .to(shell, { height: SH.ready.height, borderRadius: SH.ready.radius, duration: 0.35, ease: 'power3.inOut' }, 0.16)
        .to(bg, { ...BG.ready, duration: 0.35, ease: 'power3.inOut' }, 0.16)
        .to(arrow, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }, 0.30)
    } else if (prev === 'ready' && mode === 'progress') {
      tl.to(arrow, { autoAlpha: 0, scale: 0.5, duration: 0.16, ease: 'power2.in' }, 0)
        .to(bg, { ...BG.progress, duration: 0.28, ease: 'power2.inOut' }, 0.08)
        .to(shell, { height: SH.progress.height, borderRadius: SH.progress.radius, duration: 0.28, ease: 'power3.inOut' }, 0.08)
        .to(progress, { autoAlpha: 1, duration: 0.16 }, 0.22)
        .to(shell, { width: SH.progress.width, duration: 0.32, ease: 'power2.inOut' }, 0.25)
    } else if (prev === 'restart' && mode === 'progress') {
      tl.set([arrow, ticketUI], { autoAlpha: 0 }, 0)
        .to(restart, { autoAlpha: 0, scale: 0.45, rotate: 90, duration: 0.2, ease: 'power2.in' }, 0)
        .to(bg, { ...BG.progress, duration: 0.28, ease: 'power2.inOut' }, 0.12)
        .to(shell, { height: SH.progress.height, borderRadius: SH.progress.radius, duration: 0.28, ease: 'power3.inOut' }, 0.12)
        .to(progress, { autoAlpha: 1, duration: 0.16 }, 0.26)
        .to(shell, { width: SH.progress.width, duration: 0.32, ease: 'power2.inOut' }, 0.29)
    } else if (prev === 'ready' && mode === 'ticket') {
      tl.to(arrow, { autoAlpha: 0, scale: 0.65, duration: 0.15, ease: 'power2.in' }, 0)
        .to(shell, { width: SH.ticket.width, height: SH.ticket.height, borderRadius: SH.ticket.radius, duration: 0.38, ease: 'power3.inOut' }, 0.02)
        .to(bg, { ...BG.ticket, duration: 0.38, ease: 'power3.inOut' }, 0.02)
        .fromTo(ticketUI, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, 0.08)
        .fromTo(left, { autoAlpha: 0, x: -14, scale: 1 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.22, ease: 'power2.out' }, 0.12)
        .fromTo(right, { autoAlpha: 0, x: 14, scale: 1 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.22, ease: 'power2.out' }, 0.12)
      allCores.forEach((core, i) => {
        tl.fromTo(core, { scale: 0, autoAlpha: 0 }, {
          scale: 1,
          backgroundColor: 'rgba(83,83,83,0.25)',
          autoAlpha: 1,
          duration: 0.25,
          ease: 'back.out(2)',
        }, 0.18 + i * 0.04)
      })
      tl.call(() => syncDots(visualTicketIndexRef.current, false), [], 0.64)
    } else if (prev === 'ticket' && mode === 'ready') {
      tl.to(ticketUI, { autoAlpha: 0, duration: 0.14, ease: 'power2.in' }, 0)
        .to([left, right, ...allCores], { autoAlpha: 0, scale: 0.7, duration: 0.14, ease: 'power2.in' }, 0)
        .to(shell, { width: SH.ready.width, height: SH.ready.height, borderRadius: SH.ready.radius, duration: 0.35, ease: 'power3.inOut' }, 0.08)
        .to(bg, { ...BG.ready, duration: 0.35, ease: 'power3.inOut' }, 0.08)
        .fromTo(arrow, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'back.out(1.7)' }, 0.24)
    } else if (prev === 'ticket' && mode === 'restart') {
      tl.to(ticketUI, { autoAlpha: 0, duration: 0.16, ease: 'power2.in' }, 0)
        .to([left, right, ...allCores], { autoAlpha: 0, scale: 0.7, duration: 0.15, ease: 'power2.in' }, 0)
        .to(shell, { width: SH.restart.width, height: SH.restart.height, borderRadius: SH.restart.radius, duration: 0.38, ease: 'power3.inOut' }, 0.08)
        .to(bg, { ...BG.restart, duration: 0.38, ease: 'power3.inOut' }, 0.08)
        .fromTo(restart, { autoAlpha: 0, scale: 0.5, rotate: -90 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.35, ease: 'back.out(1.4)' }, 0.22)
    } else if (prev === 'restart' && mode === 'ticket') {
      tl.to(restart, { autoAlpha: 0, scale: 0.5, duration: 0.15, ease: 'power2.in' }, 0)
        .to(shell, { width: SH.ticket.width, height: SH.ticket.height, borderRadius: SH.ticket.radius, duration: 0.38, ease: 'power3.inOut' }, 0.04)
        .to(bg, { ...BG.ticket, duration: 0.38, ease: 'power3.inOut' }, 0.04)
        .fromTo(ticketUI, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, 0.16)
        .fromTo(left, { autoAlpha: 0, x: -14, scale: 1 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.22, ease: 'power2.out' }, 0.18)
        .fromTo(right, { autoAlpha: 0, x: 14, scale: 1 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.22, ease: 'power2.out' }, 0.18)
      allCores.forEach((core, i) => {
        tl.fromTo(core, { scale: 0, autoAlpha: 0 }, {
          scale: 1,
          backgroundColor: 'rgba(83,83,83,0.25)',
          autoAlpha: 1,
          duration: 0.25,
          ease: 'back.out(2)',
        }, 0.22 + i * 0.04)
      })
      tl.call(() => syncDots(visualTicketIndexRef.current, false), [], 0.68)
    } else {
      snapToMode(mode)
    }
  }, [mode, snapToMode, getAllDots, syncDots])

  /* ---- dot swap on visualTicketIndex change ---- */
  useEffect(() => {
    visualTicketIndexRef.current = visualTicketIndex
    if (mode !== 'ticket') return
    const prev = prevVisualTickRef.current
    prevVisualTickRef.current = visualTicketIndex
    if (prev === visualTicketIndex) return

    syncDots(visualTicketIndex, true)
  }, [visualTicketIndex, mode, syncDots])

  /* ---- progress fill live update ---- */
  const fillScale = Math.max(0, Math.min(1, gridProgress))

  return (
    <div className={`ac${isControlDisabled ? ' ac--disabled' : ''}`}>
      <div className="ac-shell" ref={shellRef}>
        <div className="ac-bg" ref={bgRef} />
        <div className="ac-content">
          <div className="ac-progress" ref={progressRef}>
            <div
              className="ac-progress-fill"
              style={{ transform: `scaleX(${fillScale})` }}
            />
          </div>

          <div className="ac-icon-wrap" ref={arrowRef}>
            <button
              className="ac-icon-btn"
              disabled={isControlDisabled || mode !== 'ready'}
              onClick={onAdvance}
              aria-label="Enter ticket view"
            >
              <svg className="ac-icon-svg" viewBox="0 0 20 20" fill="none">
                <path d="M7 4L14 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="ac-ticket-ui" ref={ticketUIRef}>
            <button
              ref={leftNavRef}
              className="ac-nav-btn ac-nav-left"
              disabled={isControlDisabled || mode !== 'ticket'}
              onClick={ticketIndex === 0 ? onBack : () => onBack()}
              aria-label={ticketIndex === 0 ? 'Back to grid' : 'Previous ticket'}
            >
              <svg className="ac-nav-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.707 3.29289C16.3165 2.90237 15.6834 2.90237 15.2929 3.29289L8.70698 9.87883C7.53561 11.0504 7.53561 12.9495 8.70698 14.121L15.2929 20.707C15.6834 21.0975 16.3165 21.0975 16.707 20.707C17.0975 20.3164 17.0975 19.6834 16.707 19.2929L10.121 12.707C9.73072 12.3165 9.73072 11.6834 10.121 11.2929L16.707 4.70696C17.0975 4.31643 17.0975 3.68342 16.707 3.29289Z" fill="currentColor" />
              </svg>
            </button>

            <div className="ac-dots" ref={dotsContainerRef}>
              {Array.from({ length: ticketTotal }, (_, i) => (
                <button
                  key={i}
                  className="ac-dot"
                  disabled={isControlDisabled || i === visualTicketIndex || mode !== 'ticket'}
                  onClick={() => onTicketSelect(i)}
                  aria-label={`Ticket ${i + 1}`}
                >
                  <span className="ac-dot-core" />
                </button>
              ))}
            </div>

            <button
              ref={rightNavRef}
              className="ac-nav-btn ac-nav-right"
              disabled={isControlDisabled || mode !== 'ticket'}
              onClick={onAdvance}
              aria-label={isLastTicket ? 'Enter scatter' : 'Next ticket'}
            >
              <svg className="ac-nav-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.29302 3.29289C7.68354 2.90237 8.31655 2.90237 8.70708 3.29289L15.293 9.87883C16.4644 11.0504 16.4644 12.9495 15.293 14.121L8.70708 20.707C8.31655 21.0975 7.68354 21.0975 7.29302 20.707C6.90249 20.3164 6.90249 19.6834 7.29302 19.2929L13.879 12.707C14.2693 12.3165 14.2693 11.6834 13.879 11.2929L7.29302 4.70696C6.90249 4.31643 6.90249 3.68342 7.29302 3.29289Z" fill="currentColor" />
              </svg>
            </button>
          </div>

          <div className="ac-icon-wrap" ref={restartRef}>
            <button
              className="ac-icon-btn"
              disabled={isControlDisabled || mode !== 'restart'}
              onClick={onRestart}
              aria-label="Restart"
            >
              <svg className="ac-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.9141 7.6377C18.1794 8.12183 18.0026 8.72954 17.5186 8.99512C17.0344 9.26073 16.4258 9.08285 16.1602 8.59863L14.4249 5.43457C14.4089 5.48373 14.3923 5.53345 14.376 5.58398C13.9386 6.94403 13.4213 8.77809 13.0879 10.6963C12.9605 11.4295 12.8619 12.1651 12.8038 12.8838C14.3655 12.809 15.9277 12.8563 17.2999 13.1299C19.1715 13.5031 20.9779 14.3601 21.6739 16.2109C22.1023 17.3507 22.1036 18.43 21.7042 19.3643C21.3102 20.2854 20.5756 20.9531 19.7344 21.3789C18.0823 22.2152 15.8252 22.2278 14.0225 21.2881C12.1394 20.3062 11.2582 18.479 10.9229 16.5293C10.8409 16.0522 10.7891 15.5592 10.7637 15.0566C8.88155 15.2696 7.07291 15.6116 5.6983 15.9121C4.9592 16.0737 4.34886 16.2224 3.92486 16.3301C3.71293 16.3839 3.54702 16.4271 3.4356 16.457C3.38032 16.4719 3.33841 16.4836 3.3106 16.4912C3.29667 16.495 3.28599 16.4982 3.27935 16.5C3.27625 16.5009 3.27398 16.5015 3.27252 16.502H3.27057C2.7389 16.6514 2.18661 16.3412 2.03717 15.8096C1.88805 15.278 2.19805 14.7266 2.72955 14.5771L3.00006 15.5391C2.73289 14.5886 2.72931 14.5774 2.72955 14.5771L2.73053 14.5762C2.73121 14.576 2.73232 14.5755 2.73346 14.5752C2.73573 14.5746 2.73919 14.5744 2.74322 14.5732C2.75169 14.5709 2.7645 14.5669 2.78033 14.5625C2.81198 14.5538 2.85847 14.5414 2.91803 14.5254C3.03751 14.4933 3.2117 14.4477 3.43267 14.3916C3.87492 14.2793 4.50666 14.125 5.27057 13.958C6.74431 13.6358 8.72322 13.2626 10.7862 13.042C10.8458 12.1363 10.9653 11.228 11.1172 10.3535C11.4718 8.31341 12.0174 6.38444 12.4717 4.97168C12.4751 4.96126 12.4782 4.95079 12.4815 4.94043L9.55572 6.33398C9.05717 6.57143 8.46026 6.3598 8.22271 5.86133C7.98525 5.36274 8.19681 4.76583 8.69537 4.52832L14.6524 1.69141L17.9141 7.6377ZM16.9092 15.0908C15.7048 14.8506 14.2644 14.807 12.7579 14.8867C12.7783 15.3393 12.8223 15.7758 12.8936 16.1904C13.1699 17.7973 13.8238 18.9288 14.9473 19.5146C16.188 20.1614 17.7643 20.1347 18.8311 19.5947C19.3494 19.3324 19.6947 18.9769 19.8653 18.5781C20.0302 18.1925 20.0798 17.6544 19.8018 16.915L16.9092 15.0908Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnimationController
