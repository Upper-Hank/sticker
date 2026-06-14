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
      const scrollX = Math.max(0, gridW - vw + 100)
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

      /* ===== Phase 1: Horizontal Grid ===== */
      master.to(grid, { x: -scrollX })

      /* ===== Transition: Grid → Ticket ===== */
      master.addLabel('transition')

      const selectCell = grid.querySelector('[data-cell="R2C5"]')
      const selectedCard = selectCell?.querySelector('.card')
      const selectedGraphic = selectCell?.querySelector('.graphic')
      const firstTicketCard = firstTicket?.querySelector('.ticket-left .card')
      const firstTicketLeft = firstTicket?.querySelector('.ticket-left')

      if (selectCell && selectedCard && selectedGraphic && firstTicket && firstTicketCard && firstTicketLeft) {
        const cellLeft = selectCell.offsetLeft
        const cellTop = selectCell.offsetTop
        const cellW = selectCell.offsetWidth
        const cellH = selectCell.offsetHeight
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
          .to('[data-cell]:not([data-cell="R2C5"])', { autoAlpha: 0, duration: 0.06 }, 'transition')
          .to(gridPanel, {
            left: panelTargetLeft,
            top: panelTargetTop,
            width: leftTargetRect.width,
            height: leftTargetRect.height,
            borderRadius: 32,
            duration: 0.24,
            ease: 'power3.inOut',
          }, 'transition+=0.02')
          .to(grid, {
            x: gridTargetX,
            y: gridTargetY,
            duration: 0.24,
            ease: 'power3.inOut',
          }, 'transition+=0.02')
          .to(selectedCard, {
            width: cardTargetSize,
            height: cardTargetSize,
            borderRadius: 24,
            duration: 0.24,
            ease: 'power3.inOut',
          }, 'transition+=0.02')
          .set(rightPanel, { display: 'flex' }, 'transition+=0.14')
          .fromTo(rightPanel, { x: vw }, { x: 0, duration: 0.14, ease: 'power3.out' }, 'transition+=0.14')
          .set(ticketStage, { autoAlpha: 1 }, 'transition+=0.29')
          .set(firstTicket, { autoAlpha: 1, zIndex: 1 }, 'transition+=0.29')
          .to([gridPanel, rightPanel], { autoAlpha: 0, duration: 0.04 }, 'transition+=0.31')

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
        .addLabel('scatter', 'ticket5+=1.05')
        .to([gridPanel, rightPanel], { autoAlpha: 0, duration: 0.05 }, 'scatter')
        .to(ticketStageRef.current, { autoAlpha: 0, duration: 0.06 }, 'scatter')
        .to('.ticket-stack-item', { autoAlpha: 0, duration: 0.06 }, 'scatter')
        .set(scatterRef.current, { display: 'flex' }, 'scatter+=0.06')

      const graphics = scatterGraphicsRef.current.filter(Boolean)
      graphics.forEach((el, i) => {
        master.fromTo(
          el,
          { autoAlpha: 0, y: 40, scale: 0.5 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.08 },
          `scatter+=${0.09 + i * 0.045}`
        )
      })

      const logo = logoRef.current
      if (logo) {
        master.fromTo(logo, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 'scatter+=0.34')
      }
    }, appRef)

    return () => ctx.revert()
  }, [])

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
                      <Card bgColor={cfg.bgColor}>
                        <Graphic name={cfg.graphic} />
                      </Card>
                    )}
                    {cfg.type === 'placeholder' && <Card variant="placeholder" />}
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
