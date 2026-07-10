import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import Graphic from '../Graphic/Graphic'
import tickets from '../../data/tickets.json'
import articles from '../../data/articles'
import { getPathLength } from '../../utils/pathCache'
import { createCardInteraction } from '../../animations/cardInteraction'
import ArticleView from '../ArticleView/ArticleView'
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
  const swipeStartRef = useRef(null)
  const sheetRef = useRef(null)
  const backdropRef = useRef(null)
  const sheetDragRef = useRef({ pointerId: null, startY: 0, distance: 0 })
  const closeTimelineRef = useRef(null)
  const articleViewRef = useRef(null)
  const articleTransitionApiRef = useRef(null)
  const cardInteraction = useMemo(() => createCardInteraction({
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }), [])

  const openTicket = useCallback((index) => {
    if (dragRef.current.moved) return
    if (occupiedIndexRef.current !== index) return
    closeTimelineRef.current?.kill()
    setIsTicketClosing(false)
    setTicketIndex(index)
  }, [])

  const closeTicket = () => {
    if (isTicketClosing || ticketIndex == null) return
    setIsTicketClosing(true)
    closeTimelineRef.current?.kill()
    closeTimelineRef.current = gsap.timeline({
      onComplete: () => {
        setTicketIndex(null)
        setIsTicketClosing(false)
        closeTimelineRef.current = null
      },
    })
      .to(sheetRef.current, { y: '100%', duration: 0.28, ease: 'power2.in' }, 0)
      .to(backdropRef.current, { autoAlpha: 0, duration: 0.24, ease: 'power1.in' }, 0)
  }
  const selectPrevious = () => setTicketIndex(index => Math.max(0, index - 1))
  const selectNext = () => setTicketIndex(index => Math.min(tickets.length - 1, index + 1))

  const closeArticle = () => {
    articleTransitionApiRef.current?.close()
  }

  const finishArticleClose = useCallback(() => setArticleIndex(null), [])

  useLayoutEffect(() => {
    const view = viewRef.current
    const wrapper = graphicsWrapperRef.current
    if (!view || !wrapper) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let resizeObserver
    let dragZIndex = 10

    const getElements = () => Array.from(wrapper.querySelectorAll('.mobile-graphic'))
    const getSlots = () => Array.from(view.querySelectorAll('.mobile-slot'))

    const layoutGraphics = (animate = false) => {
      const elements = getElements()
      const positions = calculatePositions(elements.length, view.clientWidth, view.clientHeight, GRAPHIC_SIZE)
      occupiedIndexRef.current = null

      elements.forEach((element, index) => {
        const vars = { x: 0, y: 0, left: positions[index].left, top: positions[index].top }
        if (animate && !reduceMotion) {
          gsap.to(element, { ...vars, rotation: gsap.utils.random(-7, 7), duration: 0.48, ease: 'back.out(1.5)' })
        } else {
          gsap.set(element, { ...vars, rotation: gsap.utils.random(-4, 4) })
        }
      })
      draggableInstancesRef.current.forEach(instance => instance.applyBounds(view))
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
        onComplete: () => draggableInstancesRef.current[index]?.update(),
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

      gsap.set(logo, { left: centerLeft, top: centerTop, width: LOGO_INITIAL_SIZE, height: LOGO_INITIAL_SIZE })
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
      timeline.call(() => layoutGraphics(false))
      timeline.to(getElements(), {
        autoAlpha: 1,
        scale: 1,
        duration: reduceMotion ? 0 : 0.38,
        stagger: reduceMotion ? 0 : 0.09,
        ease: 'back.out(1.7)',
        onComplete: setupDraggable,
      }, reduceMotion ? 0 : 0.82)
    }, view)

    let previousWidth = view.clientWidth
    let previousHeight = view.clientHeight
    resizeObserver = new ResizeObserver(() => {
      if (Math.abs(view.clientWidth - previousWidth) < 2 && Math.abs(view.clientHeight - previousHeight) < 2) return
      previousWidth = view.clientWidth
      previousHeight = view.clientHeight
      layoutGraphics(false)
      setupDraggable()
      gsap.set(logoRef.current, {
        left: (view.clientWidth - LOGO_SIZE) / 2,
        top: view.clientHeight - 48 - LOGO_SIZE,
      })
    })
    resizeObserver.observe(view)

    return () => {
      resizeObserver?.disconnect()
      draggableInstancesRef.current.forEach(instance => instance.kill())
      draggableInstancesRef.current = []
      cardInteraction.destroy()
      closeTimelineRef.current?.kill()
      ctx.revert()
    }
  }, [cardInteraction, openTicket])

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
              <h2>{activeTicket.title}</h2>
              <strong>{activeTicket.letter}</strong>
            </div>
            <p>{activeTicket.intro[0]}<br />{activeTicket.intro[1]}</p>
            <button className="mobile-ticket-read" type="button" onClick={() => setArticleIndex(ticketIndex)}>
              Read the story
            </button>
          </article>
        </div>
      )}

      {articleIndex != null && (
        <ArticleView
          article={articles[articleIndex]}
          ticket={tickets[articleIndex]}
          index={articleIndex}
          variant="mobile"
          viewRef={articleViewRef}
          onBack={closeArticle}
          showController
          transitionApiRef={articleTransitionApiRef}
          onTransitionClosed={finishArticleClose}
        />
      )}
    </main>
  )
}

export default MobileView
