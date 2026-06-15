import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { cells, getCellConfig, selectedCard as selectedCardKey } from './data/gridConfig'
import tickets from './data/tickets.json'
import Card from './components/Card/Card'
import Graphic from './components/Graphic/Graphic'
import Ticket from './components/Ticket/Ticket'
import AnimationController from './components/AnimationController/AnimationController'
import MobileView from './components/MobileView/MobileView'
import { useAnimationState } from './hooks/useAnimationState'
import { useIsMobile } from './hooks/useIsMobile'
import './App.css'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, Draggable, InertiaPlugin)

const GRID_DAMPING = 0.2
const WHEEL_SENSITIVITY = 0.00045
const PROGRESS_EASE = 0.14

function App() {
  const isMobile = useIsMobile()

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

  const {
    phase, gridProgress, ticketIndex, isAnimating,
    stateRef,
    setPhase, setGridProgress, setTicketIndex, setIsAnimating,
    setReady,
  } = useAnimationState()

  const stepTimelinesRef = useRef([])
  const introTlRef = useRef(null)
  const scrollBaseRef = useRef(0)
  const apiRef = useRef({})

  const totalScroll = 12000
  const gridW = 4420

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
    let isScrollReady = false

    const ctx = gsap.context(() => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const ticketX = Math.round((vw - 1280) / 2)
      const ticketY = Math.round((vh - 520) / 2)
      const stackItems = stackRefs.current.filter(Boolean)
      const firstTicket = stackItems[0]

      gsap.set(stackItems, {
        x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 0,
      })
      gsap.set(ticketStage, { autoAlpha: 0 })
      gsap.set(scatterRef.current, { display: 'none' })
      gsap.set(stage, {
        backgroundColor: '#E2DFD0',
        '--ticket-x': `${ticketX}px`,
        '--ticket-y': `${ticketY}px`,
      })

      /* ===== Phase 0: Card Intro (plays on mount) ===== */
      const cards = gsap.utils.toArray('.grid .card')
      const shuffled = gsap.utils.shuffle([...cards])

      gsap.set(shuffled, { autoAlpha: 0, scale: 0 })

      const introTl = gsap.timeline({
        defaults: { ease: 'back.out(1.7)' },
        onComplete() {
          scrollBaseRef.current = window.scrollY
        },
      })
      introTlRef.current = introTl

      shuffled.forEach((card, i) => {
        const t = i * 0.04
        introTl.to(card, { autoAlpha: 1, scale: 1, duration: 0.55 }, t)

        const paths = card.querySelectorAll('.graphic-path')
        paths.forEach((path) => {
          const len = path.getTotalLength()
          gsap.set(path, {
            autoAlpha: 0,
            strokeDasharray: `${len} ${len * 2}`,
            strokeDashoffset: len,
          })
          introTl.set(path, { autoAlpha: 1, overwrite: false }, t + 0.38)
          introTl.to(path, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' }, t + 0.35)
        })
      })

      /* ===== Target cell & layout values ===== */
      const selectCell = grid.querySelector(`[data-cell="${selectedCardKey}"]`)
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

      /* ===== Phase 1 Horizontal state ===== */
      const stepGridTargetX = -scrollX
      const horizontalState = {
        targetProgress: 0,
        currentProgress: 0,
        progress: 0,
      }
      let horizontalTween = null

      const setHorizontalBase = (progress) => {
        horizontalState.targetProgress = progress
        horizontalState.currentProgress = progress
        horizontalState.progress = progress
      }

      const stopHorizontalDamping = () => {
        horizontalTween?.kill()
        horizontalTween = null
      }

      const renderHorizontalGrid = (nextProgress) => {
        horizontalState.progress = nextProgress
        gsap.set(grid, { y: 0 })
        horizontalTween = gsap.to(grid, {
          x: stepGridTargetX * nextProgress,
          duration: GRID_DAMPING,
          ease: 'power3.out',
          overwrite: 'auto',
        })

        return nextProgress
      }

      const setHorizontalTarget = (progress) => {
        horizontalState.targetProgress = gsap.utils.clamp(0, 1, progress)
      }

      /* ===== tl1to2: Grid -> Ticket transition ===== */
      const tl1to2 = gsap.timeline({ paused: true })

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

        tl1to2
          .to(`[data-cell]:not([data-cell="${selectedCardKey}"])`, { autoAlpha: 0, duration: 0.12 }, 0)
          .to(gridPanel, {
            left: panelTargetLeft,
            top: panelTargetTop,
            width: leftTargetRect.width,
            height: leftTargetRect.height,
            borderRadius: 32,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 0.04)
          .to(grid, {
            x: gridTargetX,
            y: gridTargetY,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 0.04)
          .to(selectedCard, {
            width: cardTargetSize,
            height: cardTargetSize,
            borderRadius: 24,
            duration: 0.48,
            ease: 'power3.inOut',
          }, 0.04)
          .call(() => { rightPanel.style.display = 'flex' }, [], 0.28)
          .fromTo(rightPanel, { x: vw }, { x: 0, duration: 0.28, ease: 'power3.out' }, 0.28)
          .fromTo(ticketStage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0.58)
          .fromTo(firstTicket, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0.58)
          .to([gridPanel, rightPanel], { autoAlpha: 0, duration: 0.08 }, 0.62)
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
          .fromTo(ticket,
            { autoAlpha: 0, y: vh * 0.18 },
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

        ticketStepTls.push(ticketTl)
      })

      /* ===== tl3to4: Ticket -> Scatter ===== */
      const tl3to4 = gsap.timeline({ paused: true })

      tl3to4
        .to([gridPanel, rightPanel], { autoAlpha: 0, duration: 0.15 }, 0)
        .to(ticketStage, { autoAlpha: 0, duration: 0.18 }, 0)
        .to('.ticket-stack-item', { autoAlpha: 0, duration: 0.18 }, 0)

      const graphics = scatterGraphicsRef.current
        .filter(Boolean)
        .map(el => el.querySelector('.scatter-graphic-inner'))
        .filter(Boolean)

      gsap.set(graphics, { autoAlpha: 0, y: 40, scale: 0.5 })

      graphics.forEach((el, i) => {
        tl3to4.fromTo(el,
          { autoAlpha: 0, y: 40, scale: 0.5 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.24, immediateRender: false },
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
              onDragStart() {
                gsap.set(el, { zIndex: 100 })
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
        if (stateRef.current.phase !== 'grid' || stateRef.current.gridProgress < 1) return

        setIsAnimating(true)
        stopHorizontalDamping()

        const origComplete = tl1to2.eventCallback('onComplete')
        tl1to2.eventCallback('onComplete', () => {
          tl1to2.eventCallback('onComplete', origComplete)
          if (origComplete) origComplete()
          setPhase('ticket')
          setTicketIndex(0)
          setIsAnimating(false)
        })
        tl1to2.play(0)
      }

      const reverseGridToTicket = () => {
        if (stateRef.current.isAnimating) return
        if (stateRef.current.phase !== 'ticket' || stateRef.current.ticketIndex !== 0) return

        setIsAnimating(true)

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

        const step = (current) => {
          if (current === targetIndex) {
            setTicketIndex(targetIndex)
            setIsAnimating(false)
            return
          }

          if (current < targetIndex) {
            const tl = ticketStepTls[current]
            const orig = tl.eventCallback('onComplete')
            tl.eventCallback('onComplete', () => {
              tl.eventCallback('onComplete', orig)
              if (orig) orig()
              step(current + 1)
            })
            tl.play(0)
          } else {
            const tl = ticketStepTls[current - 1]
            const orig = tl.eventCallback('onReverseComplete')
            tl.eventCallback('onReverseComplete', () => {
              tl.eventCallback('onReverseComplete', orig)
              if (orig) orig()
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

          gsap.set(gridPanel, { clearProps: 'left,top,width,height,borderRadius,autoAlpha' })
          gsap.set(gridPanel, { autoAlpha: 1 })
          gsap.set('[data-cell]', { clearProps: 'autoAlpha' })
          gsap.set(grid, { x: 0, y: 0 })
          gsap.set(rightPanel, { clearProps: 'x,autoAlpha', display: '' })
          gsap.set(ticketStage, { autoAlpha: 0 })
          gsap.set(stackItems, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 0 })

          window.scrollTo(0, 0)
          setHorizontalBase(0)
          scrollBaseRef.current = 0

          setPhase('grid')
          setGridProgress(0)
          setTicketIndex(0)
          setIsAnimating(false)

          const cards = gsap.utils.toArray('.grid .card')
          gsap.killTweensOf(cards, 'autoAlpha,scale')
          cards.forEach((card) => {
            gsap.set(card, {
              width: '',
              height: '',
              borderRadius: '',
              clearProps: 'autoAlpha,scale,transform',
            })
            const paths = card.querySelectorAll('.graphic-path')
            paths.forEach((path) => {
              gsap.killTweensOf(path)
              const len = path.getTotalLength()
              gsap.set(path, {
                autoAlpha: 0,
                strokeDasharray: `${len} ${len * 2}`,
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
            },
          })
          introTlRef.current = newIntroTl

          shuffled.forEach((card, i) => {
            const t = i * 0.04
            newIntroTl.to(card, { autoAlpha: 1, scale: 1, duration: 0.55 }, t)
            const paths = card.querySelectorAll('.graphic-path')
            paths.forEach((path) => {
              newIntroTl.set(path, { autoAlpha: 1, overwrite: false }, t + 0.38)
              newIntroTl.to(path, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' }, t + 0.35)
            })
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
            setGridProgress(progress)
          }
          return
        }

        horizontalState.currentProgress += diff * PROGRESS_EASE
        const progress = renderHorizontalGrid(horizontalState.currentProgress)
        setGridProgress(progress)

        if (horizontalState.targetProgress >= 1 && progress > 0.995) {
          setIsAnimating(true)
          setHorizontalBase(1)
          renderHorizontalGrid(1)
          setGridProgress(1)
          setReady()
          scrollBaseRef.current = window.scrollY
          gsap.to(grid, {
            x: stepGridTargetX,
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
        if (s.gridProgress >= 1 && effectiveDelta > 0) return
        setHorizontalTarget(horizontalState.targetProgress + effectiveDelta * WHEEL_SENSITIVITY)
      }

      window.addEventListener('wheel', handleWheel, { passive: false })
    }, appRef)

    return () => {
      if (handleWheel) window.removeEventListener('wheel', handleWheel)
      if (ticker) gsap.ticker.remove(ticker)
      if (stInstance) stInstance.kill()
      draggableInstancesRef.current.forEach(d => d[0]?.kill())
      draggableInitedRef.current = false
      stepTimelinesRef.current = []
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleAdvance = () => {
    const s = stateRef.current
    if (s.isAnimating) return

    if (s.phase === 'grid' && s.gridProgress >= 1) {
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
                <div className="scatter-graphic-inner">
                  <Graphic name={tickets[i].graphic} size={200} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Animation Controller ===== */}
        <AnimationController
          phase={phase}
          gridProgress={gridProgress}
          ticketIndex={ticketIndex}
          isAnimating={isAnimating}
          onAdvance={handleAdvance}
          onBack={handleBack}
          onTicketSelect={handleTicketSelect}
          onRestart={handleRestart}
        />
      </div>
    </div>
  )
}

export default App
