import { useState, useRef, useCallback, useEffect } from 'react'

const INITIAL = Object.freeze({
  phase: 'grid',
  gridProgress: 0,
  ticketIndex: 0,
  isAnimating: false,
})

export function useAnimationState() {
  const [state, setState] = useState({ ...INITIAL })
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  })

  const update = useCallback((partial) => {
    setState(prev => ({ ...prev, ...partial }))
  }, [])

  const setPhase = useCallback((phase) => update({ phase }), [update])
  const setGridProgress = useCallback((gridProgress) => update({ gridProgress }), [update])
  const setTicketIndex = useCallback((ticketIndex) => update({ ticketIndex }), [update])
  const setIsAnimating = useCallback((isAnimating) => update({ isAnimating }), [update])

  const setReady = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'grid',
      gridProgress: 1,
      isAnimating: false,
    }))
  }, [])

  const resetToStart = useCallback(() => {
    setState({ ...INITIAL })
  }, [])

  return {
    phase: state.phase,
    gridProgress: state.gridProgress,
    ticketIndex: state.ticketIndex,
    isAnimating: state.isAnimating,
    stateRef,
    setPhase,
    setGridProgress,
    setTicketIndex,
    setIsAnimating,
    setReady,
    resetToStart,
  }
}
