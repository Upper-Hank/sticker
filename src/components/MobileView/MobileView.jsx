import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import Graphic from '../Graphic/Graphic'
import tickets from '../../data/tickets.json'
import { getPathLength } from '../../utils/pathCache'
import './MobileView.css'

gsap.registerPlugin(Draggable, InertiaPlugin)

const graphicsList = tickets.map(t => t.graphic)
const GRAPHIC_SIZE = 100
const MESSAGE = 'Please open on desktop'
const SUB_MESSAGE = 'or you can drag these stickers'
const LOGO_SIZE = 30
const LOGO_INITIAL_SIZE = 80

function calculatePositions(count, vw, vh, size) {
  const margin = 24
  const availW = vw - margin * 2
  const centerY = vh * 0.48
  const rowGap = size * 1.3

  const rows = count <= 4
    ? [{ cols: count, y: centerY }]
    : [
      { cols: 3, y: centerY - rowGap / 2 },
      { cols: count - 3, y: centerY + rowGap / 2 },
    ]

  const positions = []
  let idx = 0

  for (const row of rows) {
    const spacing = availW / (row.cols + 1)
    for (let c = 0; c < row.cols && idx < count; c++) {
      positions.push({
        left: margin + spacing * (c + 1) - size / 2,
        top: row.y - size / 2,
      })
      idx++
    }
  }

  return positions
}

function MobileView() {
  const viewRef = useRef(null)
  const logoRef = useRef(null)
  const messageRef = useRef(null)
  const subMessageRef = useRef(null)
  const graphicsWrapperRef = useRef(null)
  const draggableInstancesRef = useRef([])

  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view) return

    const ctx = gsap.context(() => {
      const vw = view.clientWidth
      const vh = view.clientHeight

      const centerX = (vw - LOGO_INITIAL_SIZE) / 2
      const centerY = (vh - LOGO_INITIAL_SIZE) / 2
      const logoFinalX = (vw - LOGO_SIZE) / 2
      const logoBottomY = vh - 48 - LOGO_SIZE

      const logoEl = logoRef.current
      const logoPaths = logoEl
        ? Array.from(logoEl.querySelectorAll('.graphic-path'))
        : []
      const bodyPath = logoPaths[0]
      const tickPath = logoPaths[1]

      logoPaths.forEach((path) => {
        const len = getPathLength(path)
        if (!len) return
        gsap.set(path, {
          autoAlpha: 0,
          strokeDasharray: `${len} ${len * 2}`,
          strokeDashoffset: len,
        })
      })

      gsap.set(logoEl, {
        position: 'absolute',
        left: centerX,
        top: centerY,
        width: LOGO_INITIAL_SIZE,
        height: LOGO_INITIAL_SIZE,
      })

      const chars = messageRef.current?.querySelectorAll('.mobile-char')
      const subChars = subMessageRef.current?.querySelectorAll('.mobile-char')
      gsap.set(chars, { autoAlpha: 0, y: 8 })
      gsap.set(subChars, { autoAlpha: 0, y: 8 })

      const graphics = graphicsWrapperRef.current?.querySelectorAll('.mobile-graphic')
      const graphicsArray = Array.from(graphics)
      const positions = calculatePositions(graphicsArray.length, vw, vh, GRAPHIC_SIZE)

      graphicsArray.forEach((el, i) => {
        gsap.set(el, { left: positions[i].left, top: positions[i].top })
      })
      gsap.set(graphics, { autoAlpha: 0, scale: 0 })

      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })

      const bodyDuration = 0.5
      const tickDuration = 0.35
      let strokeEnd = 0

      if (bodyPath) {
        tl.set(bodyPath, { autoAlpha: 1 }, 0)
        tl.to(bodyPath, {
          strokeDashoffset: 0,
          duration: bodyDuration,
          ease: 'power3.in',
        }, 0)

        strokeEnd = bodyDuration

        if (tickPath) {
          tl.set(tickPath, { autoAlpha: 1 }, strokeEnd + 0.05)
          tl.to(tickPath, {
            strokeDashoffset: 0,
            duration: tickDuration,
            ease: 'power3.out',
          }, strokeEnd + 0.05)

          strokeEnd += 0.05 + tickDuration
        }
      }

      tl.to(logoEl, {
        left: logoFinalX,
        top: logoBottomY,
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        duration: 0.55,
        ease: 'power3.inOut',
      }, strokeEnd + 0.3)

      const textStart = strokeEnd + 0.5
      const allChars = [...(chars || []), ...(subChars || [])]

      if (allChars.length) {
        tl.to(allChars, {
          autoAlpha: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.05,
          ease: 'power2.out',
        }, textStart)
      }

      const textDuration = allChars.length ? (allChars.length - 1) * 0.05 + 0.45 : 0

      const textMoveStart = textStart + textDuration + 0.25
      const textMoveTargetY = logoBottomY - LOGO_SIZE - 22

      tl.to(messageRef.current, {
        top: textMoveTargetY,
        duration: 0.5,
        ease: 'power2.inOut',
      }, textMoveStart)

      tl.to(subMessageRef.current, {
        top: textMoveTargetY + 22,
        duration: 0.5,
        ease: 'power2.inOut',
      }, textMoveStart)

      const graphicsStart = textMoveStart + 0.5 + 0.2

      if (graphics && graphics.length) {
        tl.to(graphics, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.4,
          stagger: 0.12,
          ease: 'back.out(1.7)',
        }, graphicsStart)
      }

      const lastGraphicDelay = graphics
        ? (graphics.length - 1) * 0.12 + 0.4
        : 0
      const draggableStart = graphicsStart + lastGraphicDelay

      tl.call(() => {
        let dragZIndex = 0
        draggableInstancesRef.current = graphicsArray.map(el =>
          Draggable.create(el, {
            type: 'left,top',
            bounds: view,
            inertia: true,
            edgeResistance: 0.5,
            zIndexBoost: false,
            onDragStart() {
              dragZIndex += 1
              gsap.set(el, { zIndex: dragZIndex })
            },
          })
        )
      }, [], draggableStart)
    }, viewRef)

    return () => {
      draggableInstancesRef.current.forEach(d => d[0]?.kill())
      draggableInstancesRef.current = []
      ctx.revert()
    }
  }, [])

  const renderMessage = (text) =>
    text.split(' ').map((word, i, arr) => (
      <span key={i} className="mobile-char">
        {word}{i < arr.length - 1 ? '\u00A0' : ''}
      </span>
    ))

  return (
    <div className="mobile-view" ref={viewRef}>
      <div className="mobile-logo" ref={logoRef}>
        <Graphic name="logo" size={LOGO_INITIAL_SIZE} />
      </div>
      <p className="mobile-message" ref={messageRef}>
        {renderMessage(MESSAGE)}
      </p>
      <p className="mobile-message mobile-message--sub" ref={subMessageRef}>
        {renderMessage(SUB_MESSAGE)}
      </p>
      <div className="mobile-graphics" ref={graphicsWrapperRef}>
        {graphicsList.map((name, i) => (
          <div
            key={`${name}-${i}`}
            className="mobile-graphic"
          >
            <Graphic name={name} size={GRAPHIC_SIZE} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default MobileView
