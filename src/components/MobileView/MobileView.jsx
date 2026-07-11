import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import Graphic from '../Graphic/Graphic'
import ArticleContent from '../../articles/ArticleContent'
import caretLeft from '../../assets/caret-left.svg'
import tickets from '../../data/tickets.json'
import articlesByTicketId from '../../articles/registry'
import { getPathLength } from '../../utils/pathCache'
import { createCardInteraction } from '../../animations/cardInteraction'
import './MobileView.css'

gsap.registerPlugin(Draggable, InertiaPlugin)

const GRAPHIC_SIZE = 96
const LOGO_SIZE = 30
const LOGO_INITIAL_SIZE = 76
const SLOT_DISTANCE = 54

function calculatePositions(count, width, height, size) {
  const side = 22
  const availableWidth = width - side * 2
  const centerY = Math.max(250, Math.min(height * 0.48, height - 260))
  const rowGap = Math.min(142, height * 0.17)
  const rows = count <= 3
    ? [{ count, y: centerY }]
    : [{ count: 3, y: centerY - rowGap / 2 }, { count: count - 3, y: centerY + rowGap / 2 }]

  const positions = []
  rows.forEach((row) => {
    const spacing = availableWidth / (row.count + 1)
    for (let index = 0; index < row.count; index += 1) {
      positions.push({
        left: side + spacing * (index + 1) - size / 2,
        top: row.y - size / 2,
      })
    }
  })
  return positions
}

function MobileView() {
  const viewRef = useRef(null)
  const logoRef = useRef(null)
  const graphicsWrapperRef = useRef(null)
  const draggableInstancesRef = useRef([])
  const dragRef = useRef({ moved: false })
  const occupiedIndexRef = useRef(null)
  const [ticketIndex, setTicketIndex] = useState(null)
  const [isTicketClosing, setIsTicketClosing] = useState(false)
  const [articleIndex, setArticleIndex] = useState(null)
  const [articleProgress, setArticleProgress] = useState(0)
  const [articleControlState, setArticleControlState] = useState('hidden')
  const swipeStartRef = useRef(null)
  const sheetRef = useRef(null)
  const backdropRef = useRef(null)
  const sheetDragRef = useRef({ pointerId: null, startY: 0, distance: 0 })
  const closeTimelineRef = useRef(null)
  const articleTransitionApiRef = useRef(null)
  const ticketIndexRef = useRef(null)
  const articleIndexRef = useRef(null)
  const cardInteraction = useMemo(() => createCardInteraction({
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }), [])

  const showTicket = useCallback((index) => {
    window.history.pushState({ ...window.history.state, mobileLayer: 'ticket', ticketIndex: index }, '')
    ticketIndexRef.current = index
    setTicketIndex(index)
  }, [])

  const openTicket = useCallback((index) => {
    if (dragRef.current.moved) return
    if (occupiedIndexRef.current !== index) return
    closeTimelineRef.current?.kill()
    setIsTicketClosing(false)
    showTicket(index)
  }, [showTicket])

  const animateTicketClose = useCallback(() => {
    if (ticketIndexRef.current == null) return
    if (!sheetRef.current || !backdropRef.current) {
      ticketIndexRef.current = null
      setTicketIndex(null)
      return
    }
    setIsTicketClosing(true)
    closeTimelineRef.current?.kill()
    closeTimelineRef.current = gsap.timeline({
      onComplete: () => {
        ticketIndexRef.current = null
        setTicketIndex(null)
        setIsTicketClosing(false)
        closeTimelineRef.current = null
      },
    })
      .to(sheetRef.current, { y: '100%', duration: 0.28, ease: 'power2.in' }, 0)
      .to(backdropRef.current, { autoAlpha: 0, duration: 0.24, ease: 'power1.in' }, 0)
  }, [])

  const closeTicket = () => {
    if (isTicketClosing || ticketIndex == null) return
    window.history.back()
  }

  const selectTicket = (nextIndex) => {
    ticketIndexRef.current = nextIndex
    setTicketIndex(nextIndex)
    window.history.replaceState({ ...window.history.state, mobileLayer: 'ticket', ticketIndex: nextIndex }, '')
  }
  const selectPrevious = () => selectTicket(Math.max(0, ticketIndex - 1))
  const selectNext = () => selectTicket(Math.min(tickets.length - 1, ticketIndex + 1))

  const openArticle = () => {
    const index = ticketIndexRef.current
    if (index == null) return
    window.history.pushState({ ...window.history.state, mobileLayer: 'article', ticketIndex: index }, '')
    setArticleProgress(0)
    setArticleControlState('hidden')
    articleIndexRef.current = index
    setArticleIndex(index)
  }

  const finishArticleClose = useCallback(() => {
    articleIndexRef.current = null
    setArticleIndex(null)
    setArticleProgress(0)
    setArticleControlState('hidden')
  }, [])

  useEffect(() => {
    window.history.replaceState({ ...window.history.state, mobileLayer: 'home' }, '')

    const handlePopState = (event) => {
      const layer = event.state?.mobileLayer ?? 'home'

      if (articleIndexRef.current != null && layer !== 'article') {
        articleTransitionApiRef.current?.close()
      }

      if (layer === 'ticket') {
        const index = event.state?.ticketIndex
        if (Number.isInteger(index)) {
          closeTimelineRef.current?.kill()
          setIsTicketClosing(false)
          ticketIndexRef.current = index
          setTicketIndex(index)
        }
      } else if (layer === 'article') {
        const index = event.state?.ticketIndex
        if (Number.isInteger(index) && articleIndexRef.current == null) {
          ticketIndexRef.current = index
          articleIndexRef.current = index
          setTicketIndex(index)
          setArticleIndex(index)
        }
      } else if (layer === 'home' && ticketIndexRef.current != null) {
        animateTicketClose()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [animateTicketClose])

  useLayoutEffect(() => {
    if (articleIndex == null || !sheetRef.current) return

    const sheet = sheetRef.current
    const visual = sheet.querySelector('.mobile-ticket-visual')
    const headingItems = Array.from(sheet.querySelectorAll('.mobile-ticket-title, .mobile-ticket-logo, .mobile-ticket-letter'))
    const heading = sheet.querySelector('.mobile-ticket-heading')
    const typeElements = Array.from(sheet.querySelectorAll('.mobile-ticket-title, .mobile-ticket-letter'))
    const logo = sheet.querySelector('.mobile-ticket-logo')
    const logoGraphic = logo.querySelector('.graphic')
    const intro = sheet.querySelector('.mobile-ticket-intro')
    const content = sheet.querySelector('.mobile-ticket-article')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startLogoRect = logo.getBoundingClientRect()
    let liftTimeline = null
    let articleTimeline = null
    let controlRevealCall = null
    let controlEnableCall = null
    let expandedHeight = 0
    let resizeFrame = null

    sheet.classList.add('mobile-ticket-sheet--prelude')
    const endLogoRect = logo.getBoundingClientRect()
    gsap.set(logo, {
      x: startLogoRect.left - endLogoRect.left,
      y: startLogoRect.top - endLogoRect.top,
      transformOrigin: '0 0',
    })
    gsap.set(intro, { height: intro.getBoundingClientRect().height, overflow: 'hidden' })

    const updateArticleProgress = () => {
      const maxScroll = sheet.scrollHeight - sheet.clientHeight
      setArticleProgress(maxScroll > 0 ? sheet.scrollTop / maxScroll : 1)
    }

    const refreshArticleLayout = () => {
      if (!sheet.classList.contains('mobile-ticket-sheet--article')) return
      gsap.set(sheet, { height: viewRef.current?.clientHeight || window.innerHeight })
      updateArticleProgress()
    }

    const handleResize = () => {
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null
        refreshArticleLayout()
      })
    }

    window.addEventListener('resize', handleResize, { passive: true })
    window.visualViewport?.addEventListener('resize', handleResize, { passive: true })

    const buildArticle = () => {
      const startRects = new Map(headingItems.map(element => [element, element.getBoundingClientRect()]))
      gsap.set(visual, { autoAlpha: 0 })
      sheet.classList.add('mobile-ticket-sheet--article')
      gsap.set(heading, { marginTop: 0 })
      const endStyle = getComputedStyle(sheet)
      gsap.set(sheet, {
        height: viewRef.current?.clientHeight || window.innerHeight,
        paddingTop: parseFloat(endStyle.paddingTop),
        paddingRight: parseFloat(endStyle.paddingRight),
        paddingBottom: parseFloat(endStyle.paddingBottom),
        paddingLeft: parseFloat(endStyle.paddingLeft),
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      })

      headingItems.forEach((element) => {
        const start = startRects.get(element)
        const end = element.getBoundingClientRect()
        gsap.set(element, {
          x: start.left - end.left,
          y: start.top - end.top,
          transformOrigin: '0 0',
        })
      })
      gsap.set(content, { autoAlpha: 0, y: 40 })

      articleTimeline = gsap.timeline({
        paused: true,
        onComplete: () => {
          sheet.classList.add('mobile-ticket-sheet--reading')
          sheet.scrollTop = 0
          sheet.addEventListener('scroll', updateArticleProgress, { passive: true })
          updateArticleProgress()
        },
        onReverseComplete: () => {
          sheet.scrollTop = 0
          sheet.classList.remove('mobile-ticket-sheet--reading', 'mobile-ticket-sheet--closing')
          sheet.classList.remove('mobile-ticket-sheet--article')
          gsap.set(heading, { marginTop: 48 })
          gsap.set(sheet, {
            clearProps: 'paddingTop,paddingRight,paddingBottom,paddingLeft,borderTopLeftRadius,borderTopRightRadius',
            height: expandedHeight,
          })
          gsap.set(visual, { clearProps: 'opacity,visibility,transform' })
          gsap.set(content, { clearProps: 'opacity,visibility,transform' })
          gsap.set(headingItems, { clearProps: 'transform' })
          liftTimeline.reverse()
        },
      })
        .to(headingItems, {
          x: 0,
          y: 0,
          duration: reduceMotion ? 0 : 0.36,
          ease: 'power3.inOut',
        }, 0)
        .to(content, {
          autoAlpha: 1,
          y: 0,
          duration: reduceMotion ? 0 : 0.48,
          ease: 'power2.out',
        }, reduceMotion ? 0 : 0.2)

      articleTimeline.play(0)
      controlRevealCall = gsap.delayedCall(reduceMotion ? 0 : 0.2, () => {
        setArticleControlState('revealing')
        controlEnableCall = gsap.delayedCall(reduceMotion ? 0 : 0.48, () => {
          setArticleControlState('visible')
        })
      })
    }

    const buildLift = () => {
      gsap.set(sheet, { height: 'auto' })
      const preludeHeight = sheet.getBoundingClientRect().height
      const headingRect = sheet.querySelector('.mobile-ticket-heading').getBoundingClientRect()
      const safeTop = Math.max(24, parseFloat(getComputedStyle(sheet).paddingTop))
      expandedHeight = preludeHeight + Math.max(0, headingRect.top - safeTop)
      gsap.set(sheet, { height: preludeHeight })

      liftTimeline = gsap.timeline({
        paused: true,
        onComplete: buildArticle,
        onReverseComplete: () => {
          gsap.set(sheet, { clearProps: 'height' })
          preludeTimeline.reverse()
        },
      })
        .to(sheet, {
          height: expandedHeight,
          duration: reduceMotion ? 0 : 0.92,
          ease: 'power3.inOut',
        })

      liftTimeline.play(0)
    }

    const preludeTimeline = gsap.timeline({
      paused: true,
      onComplete: buildLift,
      onReverseComplete: finishArticleClose,
    })
      .to(intro, {
        autoAlpha: 0,
        y: -10,
        height: 0,
        marginTop: 0,
        filter: 'blur(5px)',
        duration: reduceMotion ? 0 : 0.5,
        ease: 'power2.inOut',
      }, 0)
      .to(logo, {
        x: 0,
        y: 0,
        duration: reduceMotion ? 0 : 0.5,
        ease: 'power3.inOut',
      }, reduceMotion ? 0 : 0.14)
      .to(typeElements, {
        fontSize: 22,
        lineHeight: '28px',
        duration: reduceMotion ? 0 : 0.5,
        ease: 'power2.inOut',
      }, reduceMotion ? 0 : 0.14)
      .to(logoGraphic, {
        width: 36,
        height: 36,
        duration: reduceMotion ? 0 : 0.5,
        ease: 'power2.inOut',
      }, reduceMotion ? 0 : 0.14)
      .to(heading, {
        height: 44,
        marginTop: 48,
        duration: reduceMotion ? 0 : 0.5,
        ease: 'power2.inOut',
      }, reduceMotion ? 0 : 0.14)

    articleTransitionApiRef.current = {
      close: () => {
        controlRevealCall?.kill()
        controlEnableCall?.kill()
        setArticleControlState('closing')
        if (articleTimeline) {
          if (articleTimeline.reversed()) return
          sheet.removeEventListener('scroll', updateArticleProgress)
          sheet.classList.add('mobile-ticket-sheet--closing')
          setArticleProgress(0)
          articleTimeline.reverse()
          return
        }
        if (liftTimeline) {
          liftTimeline.reverse()
          return
        }
        if (!liftTimeline) {
          preludeTimeline.reverse()
        }
      },
    }
    preludeTimeline.play(0)

    return () => {
      sheet.removeEventListener('scroll', updateArticleProgress)
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame)
      articleTimeline?.kill()
      controlRevealCall?.kill()
      controlEnableCall?.kill()
      liftTimeline?.kill()
      preludeTimeline.kill()
      articleTransitionApiRef.current = null
      sheet.classList.remove(
        'mobile-ticket-sheet--prelude',
        'mobile-ticket-sheet--article',
        'mobile-ticket-sheet--reading',
        'mobile-ticket-sheet--closing',
      )
      gsap.set(sheet, { clearProps: 'height,paddingTop,paddingRight,paddingBottom,paddingLeft,borderTopLeftRadius,borderTopRightRadius,transform' })
      gsap.set(visual, { clearProps: 'opacity,visibility,transform' })
      gsap.set(logo, { clearProps: 'transform' })
      gsap.set(logoGraphic, { width: 44, height: 44 })
      gsap.set(intro, { clearProps: 'opacity,visibility,transform,height,overflow,marginTop,filter' })
      gsap.set(content, { clearProps: 'opacity,visibility,transform' })
      gsap.set(headingItems, { clearProps: 'transform' })
      gsap.set(typeElements, { clearProps: 'fontSize,lineHeight' })
      gsap.set(heading, { clearProps: 'height,marginTop' })
    }
  }, [articleIndex, finishArticleClose])

  useLayoutEffect(() => {
    const view = viewRef.current
    const wrapper = graphicsWrapperRef.current
    if (!view || !wrapper) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let resizeObserver
    let resizeFrame = null
    let dragZIndex = 10
    let isEntranceComplete = false
    let resizePending = false

    const getElements = () => Array.from(wrapper.querySelectorAll('.mobile-graphic'))
    const getSlots = () => Array.from(view.querySelectorAll('.mobile-slot'))

    const layoutGraphics = (animate = false, preserveRotation = false) => {
      const elements = getElements()
      const positions = calculatePositions(elements.length, view.clientWidth, view.clientHeight, GRAPHIC_SIZE)
      occupiedIndexRef.current = null

      elements.forEach((element, index) => {
        const rotation = preserveRotation
          ? gsap.getProperty(element, 'rotation')
          : gsap.utils.random(animate ? -7 : -4, animate ? 7 : 4)
        const vars = { x: 0, y: 0, left: positions[index].left, top: positions[index].top, rotation }
        if (animate && !reduceMotion) {
          gsap.to(element, { ...vars, duration: 0.48, ease: 'back.out(1.5)' })
        } else {
          gsap.set(element, vars)
        }
      })
      draggableInstancesRef.current.forEach((instance) => {
        instance.applyBounds(view)
        instance.update()
      })
    }

    const checkSlot = (element, index) => {
      const elements = getElements()
      const slot = getSlots()[0]
      if (!slot) return false
      const elementRect = element.getBoundingClientRect()
      const slotRect = slot.getBoundingClientRect()
      const distance = Math.hypot(
        elementRect.left + elementRect.width / 2 - (slotRect.left + slotRect.width / 2),
        elementRect.top + elementRect.height / 2 - (slotRect.top + slotRect.height / 2),
      )
      if (distance > SLOT_DISTANCE) {
        if (occupiedIndexRef.current === index) occupiedIndexRef.current = null
        return false
      }

      const previousIndex = occupiedIndexRef.current
      if (previousIndex != null && previousIndex !== index) {
        const previousElement = getElements()[previousIndex]
        const positions = calculatePositions(elements.length, view.clientWidth, view.clientHeight, GRAPHIC_SIZE)
        const previousPosition = positions[previousIndex]
        gsap.to(previousElement, {
          left: previousPosition.left,
          top: previousPosition.top,
          x: 0,
          y: 0,
          rotation: gsap.utils.random(-7, 7),
          scale: 1,
          duration: reduceMotion ? 0 : 0.44,
          ease: 'back.out(1.5)',
        })
      }

      const wrapperRect = wrapper.getBoundingClientRect()
      const targetLeft = slotRect.left - wrapperRect.left + (slotRect.width - element.offsetWidth) / 2
      const targetTop = slotRect.top - wrapperRect.top + (slotRect.height - element.offsetHeight) / 2
      occupiedIndexRef.current = index
      gsap.to(element, {
        left: targetLeft,
        top: targetTop,
        x: 0,
        y: 0,
        rotation: 0,
        duration: reduceMotion ? 0 : 0.34,
        ease: 'back.out(1.7)',
        onComplete: () => {
          draggableInstancesRef.current[index]?.update()
          showTicket(index)
        },
      })

      return true
    }

    const setupDraggable = () => {
      draggableInstancesRef.current.forEach(instance => instance.kill())
      draggableInstancesRef.current = getElements().map((element, index) => Draggable.create(element, {
        type: 'left,top',
        bounds: view,
        inertia: false,
        edgeResistance: 0.72,
        zIndexBoost: false,
        onPress() {
          dragRef.current.moved = false
          dragZIndex += 1
          gsap.set(element, { zIndex: dragZIndex })
          gsap.to(element, {
            scale: 1.06,
            rotation: occupiedIndexRef.current === index ? 0 : gsap.utils.random(-5, 5),
            duration: reduceMotion ? 0 : 0.16,
          })
        },
        onDragStart() {
          cardInteraction.cancelAll()
          if (occupiedIndexRef.current === index) occupiedIndexRef.current = null
        },
        onDrag() {
          if (Math.abs(this.deltaX) + Math.abs(this.deltaY) > 3) dragRef.current.moved = true
        },
        onRelease() {
          gsap.to(element, {
            scale: 1,
            rotation: occupiedIndexRef.current === index ? 0 : gsap.getProperty(element, 'rotation'),
            duration: reduceMotion ? 0 : 0.24,
            ease: 'power2.out',
          })
        },
        onDragEnd() {
          checkSlot(element, index)
        },
        onClick() {
          openTicket(index)
        },
      })[0])
    }

    const ctx = gsap.context(() => {
      const logo = logoRef.current
      const paths = logo ? Array.from(logo.querySelectorAll('.graphic-path')) : []
      const centerLeft = (view.clientWidth - LOGO_INITIAL_SIZE) / 2
      const centerTop = (view.clientHeight - LOGO_INITIAL_SIZE) / 2

      gsap.set(logo, {
        left: centerLeft,
        top: centerTop,
        width: LOGO_INITIAL_SIZE,
        height: LOGO_INITIAL_SIZE,
        autoAlpha: 1,
      })
      gsap.set(getElements(), { autoAlpha: 0, scale: 0 })

      paths.forEach((path) => {
        const length = getPathLength(path)
        gsap.set(path, { autoAlpha: 1, strokeDasharray: `${length} ${length}`, strokeDashoffset: length })
      })

      const timeline = gsap.timeline()
      paths.forEach(path => timeline.to(path, {
        strokeDashoffset: 0,
        duration: reduceMotion ? 0 : 0.48,
        ease: 'power2.inOut',
      }, 0))
      timeline.to(logo, {
        left: (view.clientWidth - LOGO_SIZE) / 2,
        top: view.clientHeight - 48 - LOGO_SIZE,
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        duration: reduceMotion ? 0 : 0.5,
        ease: 'power3.inOut',
      }, reduceMotion ? 0 : 0.62)
      timeline.set(logo, { clearProps: 'left,top,width,height' }, reduceMotion ? 0 : 1.12)
      timeline.call(() => layoutGraphics(false), null, reduceMotion ? 0 : 0.8)
      timeline.to(getElements(), {
        autoAlpha: 1,
        scale: 1,
        duration: reduceMotion ? 0 : 0.38,
        stagger: reduceMotion ? 0 : 0.09,
        ease: 'back.out(1.7)',
        onComplete: () => {
          isEntranceComplete = true
          layoutGraphics(false, true)
          setupDraggable()
          if (resizePending) {
            resizePending = false
            layoutGraphics(false, true)
          }
        },
      }, reduceMotion ? 0 : 0.82)
    }, view)

    let previousWidth = view.clientWidth
    let previousHeight = view.clientHeight
    const refreshLayout = () => {
      if (!isEntranceComplete) {
        resizePending = true
        return
      }
      if (Math.abs(view.clientWidth - previousWidth) < 2 && Math.abs(view.clientHeight - previousHeight) < 2) return
      previousWidth = view.clientWidth
      previousHeight = view.clientHeight
      layoutGraphics(false, true)
    }

    const scheduleLayout = () => {
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null
        refreshLayout()
      })
    }

    resizeObserver = new ResizeObserver(scheduleLayout)
    resizeObserver.observe(view)
    window.addEventListener('resize', scheduleLayout, { passive: true })
    window.visualViewport?.addEventListener('resize', scheduleLayout, { passive: true })

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', scheduleLayout)
      window.visualViewport?.removeEventListener('resize', scheduleLayout)
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame)
      draggableInstancesRef.current.forEach(instance => instance.kill())
      draggableInstancesRef.current = []
      cardInteraction.destroy()
      closeTimelineRef.current?.kill()
      ctx.revert()
    }
  }, [cardInteraction, openTicket, showTicket])

  const activeTicket = ticketIndex == null ? null : tickets[ticketIndex]

  return (
    <main className={`mobile-view${articleIndex != null ? ' mobile-view--article' : ''}`} ref={viewRef}>
      <div className="mobile-logo" ref={logoRef} aria-hidden="true">
        <Graphic name="logo" size={LOGO_INITIAL_SIZE} />
      </div>

      <div className="mobile-graphics" ref={graphicsWrapperRef}>
        {tickets.map((ticket, index) => (
          <div className="mobile-graphic" key={ticket.id}>
            <div
              className="mobile-graphic-inner"
              onPointerDown={(event) => {
                if (occupiedIndexRef.current !== index) cardInteraction.onPointerDown(event)
              }}
              onPointerUp={cardInteraction.onPointerUp}
              onPointerCancel={cardInteraction.onPointerCancel}
            >
              <Graphic name={ticket.graphic} size={GRAPHIC_SIZE} />
            </div>
          </div>
        ))}
      </div>

      <section className="mobile-puzzle" aria-label="Drop a sticker here to open its ticket">
        <div className="mobile-slots">
          <span className="mobile-slot" aria-hidden="true" />
        </div>
      </section>

      {activeTicket && (
        <div
          className={`mobile-ticket-backdrop${isTicketClosing ? ' mobile-ticket-backdrop--closing' : ''}`}
          ref={backdropRef}
          onClick={closeTicket}
        >
          <article
            className="mobile-ticket-sheet"
            ref={sheetRef}
            onClick={event => event.stopPropagation()}
            onPointerDown={event => { swipeStartRef.current = event.clientX }}
            onPointerUp={(event) => {
              if (swipeStartRef.current == null) return
              const distance = event.clientX - swipeStartRef.current
              swipeStartRef.current = null
              if (distance > 48) selectPrevious()
              if (distance < -48) selectNext()
            }}
          >
            <div
              className="mobile-ticket-handle"
              role="button"
              tabIndex={0}
              aria-label="Drag down to close ticket"
              onPointerDown={(event) => {
                if (isTicketClosing) return
                sheetDragRef.current = { pointerId: event.pointerId, startY: event.clientY, distance: 0 }
                event.currentTarget.setPointerCapture(event.pointerId)
                event.stopPropagation()
              }}
              onPointerMove={(event) => {
                const drag = sheetDragRef.current
                if (drag.pointerId !== event.pointerId) return
                drag.distance = Math.max(0, event.clientY - drag.startY)
                gsap.set(sheetRef.current, { y: drag.distance })
                gsap.set(backdropRef.current, { opacity: Math.max(0.28, 1 - drag.distance / 360) })
                event.stopPropagation()
              }}
              onPointerUp={(event) => {
                const drag = sheetDragRef.current
                if (drag.pointerId !== event.pointerId) return
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }
                sheetDragRef.current = { pointerId: null, startY: 0, distance: 0 }
                if (drag.distance > 72) {
                  closeTicket()
                } else {
                  gsap.to(sheetRef.current, { y: 0, duration: 0.24, ease: 'power2.out' })
                  gsap.to(backdropRef.current, { opacity: 1, duration: 0.2 })
                }
                event.stopPropagation()
              }}
              onPointerCancel={(event) => {
                sheetDragRef.current = { pointerId: null, startY: 0, distance: 0 }
                gsap.to(sheetRef.current, { y: 0, duration: 0.24, ease: 'power2.out' })
                gsap.to(backdropRef.current, { opacity: 1, duration: 0.2 })
                event.stopPropagation()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') closeTicket()
              }}
            />
            <div className="mobile-ticket-visual" style={{ background: activeTicket.bgColor }}>
              <Graphic name={activeTicket.graphic} size={150} />
            </div>
            <div className="mobile-ticket-heading">
              <h2 className="mobile-ticket-title">{activeTicket.title}</h2>
              <div className="mobile-ticket-logo">
                <Graphic name={activeTicket.logo} size={44} />
              </div>
              <span className="mobile-ticket-letter">{activeTicket.letter}</span>
            </div>
            <div className="mobile-ticket-intro">
              {activeTicket.intro.map((line, index) => (
                <span className="mobile-ticket-intro-line" key={index}>{line}</span>
              ))}
              <button className="mobile-ticket-read" type="button" onClick={openArticle}>
                Read the story
              </button>
            </div>
            {articleIndex != null && (
              <ArticleContent article={articlesByTicketId[tickets[articleIndex].id]} variant="mobile" />
            )}
          </article>
        </div>
      )}

      {articleIndex != null && (
        <div className={`mobile-article-controller mobile-article-controller--${articleControlState}${articleProgress >= 0.995 ? ' mobile-article-controller--ready' : ''}${articleControlState !== 'visible' ? ' mobile-article-controller--disabled' : ''}`}>
          <div className="mobile-article-control-shell">
            <div className="mobile-article-control-bg" />
            <div className="mobile-article-control-content">
              <div
                className="mobile-article-control-progress"
                style={{ transform: `scaleX(${Math.max(0, Math.min(1, articleProgress))})` }}
              />
              <button
                className="mobile-article-control-button"
                type="button"
                onClick={() => window.history.back()}
                disabled={articleProgress < 0.995 || articleControlState !== 'visible'}
                aria-label="Back to ticket"
              >
                <img className="mobile-article-control-arrow" src={caretLeft} alt="" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default MobileView
