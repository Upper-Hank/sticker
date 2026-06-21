import gsap from 'gsap'
import { getPathLength } from '../utils/pathCache'

// Temporarily offline. This factory preserves the card press/SVG erase-draw
// interaction without wiring it into Card or Ticket.
export function createCardInteraction({ canAnimate, isIntroActive }) {
  const pressMap = new WeakMap()
  const animationMap = new WeakMap()
  const pathDataCache = new WeakMap()
  const eraseDuration = 0.6

  const getPaths = (card) => {
    if (pathDataCache.has(card)) return pathDataCache.get(card)
    const data = Array.from(card.querySelectorAll('.graphic-path')).map((path) => {
      const len = getPathLength(path)
      return { path, len, dash: `${len} ${len * 2}` }
    })
    pathDataCache.set(card, data)
    return data
  }

  const setVisible = (data) => data.forEach(({ path, dash }) => gsap.set(path, {
    autoAlpha: 1, strokeDasharray: dash, strokeDashoffset: 0,
  }))

  const cleanup = (card) => {
    pressMap.delete(card)
    animationMap.delete(card)
    gsap.set(card, { scale: 1, clearProps: 'willChange' })
  }

  const reset = (card) => {
    setVisible(getPaths(card))
    cleanup(card)
  }

  const onPointerDown = (event) => {
    if (!canAnimate() || isIntroActive()) return
    const card = event.currentTarget
    if (animationMap.has(card)) return
    card.setPointerCapture(event.pointerId)
    const data = getPaths(card)
    setVisible(data)
    const tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onInterrupt: () => reset(card),
    })
    tl.set(card, { willChange: 'transform' })
      .to(card, { scale: 1.18, duration: eraseDuration, ease: 'power2.out' }, 0)
    data.forEach(({ path, len }) => tl.to(path, {
      strokeDashoffset: -len, duration: eraseDuration, ease: 'power2.inOut',
    }, 0))
    tl.set(data.map(({ path }) => path), { autoAlpha: 0 }, eraseDuration - 0.025)
    pressMap.set(card, { tl, data, pointerId: event.pointerId })
    animationMap.set(card, tl)
  }

  const finish = (event) => {
    const card = event.currentTarget
    if (card.hasPointerCapture?.(event.pointerId)) card.releasePointerCapture(event.pointerId)
    const state = pressMap.get(card)
    if (!state || state.pointerId !== event.pointerId) return
    state.tl.kill()
    pressMap.delete(card)
    const paths = state.data.map(({ path }) => path)
    const tl = gsap.timeline({ onComplete: () => cleanup(card), onInterrupt: () => reset(card) })
    tl.set(paths, { autoAlpha: 0 })
    state.data.forEach(({ path, len, dash }) => {
      tl.set(path, { autoAlpha: 0, strokeDasharray: dash, strokeDashoffset: len }, 0)
      tl.set(path, { autoAlpha: 1 }, 0.045)
      tl.to(path, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' }, 0)
    })
    tl.to(card, { scale: 1, duration: 0.46, ease: 'back.out(2.1)' }, 0)
    animationMap.set(card, tl)
  }

  const destroy = () => {
    // WeakMaps are intentionally not enumerable; active timelines remain owned
    // by their GSAP context when this factory is eventually wired back in.
  }

  return { onPointerDown, onPointerUp: finish, onPointerCancel: finish, destroy }
}
