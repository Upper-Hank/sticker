import { useRef, useLayoutEffect } from 'react'
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import Graphic from '../Graphic/Graphic'
import tickets from '../../data/tickets.json'
import './MobileView.css'

gsap.registerPlugin(Draggable, InertiaPlugin)

const graphicsList = tickets.map(t => t.graphic)
const GRAPHIC_SIZE = 100

function MobileView() {
  const viewRef = useRef(null)
  const draggableRefs = useRef([])

  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view) return

    const vw = view.clientWidth
    const vh = view.clientHeight
    const maxX = vw - GRAPHIC_SIZE
    const maxY = vh - GRAPHIC_SIZE

    const ctx = gsap.context(() => {
      const els = draggableRefs.current.filter(Boolean)

      els.forEach(el => {
        const randX = gsap.utils.random(0, maxX)
        const randY = gsap.utils.random(0, maxY)
        gsap.set(el, { x: randX, y: randY })

        Draggable.create(el, {
          type: 'x,y',
          bounds: view,
          inertia: true,
          edgeResistance: 0.5,
          onDragStart() {
            gsap.set(el, { zIndex: 100 })
          },
        })
      })
    }, viewRef)

    return () => ctx.revert()
  }, [])

  const setDraggableRef = (i) => (el) => {
    draggableRefs.current[i] = el
  }

  return (
    <div className="mobile-view" ref={viewRef}>
      {graphicsList.map((name, i) => (
        <div
          key={`${name}-${i}`}
          className="mobile-graphic"
          ref={setDraggableRef(i)}
        >
          <Graphic name={name} size={GRAPHIC_SIZE} />
        </div>
      ))}
      <p className="mobile-message">Coming soon to mobile</p>
      <div className="mobile-logo">
        <Graphic name="logo" size={40} />
      </div>
    </div>
  )
}

export default MobileView
