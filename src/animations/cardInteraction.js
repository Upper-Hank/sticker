import gsap from 'gsap'
import { getPathLength } from '../utils/pathCache'

const PRESS_DURATION = 0.48
const RELEASE_DURATION = 0.42
const RELEASE_GRACE_MS = 120

export function createCardInteraction() {
  const stateMap = new WeakMap()
  const pathDataCache = new WeakMap()
  const activeCards = new Set()

  const getPaths = (card) => {
    const cached = pathDataCache.get(card)
    if (cached) return cached

    const data = Array.from(card.querySelectorAll('.graphic-path'))
      .map((path) => {
        const len = getPathLength(path)
        return { path, len, dash: `${len} ${len}` }
      })
      .filter(({ len }) => len > 0)

    pathDataCache.set(card, data)
    return data
  }

  const render = (state) => {
    const progress = gsap.utils.clamp(0, 1, state.progress.value)
    gsap.set(state.card, { scale: 1 + progress * 0.12 })

    state.paths.forEach(({ path, len, dash }) => {
      gsap.set(path, {
        autoAlpha: progress < 0.995 ? 1 : 0,
        strokeDasharray: dash,
        strokeDashoffset: -len * progress,
      })
    })
  }

  const clearReleaseTimer = (state) => {
    if (state.releaseTimer == null) return
    window.clearTimeout(state.releaseTimer)
    state.releaseTimer = null
  }

  const cleanup = (state, resumeQueuedPress = true) => {
    clearReleaseTimer(state)
    state.tween?.kill()
    state.tween = null
    state.pressed = false
    state.releaseRequested = false
    state.locked = false
    state.progress.value = 0
    render(state)
    gsap.set(state.card, { clearProps: 'transform,willChange' })

    if (resumeQueuedPress && state.queuedPressed) {
      state.pressed = true
      state.pointerId = state.queuedPointerId
      state.queuedPressed = false
      state.queuedPointerId = null
      gsap.set(state.card, { willChange: 'transform' })
      animateToPressed(state)
      return
    }

    if (state.queuedPointerId != null && state.card.hasPointerCapture?.(state.queuedPointerId)) {
      state.card.releasePointerCapture(state.queuedPointerId)
    }
    stateMap.delete(state.card)
    activeCards.delete(state.card)
  }

  const animateToRest = (state) => {
    state.tween?.kill()
    state.direction = 'release'
    const paths = state.paths.map(({ path }) => path)
    const timeline = gsap.timeline({ onComplete: () => cleanup(state) })

    timeline.set(paths, { autoAlpha: 0 }, 0)
    state.paths.forEach(({ path, len, dash }) => {
      timeline.set(path, {
        strokeDasharray: dash,
        strokeDashoffset: len,
      }, 0)
      timeline.set(path, { autoAlpha: 1 }, 0.045)
      timeline.to(path, {
        strokeDashoffset: 0,
        duration: RELEASE_DURATION,
        ease: 'power2.inOut',
      }, 0)
    })

    timeline.to(state.card, {
      scale: 1,
      duration: 0.46,
      ease: 'back.out(2.1)',
    }, 0)

    state.tween = timeline
  }

  const animateToPressed = (state) => {
    if (state.direction === 'press' && state.tween?.isActive()) return

    state.tween?.kill()
    state.direction = 'press'
    state.tween = gsap.to(state.progress, {
      value: 1,
      duration: PRESS_DURATION * (1 - state.progress.value),
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => render(state),
      onComplete: () => {
        state.tween = null
        if (state.releaseRequested && !state.pressed) animateToRest(state)
      },
    })
  }

  const getState = (card) => {
    const existing = stateMap.get(card)
    if (existing) return existing

    const state = {
      card,
      paths: getPaths(card),
      progress: { value: 0 },
      tween: null,
      direction: null,
      pointerId: null,
      pressed: false,
      releaseRequested: false,
      locked: false,
      queuedPressed: false,
      queuedPointerId: null,
      releaseTimer: null,
    }

    stateMap.set(card, state)
    activeCards.add(card)
    render(state)
    return state
  }

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return

    const card = event.currentTarget
    const state = getState(card)
    if (state.locked) {
      state.queuedPressed = true
      state.queuedPointerId = event.pointerId
      card.setPointerCapture(event.pointerId)
      return
    }
    clearReleaseTimer(state)
    state.pressed = true
    state.releaseRequested = false
    state.pointerId = event.pointerId

    card.setPointerCapture(event.pointerId)
    gsap.set(card, { willChange: 'transform' })
    animateToPressed(state)
  }

  const finish = (event) => {
    const state = stateMap.get(event.currentTarget)
    if (state?.locked && state.queuedPointerId === event.pointerId) {
      if (state.card.hasPointerCapture?.(event.pointerId)) {
        state.card.releasePointerCapture(event.pointerId)
      }
      state.queuedPressed = false
      state.queuedPointerId = null
      return
    }
    if (!state || state.pointerId !== event.pointerId) return

    if (state.card.hasPointerCapture?.(event.pointerId)) {
      state.card.releasePointerCapture(event.pointerId)
    }

    state.pressed = false
    state.pointerId = null
    clearReleaseTimer(state)
    state.releaseTimer = window.setTimeout(() => {
      state.releaseTimer = null
      if (state.pressed) return

      state.locked = true
      state.releaseRequested = true
      if (state.progress.value >= 0.999 && !state.tween) {
        animateToRest(state)
      } else {
        animateToPressed(state)
      }
    }, RELEASE_GRACE_MS)
  }

  const cancelAll = () => {
    Array.from(activeCards).forEach(card => {
      const state = stateMap.get(card)
      if (state) cleanup(state, false)
    })
  }

  return {
    onPointerDown,
    onPointerUp: finish,
    onPointerCancel: finish,
    cancelAll,
    destroy: cancelAll,
  }
}
