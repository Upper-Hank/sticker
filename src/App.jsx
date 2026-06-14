import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cells, getCellConfig } from './data/gridConfig'
import tickets from './data/tickets.json'
import Card from './components/Card/Card'
import Graphic from './components/Graphic/Graphic'
import Ticket from './components/Ticket/Ticket'
import './App.css'

gsap.registerPlugin(ScrollTrigger)

function App() {
  const appRef = useRef(null)
  const stageRef = useRef(null)
  const gridPanelRef = useRef(null)
  const gridRef = useRef(null)
  const gridWrapperRef = useRef(null)
  const ticketRightRef = useRef(null)
  const ticketStageRef = useRef(null)
  const stackRefs = useRef([])
  const scatterRef = useRef(null)
  const scatterGraphicsRef = useRef([])
  const logoRef = useRef(null)

  const totalScroll = 12000
  const gridW = 2920

  useLayoutEffect(() => {
    const gridPanel = gridPanelRef.current
    const grid = gridRef.current
    const gridWrapper = gridWrapperRef.current
    const stage = stageRef.current
    const rightPanel = ticketRightRef.current
    const ticketStage = ticketStageRef.current
    if (!gridPanel || !grid || !gridWrapper || !stage || !rightPanel || !ticketStage) return

    const ctx = gsap.context(() => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const ticketX = Math.round((vw - 1280) / 2)
      const ticketY = Math.round((vh - 520) / 2)
      const stackItems = stackRefs.current.filter(Boolean)
      const firstTicket = stackItems[0]

      gsap.set(stackItems, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        autoAlpha: 0,
      })
      gsap.set(ticketStage, { autoAlpha: 0 })
      gsap.set(scatterRef.current, { display: 'none' })
      gsap.set(logoRef.current, { autoAlpha: 0, y: 20 })
      gsap.set(stage, {
        backgroundColor: '#E2DFD0',
        '--ticket-x': `${ticketX}px`,
        '--ticket-y': `${ticketY}px`,
      })

      /* ===== Phase 0: Card Intro ===== */
      const cards = gsap.utils.toArray('.grid .card')
      const shuffled = gsap.utils.shuffle([...cards])

      gsap.set(shuffled, { autoAlpha: 0, scale: 0 })

      const introTl = gsap.timeline({ defaults: { ease: 'back.out(1.7)' } })

      shuffled.forEach((card, i) => {
        const t = i * 0.07
        introTl.to(card, { autoAlpha: 1, scale: 1, duration: 0.55 }, t)

        const paths = card.querySelectorAll('.graphic-path')
        paths.forEach((path) => {
          const len = path.getTotalLength()
          gsap.set(path, {
            autoAlpha: 0,
            strokeDasharray: `${len} ${len * 2}`,
            strokeDashoffset: len,
          })
          introTl.set(path, { autoAlpha: 1, overwrite: false }, t + 0.145)
          introTl.to(path, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' }, t + 0.1)
        })
      })

      const master = gsap.timeline({
        scrollTrigger: {
          trigger: appRef.current,
          start: 'top top',
          end: `+=${totalScroll}`,
          pin: true,
          scrub: 0.6,
        },
        defaults: { ease: 'none' },
      })

      const selectCell = grid.querySelector('[data-cell="R2C5"]')
      const selectedCard = selectCell?.querySelector('.card')
      const selectedGraphic = selectCell?.querySelector('.graphic')
      const firstTicketCard = firstTicket?.querySelector('.ticket-left .card')
      const firstTicketLeft = firstTicket?.querySelector('.ticket-left')
      const cellLeft = selectCell?.offsetLeft ?? 0
      const cellTop = selectCell?.offsetTop ?? 0
      const cellW = selectCell?.offsetWidth ?? 0
      const cellH = selectCell?.offsetHeight ?? 0
      const selectedCellCenterX = cellLeft + cellW / 2
      const maxScrollX = Math.max(0, gridW - vw)
      const scrollX = selectCell
        ? gsap.utils.clamp(0, maxScrollX, selectedCellCenterX - vw / 2)
        : Math.max(0, gridW - vw + 100)

      /* ===== Phase 1: Horizontal Grid ===== */
      master.to(grid, { x: -scrollX })

      /* ===== Transition: Grid → Ticket ===== */
      master.addLabel('transition')

      if (selectCell && selectedCard && selectedGraphic && firstTicket && firstTicketCard && firstTicketLeft) {
        const cardTargetSize = 480
        const leftTargetRect = firstTicketLeft.getBoundingClientRect()
        const cardTargetRect = firstTicketCard.getBoundingClientRect()
        const cardTargetLeftInPanel = cardTargetRect.left - leftTargetRect.left
        const cardTargetTopInPanel = cardTargetRect.top - leftTargetRect.top
        const finalCardLeftInGrid = cellLeft + (cellW - cardTargetSize) / 2
        const finalCardTopInGrid = cellTop + (cellH - cardTargetSize) / 2
        const gridTargetX = cardTargetLeftInPanel - finalCardLeftInGrid
        const gridTargetY = cardTargetTopInPanel - finalCardTopInGrid
        const panelTargetLeft = leftTargetRect.left
        const panelTargetTop = leftTargetRect.top

        master
          .to('[data-cell]:not([data-cell="R2C5"])', { autoAlpha: 0, duration: 0.12 }, 'transition')
          .to(gridPanel, {
            left: panelTargetLeft,
            top: panelTargetTop,
            width: leftTargetRect.width,
            height: leftTargetRect.height,
            borderRadius: 32,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 'transition+=0.04')
          .to(grid, {
            x: gridTargetX,
            y: gridTargetY,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 'transition+=0.04')
          .to(selectedCard, {
            width: cardTargetSize,
            height: cardTargetSize,
            borderRadius: 24,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 'transition+=0.04')
          .set(rightPanel, { display: 'flex' }, 'transition+=0.28')
          .fromTo(rightPanel, { x: vw }, { x: 0, duration: 0.28, ease: 'power3.out' }, 'transition+=0.28')
          .set(ticketStage, { autoAlpha: 1 }, 'transition+=0.58')
          .set(firstTicket, { autoAlpha: 1, zIndex: 1 }, 'transition+=0.58')
          .to([gridPanel, rightPanel], { autoAlpha: 0, duration: 0.08 }, 'transition+=0.62')

        /* ===== Phase 2: Ticket Stack ===== */
        master
          .addLabel('tickets')
          .set(ticketStage, { autoAlpha: 1 }, 'tickets')

        stackItems.slice(1).forEach((ticket, i) => {
          const prev = stackItems[i]
          const label = `ticket${i + 2}`
          const startAt = i === 0 ? 'tickets+=0.28' : `ticket${i + 1}+=0.72`
          master
            .addLabel(label, startAt)
            .fromTo(
              ticket,
              { autoAlpha: 0, y: vh * 0.18, rotation: 0, scale: 1 },
              {
                autoAlpha: 1,
                y: 0,
                rotation: 0,
                scale: 1,
                duration: 0.24,
                ease: 'power3.out',
                immediateRender: false,
              },
              label
            )
            .to(prev, {
              rotation: i % 2 === 0 ? gsap.utils.random(-7, -3) : gsap.utils.random(3, 7),
              x: gsap.utils.random(-22, 22),
              y: gsap.utils.random(10, 30),
              scale: 0.93,
              duration: 0.16,
              ease: 'power2.out',
            }, `${label}+=0.02`)
        })
      }

      /* ===== Phase 3: Scatter ===== */
      master
        .addLabel('scatter', 'ticket5+=2.1')
        .to([gridPanel, rightPanel], { autoAlpha: 0, duration: 0.15 }, 'scatter')
        .to(ticketStageRef.current, { autoAlpha: 0, duration: 0.18 }, 'scatter')
        .to('.ticket-stack-item', { autoAlpha: 0, duration: 0.18 }, 'scatter')
        .set(scatterRef.current, { display: 'flex' }, 'scatter+=0.18')

      const graphics = scatterGraphicsRef.current.filter(Boolean)
      graphics.forEach((el, i) => {
        master.fromTo(
          el,
          { autoAlpha: 0, y: 40, scale: 0.5 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.24 },
          `scatter+=${0.27 + i * 0.135}`
        )
      })

      const logo = logoRef.current
      if (logo) {
        master.fromTo(logo, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.18 }, 'scatter+=1.02')
      }
    }, appRef)

    return () => ctx.revert()
  }, [])

  const pressMapRef = useRef(new WeakMap())
  const animationMapRef = useRef(new WeakMap())
  const pendingPressMapRef = useRef(new WeakMap())
  const eraseDuration = 0.6
  const quickPressThreshold = 280
  const drawRevealDelay = 0.045
  const eraseHideLead = 0.025

  const getGraphicPaths = (card) => (
    Array.from(card.querySelectorAll('.graphic-path')).map((path) => {
      const len = path.getTotalLength()
      const dash = `${len} ${len * 2}`

      return { path, len, dash }
    })
  )

  const setGraphicVisible = (pathData) => {
    pathData.forEach(({ path, dash }) => {
      gsap.set(path, {
        autoAlpha: 1,
        strokeDasharray: dash,
        strokeDashoffset: 0,
      })
    })
  }

  const setGraphicHiddenForDraw = (pathData) => {
    pathData.forEach(({ path, len, dash }) => {
      gsap.set(path, {
        autoAlpha: 0,
        strokeDasharray: dash,
        strokeDashoffset: len,
      })
    })
  }

  const addGraphicErase = (tl, pathData, at = 0, duration = 0.6) => {
    pathData.forEach(({ path, len }) => {
      tl.to(path, {
        strokeDashoffset: -len,
        duration,
        ease: 'power2.inOut',
      }, at)
    })
  }

  const addGraphicDraw = (tl, pathData, at = 0, duration = 0.4) => {
    tl.set(pathData.map(({ path }) => path), { autoAlpha: 1, overwrite: false }, at + drawRevealDelay)
    pathData.forEach(({ path }) => {
      tl.to(path, {
        strokeDashoffset: 0,
        duration,
        ease: 'power2.inOut',
      }, at)
    })
  }

  const startPressAnimation = (card) => {
    gsap.killTweensOf(card)

    const pathData = getGraphicPaths(card)
    pathData.forEach(({ path }) => gsap.killTweensOf(path))
    setGraphicVisible(pathData)

    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })
    tl.to(card, { scale: 1.18, duration: eraseDuration, ease: 'power2.out' }, 0)
    addGraphicErase(tl, pathData, 0, eraseDuration)
    tl.set(pathData.map(({ path }) => path), { autoAlpha: 0, overwrite: false }, eraseDuration - eraseHideLead)

    pressMapRef.current.set(card, { tl, pathData, startTime: Date.now() })
    animationMapRef.current.set(card, tl)
  }

  const handlePointerDown = (e) => {
    const card = e.currentTarget

    if (animationMapRef.current.has(card)) {
      pendingPressMapRef.current.set(card, { pointerId: e.pointerId })
      return
    }

    startPressAnimation(card)
  }

  const handlePointerUp = (e) => {
    const card = e.currentTarget
    const pendingPress = pendingPressMapRef.current.get(card)

    if (pendingPress?.pointerId === e.pointerId) {
      pendingPressMapRef.current.delete(card)
      return
    }

    const state = pressMapRef.current.get(card)
    if (!state) return
    pressMapRef.current.delete(card)

    state.tl.kill()
    const elapsed = Date.now() - state.startTime
    const remainingErase = Math.max(0, eraseDuration - elapsed / 1000)
    const isQuickPress = elapsed < quickPressThreshold
    const releaseEraseDuration = isQuickPress
      ? Math.min(0.24, remainingErase * 0.52)
      : remainingErase
    const drawStart = releaseEraseDuration + 0.025
    const paths = state.pathData.map(({ path }) => path)

    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => {
        if (animationMapRef.current.get(card) === tl) {
          animationMapRef.current.delete(card)
        }

        if (pendingPressMapRef.current.has(card)) {
          pendingPressMapRef.current.delete(card)
          startPressAnimation(card)
        }
      },
    })
    animationMapRef.current.set(card, tl)

    if (releaseEraseDuration > 0.02) {
      tl.to(card, { scale: 1.18, duration: releaseEraseDuration, ease: 'power2.out' }, 0)
      addGraphicErase(tl, state.pathData, 0, releaseEraseDuration)
    }

    tl.set(paths, { autoAlpha: 0, overwrite: false }, Math.max(0, releaseEraseDuration - eraseHideLead))
    tl.add(() => setGraphicHiddenForDraw(state.pathData), drawStart)
    addGraphicDraw(tl, state.pathData, drawStart, 0.4)
    tl.to(card, { scale: 1, duration: 0.46, ease: 'back.out(2.1)' }, drawStart)
  }

  const handlePointerLeave = (e) => {
    handlePointerUp(e)
  }

  const setStackRef = (i) => (el) => { stackRefs.current[i] = el }
  const setScatterRef = (i) => (el) => { scatterGraphicsRef.current[i] = el }

  return (
    <div className="app" ref={appRef}>
      <div className="stage" ref={stageRef}>

        {/* ===== Grid ===== */}
        <div className="grid-panel" ref={gridPanelRef}>
          <div className="grid-wrapper" ref={gridWrapperRef}>
            <div className="grid" ref={gridRef}>
              {cells.map((cell) => {
                const cfg = getCellConfig(cell.key)
                return (
                  <div
                    key={cell.key}
                    className="grid-cell"
                    style={{ gridRow: cell.row, gridColumn: cell.col }}
                    data-cell={cell.key}
                  >
                    {cfg.type !== 'empty' && cfg.type !== 'placeholder' && (
                      <Card
                        bgColor={cfg.bgColor}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerLeave}
                      >
                        <Graphic name={cfg.graphic} />
                      </Card>
                    )}
                    {cfg.type === 'placeholder' && <Card bgColor="#BBBBBB" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ===== Right Panel ===== */}
        <div className="ticket-right-panel" ref={ticketRightRef}>
          <div className="ticket-head">
            <span className="ticket-title">{tickets[0].title}</span>
            <span className="ticket-letter">{tickets[0].letter}</span>
          </div>
          <div className="ticket-content">
            <div className="ticket-intro">
              {tickets[0].intro.map((l, i) => (
                <span key={i} className="ticket-intro-line">{l}</span>
              ))}
            </div>
            <div className="ticket-logo">
              <Graphic name={tickets[0].logo} size={60} />
            </div>
          </div>
        </div>

        {/* ===== Stack Tickets ===== */}
        <div className="ticket-stack-area" ref={ticketStageRef}>
          {tickets.map((ticket, i) => (
            <div
              key={ticket.id}
              className="ticket-stack-item"
              ref={setStackRef(i)}
              style={{ zIndex: i + 1 }}
            >
              <Ticket data={ticket} />
            </div>
          ))}
        </div>

        {/* ===== Scatter ===== */}
        <div className="scatter-area" ref={scatterRef}>
          <div className="scatter-letters">
            {['U', 'P', 'P', 'E', 'R'].map((letter, i) => (
              <div className="scatter-graphic" key={`${letter}-${i}`} ref={setScatterRef(i)}>
                <Graphic name={tickets[i].graphic} size={200} />
              </div>
            ))}
          </div>
          <div className="scatter-logo" ref={logoRef}>
            <Graphic name="logo" size={24} />
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
