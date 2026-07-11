import { useCallback, useEffect, useRef, useLayoutEffect, useMemo, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { cells, getCellConfig, textBlocks, selectedCard as selectedCardKey } from './data/gridConfig'
import tickets from './data/tickets.json'
import articlesByTicketId from './articles/registry'
import Card from './components/Card/Card'
import Graphic from './components/Graphic/Graphic'
import Ticket from './components/Ticket/Ticket'
import AnimationController from './components/AnimationController/AnimationController'
import MobileView from './components/MobileView/MobileView'
import FollowArticleTransition from './components/FollowArticleTransition/FollowArticleTransition'
import DirectArticle from './articles/DirectArticle'
import { getArticleIndex, getArticlePath, isKnownPath } from './utils/routes'
import { useAnimationState } from './hooks/useAnimationState'
import { useIsMobile } from './hooks/useIsMobile'
import { getPathLength } from './utils/pathCache'
import { createCardInteraction } from './animations/cardInteraction'
import './App.css'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, Draggable, InertiaPlugin)

const WHEEL_SENSITIVITY = 0.00045
// Keep the grid noticeably trailing the wheel/touchpad target. A larger value
// converges so quickly on high-resolution trackpads that the damping disappears.
const PROGRESS_EASE = 0.08
const READY_PROGRESS = 0.995

function App() {
  const isMobile = useIsMobile()
  const [directArticleIndex, setDirectArticleIndex] = useState(() => getArticleIndex())

  useEffect(() => {
    if (!isKnownPath()) window.history.replaceState({ route: 'home' }, '', '/')

    const syncRoute = () => setDirectArticleIndex(getArticleIndex())
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  if (directArticleIndex >= 0 && !window.history.state?.inAppArticle) {
    const ticket = tickets[directArticleIndex]
    return <DirectArticle article={articlesByTicketId[ticket.id]} />
  }

  if (isMobile) {
    return <MobileView />
  }

  return <DesktopApp />
}

function DesktopApp() {
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
  const draggableInstancesRef = useRef([])
  const draggableInitedRef = useRef(false)
  const scatterPositionsRef = useRef([])
  const dragZIndexRef = useRef(0)

  const {
    phase, gridProgress, ticketIndex, isAnimating,
    stateRef,
    setPhase, setGridProgress, setTicketIndex, setIsAnimating,
    setReady,
  } = useAnimationState()

  const [visualTicketIndex, setVisualTicketIndex] = useState(0)
  const [articleIndex, setArticleIndex] = useState(null)
  const [articleProgress, setArticleProgress] = useState(0)
  const [articleTransition, setArticleTransition] = useState(null)
  const [isArticleClosing, setIsArticleClosing] = useState(false)
  const articleTransitionApiRef = useRef(null)
  const pendingArticleRef = useRef(null)

  const cardInteraction = useMemo(() => createCardInteraction(), [])
  const cardInteractionProps = useMemo(() => ({
    onPointerDown: (event) => {
      const current = stateRef.current
      if (current.isAnimating || (current.phase !== 'grid' && current.phase !== 'ticket')) return
      cardInteraction.onPointerDown(event)
    },
    onPointerUp: cardInteraction.onPointerUp,
    onPointerCancel: cardInteraction.onPointerCancel,
  }), [cardInteraction, stateRef])

  const stepTimelinesRef = useRef([])
  const introTlRef = useRef(null)
  const scrollBaseRef = useRef(0)
  const apiRef = useRef({})

  const totalScroll = 12000
  useLayoutEffect(() => {
    window.scrollTo(0, 0)

    const gridPanel = gridPanelRef.current
    const grid = gridRef.current
    const gridWrapper = gridWrapperRef.current
    const stage = stageRef.current
    const rightPanel = ticketRightRef.current
    const ticketStage = ticketStageRef.current
    if (!gridPanel || !grid || !gridWrapper || !stage || !rightPanel || !ticketStage) return

    let stInstance = null
    let handleWheel = null
    let ticker = null
    let resizeObserver = null
    let resizeFrame = null
    let resizeEndTimer = null
    let scheduleLayoutRefresh = null
    let isScrollReady = false

    const ctx = gsap.context(() => {
      const stackItems = stackRefs.current.filter(Boolean)
      const firstTicket = stackItems[0]
      const selectCell = grid.querySelector(`[data-cell="${selectedCardKey}"]`)
      const selectedCard = selectCell?.querySelector('.card')
      const selectedGraphic = selectCell?.querySelector('.graphic')
      const firstTicketCard = firstTicket?.querySelector('.ticket-left .card')
      const firstTicketLeft = firstTicket?.querySelector('.ticket-left')
      const layout = {
        vw: stage.clientWidth,
        vh: stage.clientHeight,
        stepGridTargetX: 0,
        gridTargetX: 0,
        gridTargetY: 0,
        panelTargetLeft: 0,
        panelTargetTop: 0,
        panelTargetWidth: 0,
        panelTargetHeight: 0,
        cardStartSize: 320,
        cardTargetSize: 480,
      }

      const measureLayout = () => {
        layout.vw = stage.clientWidth
        layout.vh = stage.clientHeight

        const cellLeft = selectCell?.offsetLeft ?? 0
        const cellTop = selectCell?.offsetTop ?? 0
        const cellW = selectCell?.offsetWidth ?? 0
        const cellH = selectCell?.offsetHeight ?? 0
        const selectedCellCenterX = cellLeft + cellW / 2
        const maxScrollX = Math.max(0, grid.scrollWidth - layout.vw)
        const scrollX = selectCell
          ? gsap.utils.clamp(0, maxScrollX, selectedCellCenterX - layout.vw / 2)
          : maxScrollX
        const styles = getComputedStyle(stage)
        const configuredCardSize = Number.parseFloat(styles.getPropertyValue('--grid-card-size'))
        const leftTargetRect = firstTicketLeft?.getBoundingClientRect()
        const cardTargetRect = firstTicketCard?.getBoundingClientRect()

        layout.stepGridTargetX = -scrollX
        layout.cardStartSize = configuredCardSize || 320

        if (leftTargetRect && cardTargetRect) {
          layout.cardTargetSize = cardTargetRect.width
          layout.panelTargetLeft = leftTargetRect.left
          layout.panelTargetTop = leftTargetRect.top
          layout.panelTargetWidth = leftTargetRect.width
          layout.panelTargetHeight = leftTargetRect.height
          layout.gridTargetX = cardTargetRect.left - leftTargetRect.left
            - (cellLeft + (cellW - cardTargetRect.width) / 2)
          layout.gridTargetY = cardTargetRect.top - leftTargetRect.top
            - (cellTop + (cellH - cardTargetRect.height) / 2)
        }
      }

      measureLayout()

      gsap.set(stackItems, {
        x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 0,
      })
      gsap.set(ticketStage, { autoAlpha: 0 })
      gsap.set(scatterRef.current, { display: 'none' })
      gsap.set(stage, {
        backgroundColor: '#E2DFD0',
      })

      /* ===== Phase 0: Card Intro (plays on mount) ===== */
      const cards = gsap.utils.toArray('.grid .card')
      const shuffled = gsap.utils.shuffle([...cards])

      gsap.set(shuffled, { autoAlpha: 0, scale: 0 })

      const introTl = gsap.timeline({
        defaults: { ease: 'back.out(1.7)' },
        onComplete() {
          scrollBaseRef.current = window.scrollY
          revealVisibleTextBlocks()
        },
      })
      introTlRef.current = introTl

      shuffled.forEach((card, i) => {
        const t = i * 0.04
        introTl.set(card, { willChange: 'transform, opacity' }, t)
        introTl.to(card, { autoAlpha: 1, scale: 1, duration: 0.55 }, t)

        const paths = card.querySelectorAll('.graphic-path')
        paths.forEach((path) => {
          const len = getPathLength(path)
          gsap.set(path, {
            autoAlpha: 0,
            strokeDasharray: `${len} ${len}`,
            strokeDashoffset: len,
          })
          introTl.fromTo(path, {
            strokeDashoffset: len,
          }, {
            strokeDashoffset: 0,
            duration: 0.55,
            ease: 'power2.inOut',
            immediateRender: false,
          }, t + 0.18)
          // Round line caps leave a visible endpoint at dashoffset === length.
          // Reveal only after the dash has advanced past that endpoint.
          introTl.set(path, { autoAlpha: 1, overwrite: false }, t + 0.22)
        })

        introTl.set(card, { willChange: 'auto', clearProps: 'willChange' }, t + 0.8)
      })

      const textBlocksEls = gsap.utils.toArray('.grid-text')
      let revealedTextBlocks = new WeakSet()
      let hasStartedScrolling = false

      gsap.set('.grid-text-word', { autoAlpha: 0, y: 8 })

      const revealVisibleTextBlocks = () => {
        textBlocksEls.forEach((block) => {
          if (revealedTextBlocks.has(block)) return

          const rect = block.getBoundingClientRect()
          const isVisible = (
            rect.left < layout.vw
            && rect.right > 0
            && rect.top < layout.vh
            && rect.bottom > 0
          )
          if (!isVisible) return

          revealedTextBlocks.add(block)
          gsap.to(block.querySelectorAll('.grid-text-word'), {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.05,
            ease: 'power2.out',
          })
        })
      }

      /* ===== Target cell & layout values ===== */
      /* ===== Phase 1 Horizontal state ===== */
      const horizontalState = {
        targetProgress: 0,
        currentProgress: 0,
        progress: 0,
      }
      let lastReportedGridProgress = -1
      const GRID_PROGRESS_THRESHOLD = 0.005

      const setHorizontalBase = (progress) => {
        horizontalState.targetProgress = progress
        horizontalState.currentProgress = progress
        horizontalState.progress = progress
      }

      const stopHorizontalDamping = () => {
        lastReportedGridProgress = -1
      }

      const renderHorizontalGrid = (nextProgress) => {
        horizontalState.progress = nextProgress
        gsap.set(grid, { y: 0, x: layout.stepGridTargetX * nextProgress })
        if (hasStartedScrolling) revealVisibleTextBlocks()
        return nextProgress
      }

      const setHorizontalTarget = (progress) => {
        horizontalState.targetProgress = gsap.utils.clamp(0, 1, progress)
      }

      /* ===== tl1to2: Grid -> Ticket transition ===== */
      const tl1to2 = gsap.timeline({ paused: true })

      if (selectCell && selectedCard && selectedGraphic && firstTicket && firstTicketCard && firstTicketLeft) {
        tl1to2
          .set([gridPanel, selectedCard], { willChange: 'transform, width, height, border-radius, opacity' }, 0)
          .to(`[data-cell]:not([data-cell="${selectedCardKey}"]), .grid-text`, { autoAlpha: 0, duration: 0.12 }, 0)
          .to(gridPanel, {
            left: () => layout.panelTargetLeft,
            top: () => layout.panelTargetTop,
            width: () => layout.panelTargetWidth,
            height: () => layout.panelTargetHeight,
            borderRadius: 32,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 0.04)
          .to(grid, {
            x: () => layout.gridTargetX,
            y: () => layout.gridTargetY,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 0.04)
          .fromTo(selectedCard, {
            width: () => layout.cardStartSize,
            height: () => layout.cardStartSize,
            borderRadius: 20,
          }, {
            width: () => layout.cardTargetSize,
            height: () => layout.cardTargetSize,
            borderRadius: 24,
            duration: 0.48,
            ease: 'power3.inOut',
            immediateRender: false,
          }, 0.04)
          .call(() => { rightPanel.style.display = 'flex' }, [], 0.28)
          .set(rightPanel, { autoAlpha: 1, willChange: 'transform' }, 0.28)
          .fromTo(rightPanel, { x: () => layout.vw }, { x: 0, duration: 0.28, ease: 'power3.out' }, 0.28)
          .fromTo(ticketStage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0.58)
          .fromTo(firstTicket, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0.58)
          .to([gridPanel, rightPanel], { autoAlpha: 0, duration: 0.08 }, 0.62)
          .set([gridPanel, rightPanel, selectedCard], { willChange: 'auto', clearProps: 'willChange' }, 0.7)
      }

      tl1to2.eventCallback('onReverseComplete', () => {
        rightPanel.style.display = ''
        gsap.set(rightPanel, { clearProps: 'x' })
      })

      /* ===== ticketStepTls: Ticket stack ===== */
      const ticketStepTls = []

      const scatterConfigs = stackItems.slice(1).map((_, i) => ({
        rotation: i % 2 === 0 ? gsap.utils.random(-7, -3) : gsap.utils.random(3, 7),
        x: gsap.utils.random(-22, 22),
        y: gsap.utils.random(10, 30),
      }))

      stackItems.slice(1).forEach((ticket, i) => {
        const prev = stackItems[i]
        const cfg = scatterConfigs[i]

        const ticketTl = gsap.timeline({ paused: true })
        ticketTl
          .set([ticket, prev], { willChange: 'transform, opacity' }, 0)
          .fromTo(ticket,
            { autoAlpha: 0, y: () => layout.vh * 0.18 },
            { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power3.out', immediateRender: false },
            0
          )
          .to(prev, {
            rotation: cfg.rotation,
            x: cfg.x,
            y: cfg.y,
            scale: 0.93,
            duration: 0.16,
            ease: 'power2.out',
          }, 0.02)
          .set([ticket, prev], { willChange: 'auto', clearProps: 'willChange' }, 0.18)

        ticketStepTls.push(ticketTl)
      })

      /* ===== tl3to4: Ticket -> Scatter ===== */
      const tl3to4 = gsap.timeline({ paused: true })

      tl3to4
        .to([gridPanel, rightPanel], { autoAlpha: 0, duration: 0.15 }, 0)
        .to(ticketStage, { autoAlpha: 0, duration: 0.18 }, 0)

      const graphics = scatterGraphicsRef.current
        .filter(Boolean)
        .map(el => el.querySelector('.scatter-graphic-inner'))
        .filter(Boolean)

      gsap.set(graphics, { autoAlpha: 0, y: 40, scale: 0.5 })

      const scatterArcY = [0, -24, -52, -24, 0]

      graphics.forEach((el, i) => {
        tl3to4.fromTo(el,
          { autoAlpha: 0, y: 40, scale: 0.5 },
          { autoAlpha: 1, y: scatterArcY[i], scale: 1, duration: 0.24, immediateRender: false },
          0.27 + i * 0.135
        )
      })

      const initDraggable = () => {
        if (!draggableInitedRef.current) {
          draggableInitedRef.current = true
          const els = scatterGraphicsRef.current.filter(Boolean)
          draggableInstancesRef.current = els.map(el =>
            Draggable.create(el, {
              type: 'x,y',
              bounds: scatterRef.current,
              inertia: true,
              edgeResistance: 0.5,
              zIndexBoost: false,
              onDragStart() {
                dragZIndexRef.current += 1
                gsap.set(el, { zIndex: dragZIndexRef.current })
              },
            })
          )
        }
      }

      const killDraggable = () => {
        const els = scatterGraphicsRef.current.filter(Boolean)
        scatterPositionsRef.current = els.map((el) => {
          const transform = getComputedStyle(el).transform
          const matrix = transform === 'none' ? null : new DOMMatrixReadOnly(transform)

          return {
            x: matrix?.m41 ?? 0,
            y: matrix?.m42 ?? 0,
          }
        })

        draggableInstancesRef.current.forEach(d => d[0]?.kill())
        draggableInstancesRef.current = []
        draggableInitedRef.current = false

        els.forEach((el, i) => {
          const pos = scatterPositionsRef.current[i]
          if (pos) gsap.set(el, { x: pos.x, y: pos.y })
        })
      }

      const resetScatterGraphics = () => {
        gsap.set(graphics, { autoAlpha: 0, y: 40, scale: 0.5 })
      }

      const showScatter = () => {
        resetScatterGraphics()
        scatterGraphicsRef.current.filter(Boolean).forEach((el, i) => {
          const pos = scatterPositionsRef.current[i]
          if (pos) gsap.set(el, { x: pos.x, y: pos.y })
        })
        scatterRef.current.style.display = 'flex'
      }

      const resetScatter = () => {
        scatterRef.current.style.display = 'none'
        resetScatterGraphics()
      }

      tl3to4.eventCallback('onStart', showScatter)
      tl3to4.eventCallback('onComplete', initDraggable)
      tl3to4.eventCallback('onReverseComplete', resetScatter)

      stepTimelinesRef.current = [null, tl1to2, ...ticketStepTls, tl3to4]

      /* ===== Animation API functions ===== */
      const playGridToTicket = () => {
        if (stateRef.current.isAnimating) return
        if (stateRef.current.phase !== 'grid' || stateRef.current.gridProgress < READY_PROGRESS) return

        setIsAnimating(true)
        cardInteraction.cancelAll()
        stopHorizontalDamping()

        // The intro also animates the card's scale. Normalize that shared
        // transform state before the transition owns it.
        introTlRef.current?.killTweensOf(selectedCard)
        // Only remove the transform tween owned by the intro interaction.
        // Killing every tween here also removes the paused width/height tween
        // already registered in tl1to2, leaving the card with movement only.
        gsap.killTweensOf(selectedCard, 'scale')

        // Cold loads can reach this transition while the intro still owns the
        // card's transform. Clear that transform completely so the size tween
        // starts from the CSS dimensions instead of a cached GSAP scale.
        gsap.set(selectedCard, {
          width: layout.cardStartSize,
          height: layout.cardStartSize,
          borderRadius: 20,
          clearProps: 'transform',
        })
        selectedCard.getBoundingClientRect()
        tl1to2.invalidate()

        const origComplete = tl1to2.eventCallback('onComplete')
        tl1to2.eventCallback('onComplete', () => {
          tl1to2.eventCallback('onComplete', origComplete)
          if (origComplete) origComplete()
          setPhase('ticket')
          setTicketIndex(0)
          setVisualTicketIndex(0)
          setIsAnimating(false)
        })
        requestAnimationFrame(() => tl1to2.play(0))
      }

      const reverseGridToTicket = () => {
        if (stateRef.current.isAnimating) return
        if (stateRef.current.phase !== 'ticket' || stateRef.current.ticketIndex !== 0) return

        setIsAnimating(true)
        cardInteraction.cancelAll()

        const origReverse = tl1to2.eventCallback('onReverseComplete')
        tl1to2.eventCallback('onReverseComplete', () => {
          tl1to2.eventCallback('onReverseComplete', origReverse)
          if (origReverse) origReverse()
          setReady()
          setHorizontalBase(1)
        })
        tl1to2.reverse(tl1to2.duration())
      }

      const goToTicket = (targetIndex) => {
        if (stateRef.current.isAnimating) return
        if (stateRef.current.phase !== 'ticket') return
        if (targetIndex === stateRef.current.ticketIndex) return
        if (targetIndex < 0 || targetIndex > 4) return

        setIsAnimating(true)
        cardInteraction.cancelAll()

        const step = (current) => {
          if (current === targetIndex) {
            setTicketIndex(targetIndex)
            setVisualTicketIndex(targetIndex)
            setIsAnimating(false)
            return
          }

          if (current < targetIndex) {
            setVisualTicketIndex(current + 1)
            const tl = ticketStepTls[current]
            const orig = tl.eventCallback('onComplete')
            tl.eventCallback('onComplete', () => {
              tl.eventCallback('onComplete', orig)
              if (orig) orig()
              setTicketIndex(current + 1)
              step(current + 1)
            })
            tl.play(0)
          } else {
            setVisualTicketIndex(current - 1)
            const tl = ticketStepTls[current - 1]
            const orig = tl.eventCallback('onReverseComplete')
            tl.eventCallback('onReverseComplete', () => {
              tl.eventCallback('onReverseComplete', orig)
              if (orig) orig()
              setTicketIndex(current - 1)
              step(current - 1)
            })
            tl.reverse(tl.duration())
          }
        }

        step(stateRef.current.ticketIndex)
      }

      const playScatter = () => {
        if (stateRef.current.isAnimating) return
        if (stateRef.current.phase !== 'ticket' || stateRef.current.ticketIndex !== 4) return

        setIsAnimating(true)
        cardInteraction.cancelAll()

        const origComplete = tl3to4.eventCallback('onComplete')
        tl3to4.eventCallback('onComplete', () => {
          tl3to4.eventCallback('onComplete', origComplete)
          if (origComplete) origComplete()
          setPhase('scatter')
          setIsAnimating(false)
        })
        tl3to4.play(0)
      }

      const restartToStart = () => {
        if (stateRef.current.isAnimating) return
        if (stateRef.current.phase !== 'scatter') return

        setIsAnimating(true)
        cardInteraction.cancelAll()
        killDraggable()

        const scatterEls = scatterGraphicsRef.current.filter(Boolean)
        const innerGraphics = scatterEls
          .map(el => el.querySelector('.scatter-graphic-inner'))
          .filter(Boolean)

        const resetGridForIntro = () => {
          stopHorizontalDamping()

          tl1to2.pause(0)
          tl1to2.invalidate()
          ticketStepTls.forEach(tl => tl.pause(0))
          tl3to4.pause(0)

          scatterRef.current.style.display = 'none'
          gsap.set(graphics, { autoAlpha: 0, y: 40, scale: 0.5 })
          scatterEls.forEach(el => gsap.set(el, { x: 0, y: 0, zIndex: 'auto' }))
          scatterPositionsRef.current = []

          gsap.set(gridPanel, { clearProps: 'left,top,width,height,borderRadius,opacity,visibility' })
          gsap.set(gridPanel, { autoAlpha: 1 })
          gsap.set('[data-cell]', { clearProps: 'opacity,visibility' })
          gsap.set(grid, { x: 0, y: 0 })
          gsap.set(rightPanel, { clearProps: 'x,opacity,visibility', display: '' })
          gsap.set(ticketStage, { autoAlpha: 0 })
          gsap.set(stackItems, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 0 })

          window.scrollTo(0, 0)
          setHorizontalBase(0)
          scrollBaseRef.current = 0

          setPhase('grid')
          setGridProgress(0)
          setTicketIndex(0)
          setVisualTicketIndex(0)
          setIsAnimating(false)

          revealedTextBlocks = new WeakSet()
          hasStartedScrolling = false
          gsap.set('.grid-text', { clearProps: 'opacity,visibility' })
          gsap.killTweensOf('.grid-text-word')
          gsap.set('.grid-text-word', { autoAlpha: 0, y: 8 })

          const cards = gsap.utils.toArray('.grid .card')
          gsap.killTweensOf(cards, 'autoAlpha,scale')
          cards.forEach((card) => {
            gsap.set(card, {
              width: '',
              height: '',
              borderRadius: '',
              clearProps: 'opacity,visibility,transform',
            })
            const paths = card.querySelectorAll('.graphic-path')
            paths.forEach((path) => {
              gsap.killTweensOf(path)
              const len = getPathLength(path)
              gsap.set(path, {
                autoAlpha: 0,
                strokeDasharray: `${len} ${len}`,
                strokeDashoffset: len,
              })
            })
          })
          gsap.set(cards, { autoAlpha: 0, scale: 0 })
        }

        const playIntroFromStart = () => {
          const cards = gsap.utils.toArray('.grid .card')
          const shuffled = gsap.utils.shuffle([...cards])
          const newIntroTl = gsap.timeline({
            defaults: { ease: 'back.out(1.7)' },
            onComplete() {
              scrollBaseRef.current = window.scrollY
              revealVisibleTextBlocks()
            },
          })
          introTlRef.current = newIntroTl

          shuffled.forEach((card, i) => {
            const t = i * 0.04
            newIntroTl.set(card, { willChange: 'transform, opacity' }, t)
            newIntroTl.to(card, { autoAlpha: 1, scale: 1, duration: 0.55 }, t)
            const paths = card.querySelectorAll('.graphic-path')
            paths.forEach((path) => {
              const len = getPathLength(path)
              newIntroTl.fromTo(path, {
                strokeDashoffset: len,
              }, {
                strokeDashoffset: 0,
                duration: 0.55,
                ease: 'power2.inOut',
                immediateRender: false,
              }, t + 0.18)
              newIntroTl.set(path, { autoAlpha: 1, overwrite: false }, t + 0.22)
            })
            newIntroTl.set(card, { willChange: 'auto', clearProps: 'willChange' }, t + 0.8)
          })
        }

        const restartTl = gsap.timeline()

        innerGraphics.forEach((el, i) => {
          restartTl.to(el, {
            scale: 0.5,
            autoAlpha: 0,
            duration: 0.28,
            ease: 'power2.in',
          }, i * 0.08)
        })

        const lastDelay = innerGraphics.length * 0.08
        scatterEls.forEach((el, i) => {
          restartTl.to(el, {
            x: 0,
            y: 0,
            duration: 0.35,
            ease: 'power2.inOut',
          }, lastDelay + 0.05 + i * 0.04)
        })

        restartTl.to(stage, {
          backgroundColor: '#EFEFE7',
          duration: 0.45,
          ease: 'power2.inOut',
        }, lastDelay + 0.15)
        restartTl.call(resetGridForIntro)
        restartTl.to(stage, {
          backgroundColor: '#E2DFD0',
          duration: 0.28,
          ease: 'power2.inOut',
        })
        restartTl.call(playIntroFromStart)
      }

      apiRef.current = {
        playGridToTicket,
        reverseGridToTicket,
        goToTicket,
        playScatter,
        restartToStart,
      }

      const refreshLayout = () => {
        measureLayout()

        const timelines = [tl1to2, ...ticketStepTls]
        timelines.forEach((timeline) => {
          const progress = timeline.progress()
          timeline.invalidate().progress(progress)
        })

        if (stateRef.current.phase === 'grid') {
          renderHorizontalGrid(horizontalState.currentProgress)
        }

        draggableInstancesRef.current.forEach((instances) => {
          const draggable = instances[0]
          draggable?.applyBounds(scatterRef.current)
          draggable?.update()
        })
      }

      scheduleLayoutRefresh = () => {
        if (resizeFrame != null) cancelAnimationFrame(resizeFrame)
        resizeFrame = requestAnimationFrame(() => {
          resizeFrame = null
          refreshLayout()
        })
        if (resizeEndTimer != null) clearTimeout(resizeEndTimer)
        resizeEndTimer = setTimeout(() => {
          resizeEndTimer = null
          ScrollTrigger.refresh()
        }, 120)
      }

      resizeObserver = new ResizeObserver(scheduleLayoutRefresh)
      resizeObserver.observe(stage)
      window.addEventListener('resize', scheduleLayoutRefresh, { passive: true })
      window.visualViewport?.addEventListener('resize', scheduleLayoutRefresh, { passive: true })

      /* ===== ScrollTrigger: pin only ===== */
      stInstance = ScrollTrigger.create({
        trigger: appRef.current,
        start: 'top top',
        end: `+=${totalScroll}`,
        pin: true,
      })
      ScrollTrigger.clearScrollMemory()
      requestAnimationFrame(() => {
        window.scrollTo(0, 0)
        gsap.set(grid, { x: 0, y: 0 })
        setHorizontalBase(0)
        setGridProgress(0)
        scrollBaseRef.current = 0
        requestAnimationFrame(() => {
          window.scrollTo(0, 0)
          isScrollReady = true
        })
      })

      ticker = () => {
        if (!isScrollReady) return
        const s = stateRef.current
        if (s.isAnimating) return
        if (s.phase !== 'grid') return

        const diff = horizontalState.targetProgress - horizontalState.currentProgress
        if (Math.abs(diff) < 0.001) {
          if (horizontalState.currentProgress !== horizontalState.targetProgress) {
            horizontalState.currentProgress = horizontalState.targetProgress
            const progress = renderHorizontalGrid(horizontalState.currentProgress)
            if (Math.abs(progress - lastReportedGridProgress) >= GRID_PROGRESS_THRESHOLD) {
              lastReportedGridProgress = progress
              setGridProgress(progress)
            }
          }
          return
        }

        horizontalState.currentProgress += diff * PROGRESS_EASE
        const progress = renderHorizontalGrid(horizontalState.currentProgress)

        if (Math.abs(progress - lastReportedGridProgress) >= GRID_PROGRESS_THRESHOLD) {
          lastReportedGridProgress = progress
          setGridProgress(progress)
        }

        if (horizontalState.targetProgress >= 1 && progress > 0.995) {
          setIsAnimating(true)
          setHorizontalBase(1)
          renderHorizontalGrid(1)
          lastReportedGridProgress = 1
          setGridProgress(1)
          setReady()
          scrollBaseRef.current = window.scrollY
          gsap.to(grid, {
            x: layout.stepGridTargetX,
            duration: 0.2,
            ease: 'power2.out',
            onComplete() {
              setIsAnimating(false)
            },
          })
        }
      }

      gsap.ticker.add(ticker)

      /* ===== Wheel handler: grid phase only ===== */
      handleWheel = (e) => {
        if (!isScrollReady) return
        const s = stateRef.current
        if (s.isAnimating) return
        if (s.phase !== 'grid') return

        e.preventDefault()
        const effectiveDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        if (s.gridProgress >= READY_PROGRESS && effectiveDelta > 0) return
        if (effectiveDelta !== 0) hasStartedScrolling = true
        setHorizontalTarget(horizontalState.targetProgress + effectiveDelta * WHEEL_SENSITIVITY)
      }

      window.addEventListener('wheel', handleWheel, { passive: false })
    }, appRef)

    return () => {
      if (handleWheel) window.removeEventListener('wheel', handleWheel)
      resizeObserver?.disconnect()
      if (scheduleLayoutRefresh) {
        window.removeEventListener('resize', scheduleLayoutRefresh)
        window.visualViewport?.removeEventListener('resize', scheduleLayoutRefresh)
      }
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame)
      if (resizeEndTimer != null) clearTimeout(resizeEndTimer)
      if (ticker) gsap.ticker.remove(ticker)
      if (stInstance) stInstance.kill()
      draggableInstancesRef.current.forEach(d => d[0]?.kill())
      cardInteraction.destroy()
      draggableInitedRef.current = false
      stepTimelinesRef.current = []
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setStackRef = (i) => (el) => { stackRefs.current[i] = el }
  const setScatterRef = (i) => (el) => { scatterGraphicsRef.current[i] = el }

  const handleAdvance = () => {
    const s = stateRef.current
    if (s.isAnimating) return

    if (s.phase === 'grid' && s.gridProgress >= READY_PROGRESS) {
      apiRef.current.playGridToTicket?.()
    } else if (s.phase === 'ticket') {
      if (s.ticketIndex < 4) {
        apiRef.current.goToTicket?.(s.ticketIndex + 1)
      } else {
        apiRef.current.playScatter?.()
      }
    }
  }

  const handleBack = () => {
    const s = stateRef.current
    if (s.isAnimating) return

    if (s.phase === 'ticket') {
      if (s.ticketIndex > 0) {
        apiRef.current.goToTicket?.(s.ticketIndex - 1)
      } else {
        apiRef.current.reverseGridToTicket?.()
      }
    }
  }

  const handleTicketSelect = (index) => {
    const s = stateRef.current
    if (s.isAnimating) return
    if (s.phase !== 'ticket') return
    apiRef.current.goToTicket?.(index)
  }

  const handleRestart = () => {
    if (stateRef.current.isAnimating) return
    apiRef.current.restartToStart?.()
  }

  const handleArticleOpen = (index, event) => {
    const ticketElement = event?.currentTarget?.closest('.ticket') || stackRefs.current[index]?.querySelector('.ticket')
    const sourceElement = ticketElement?.querySelector('.ticket-right') || null
    if (!sourceElement) return
    if (stateRef.current.isAnimating) {
      pendingArticleRef.current = { index, sourceElement }
      return
    }
    if (stateRef.current.phase !== 'ticket') return
    window.history.pushState({ inAppArticle: true, articleIndex: index }, '', getArticlePath(tickets[index].id))
    cardInteraction.cancelAll()
    setArticleProgress(0)
    setArticleTransition({ sourceElement })
    setArticleIndex(index)
  }

  useLayoutEffect(() => {
    if (isAnimating || phase !== 'ticket') return
    const pending = pendingArticleRef.current
    if (!pending) return

    pendingArticleRef.current = null
    cardInteraction.cancelAll()
    window.history.pushState(
      { inAppArticle: true, articleIndex: pending.index },
      '',
      getArticlePath(tickets[pending.index].id),
    )
    setArticleProgress(0)
    setArticleTransition({ sourceElement: pending.sourceElement })
    setArticleIndex(pending.index)
  }, [cardInteraction, isAnimating, phase])

  const handleArticleBack = () => {
    if (isArticleClosing) return
    window.history.back()
  }

  useEffect(() => {
    const handlePopState = () => {
      if (articleIndex == null || getArticleIndex() >= 0) return
      const closeArticle = articleTransitionApiRef.current?.close
      if (!closeArticle) return
      setIsArticleClosing(true)
      closeArticle()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [articleIndex])

  const finishArticleClose = useCallback(() => {
    setArticleIndex(null)
    setArticleProgress(0)
    setArticleTransition(null)
    setIsArticleClosing(false)
  }, [])

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
                    {cfg.type !== 'empty' && (
                      <Card
                        bgColor={cfg.bgColor}
                        interactionProps={cardInteractionProps}
                      >
                        <Graphic name={cfg.graphic} />
                      </Card>
                    )}
                  </div>
                )
              })}
              {textBlocks.map((block) => (
                <div
                  key={block.key}
                  className={`grid-text grid-text--${block.align}`}
                  style={{
                    gridRow: block.row,
                    gridColumn: `${block.col} / span ${block.colSpan || 1}`,
                  }}
                >
                  {block.lines?.map(line => (
                    <span key={line} className="grid-text-line">
                      {line.split(' ').map((word, index, words) => (
                        <span key={`${word}-${index}`} className="grid-text-word">
                          {word}{index < words.length - 1 ? '\u00A0' : ''}
                        </span>
                      ))}
                    </span>
                  ))}
                </div>
              ))}
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
              <button className="ticket-read" type="button" onClick={event => handleArticleOpen(0, event)}>
                Read the story
              </button>
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
              <Ticket
                data={ticket}
                article={articlesByTicketId[ticket.id]}
                cardInteractionProps={cardInteractionProps}
                onRead={event => handleArticleOpen(i, event)}
              />
            </div>
          ))}
        </div>

        {/* ===== Scatter ===== */}
        <div className="scatter-area" ref={scatterRef}>
          <div className="scatter-letters">
            {['U', 'P', 'P', 'E', 'R'].map((letter, i) => (
            <div className="scatter-graphic" key={`${letter}-${i}`} ref={setScatterRef(i)}>
                <div className="scatter-graphic-inner">
                  <Graphic name={tickets[i].graphic} size={200} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {articleIndex != null && (
          <FollowArticleTransition
            sourceElement={articleTransition?.sourceElement}
            apiRef={articleTransitionApiRef}
            onClosed={finishArticleClose}
            onProgress={setArticleProgress}
          />
        )}

        {/* ===== Animation Controller ===== */}
        <AnimationController
          phase={phase}
          gridProgress={gridProgress}
          ticketIndex={ticketIndex}
          visualTicketIndex={visualTicketIndex}
          isAnimating={isAnimating}
          isArticleClosing={isArticleClosing}
          onAdvance={handleAdvance}
          onBack={handleBack}
          onTicketSelect={handleTicketSelect}
          onRestart={handleRestart}
          isArticleOpen={articleIndex != null}
          articleProgress={articleProgress}
          onArticleBack={handleArticleBack}
        />
      </div>
    </div>
  )
}

export default App
