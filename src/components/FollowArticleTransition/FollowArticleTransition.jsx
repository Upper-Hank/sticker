import { useLayoutEffect } from 'react'
import gsap from 'gsap'

const REFLOW_SELECTOR = '.ticket-title, .ticket-letter, .ticket-logo'

function getRect(element) {
  const rect = element.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function setViewportOrigin(element, from, to, scale = true) {
  gsap.set(element, {
    x: from.left - to.left,
    y: from.top - to.top,
    scaleX: scale && to.width ? from.width / to.width : 1,
    scaleY: scale && to.height ? from.height / to.height : 1,
    transformOrigin: '0 0',
  })
}

function FollowArticleTransition({ sourceElement, apiRef, onClosed, onProgress }) {
  useLayoutEffect(() => {
    if (!sourceElement) return

    const sourceItem = sourceElement.closest('.ticket-stack-item')
    const world = sourceItem?.parentElement
    if (!sourceItem || !world) return

    const reflowElements = Array.from(sourceElement.querySelectorAll(REFLOW_SELECTOR))
    const articleContent = sourceElement.querySelector('.ticket-article')
    const intro = sourceElement.querySelector('.ticket-intro')
    const headBackdrop = sourceElement.querySelector('.ticket-head-backdrop')
    const typeElements = Array.from(sourceElement.querySelectorAll('.ticket-title, .ticket-letter'))
    const logoGraphic = sourceElement.querySelector('.ticket-logo .graphic')
    const localAnimatedElements = [sourceElement, articleContent, intro, headBackdrop, ...reflowElements].filter(Boolean)

    // The parent item and stage are also targets of the prebuilt ticket/scatter
    // timelines in App. Killing their tweens here permanently removes those
    // paused future steps, so article transitions only own their local DOM.
    gsap.killTweensOf([...localAnimatedElements, logoGraphic].filter(Boolean))
    sourceElement.classList.remove('ticket-right--article', 'ticket-right--prelude')
    gsap.set(localAnimatedElements, { clearProps: 'all' })
    gsap.set(logoGraphic, { width: 60, height: 60 })
    gsap.set(world, { clearProps: 'transform' })
    sourceElement.scrollTo(0, 0)

    const sourceRect = getRect(sourceElement)
    if (!sourceRect.width) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const followDuration = reduceMotion ? 0 : 0.78
    const expansionDuration = reduceMotion ? 0 : 0.95
    const overscan = 48
    const articlePaddingX = Math.max(40, (window.innerWidth - 1200) / 2) + overscan
    const articlePaddingTop = 36 + overscan
    const articlePaddingBottom = 150 + overscan
    const originalZIndex = sourceItem.style.zIndex
    const cameraDistance = sourceRect.left + 840
    const compactWidth = Math.min(900, window.innerWidth - 80)
    const compactHeight = 160
    const compactLeft = (window.innerWidth - compactWidth) / 2
    const compactTop = (window.innerHeight - compactHeight) / 2
    const centeredX = compactLeft - sourceRect.left + cameraDistance
    const centeredY = compactTop - sourceRect.top
    const fullScreenX = -sourceRect.left + cameraDistance - overscan
    let expansionTimeline = null
    let isClosing = false
    let resizeFrame = null

    const updateProgress = () => {
      const maxScroll = sourceElement.scrollHeight - sourceElement.clientHeight
      onProgress(maxScroll > 0 ? sourceElement.scrollTop / maxScroll : 1)
    }

    const refreshExpandedLayout = () => {
      if (!expansionTimeline || expansionTimeline.progress() < 0.999 || expansionTimeline.reversed()) return
      const rect = getRect(sourceElement)
      const currentX = Number(gsap.getProperty(sourceElement, 'x')) || 0
      const currentY = Number(gsap.getProperty(sourceElement, 'y')) || 0
      const paddingX = Math.max(40, (window.innerWidth - 1200) / 2) + overscan

      gsap.set(sourceElement, {
        x: currentX - overscan - rect.left,
        y: currentY - overscan - rect.top,
        width: window.innerWidth + overscan * 2,
        height: window.innerHeight + overscan * 2,
        paddingRight: paddingX,
        paddingLeft: paddingX,
      })
      updateProgress()
    }

    const handleResize = () => {
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null
        refreshExpandedLayout()
      })
    }

    window.addEventListener('resize', handleResize, { passive: true })
    window.visualViewport?.addEventListener('resize', handleResize, { passive: true })

    const restoreCenteredState = () => {
      sourceElement.classList.remove('ticket-right--article')
      sourceElement.classList.add('ticket-right--prelude')
      gsap.set([articleContent, headBackdrop].filter(Boolean), { clearProps: 'all' })
      gsap.set(sourceElement, { clearProps: 'all' })
      gsap.set(sourceElement, {
        x: centeredX,
        y: centeredY,
        width: compactWidth,
        height: compactHeight,
        borderRadius: 32,
        paddingTop: 30,
        paddingRight: 48,
        paddingBottom: 30,
        paddingLeft: 48,
        autoAlpha: 1,
        willChange: 'transform,width,height',
      })
      sourceElement.scrollTop = 0
    }

    const buildExpansion = () => {
      const startRects = new Map(reflowElements.map(element => [element, getRect(element)]))

      sourceElement.classList.remove('ticket-right--prelude')
      sourceElement.classList.add('ticket-right--article')
      gsap.set(sourceElement, {
        x: centeredX,
        y: centeredY,
        width: compactWidth,
        height: compactHeight,
        borderRadius: 32,
        paddingTop: 30,
        paddingRight: 48,
        paddingBottom: 30,
        paddingLeft: 48,
      })
      sourceElement.scrollTo(0, 0)

      reflowElements.forEach((element) => {
        setViewportOrigin(element, startRects.get(element), getRect(element))
      })

      gsap.set(articleContent, { autoAlpha: 0, y: 56 })

      expansionTimeline = gsap.timeline({
        paused: true,
        defaults: { ease: 'power3.inOut' },
        onComplete: () => {
          sourceElement.scrollTo(0, 0)
          sourceElement.addEventListener('scroll', updateProgress, { passive: true })
          updateProgress()
        },
        onReverseComplete: () => {
          restoreCenteredState()
          followTimeline.reverse()
        },
      })
        .to(sourceElement, {
          x: fullScreenX,
          y: -sourceRect.top - overscan,
          width: window.innerWidth + overscan * 2,
          height: window.innerHeight + overscan * 2,
          borderRadius: 32,
          paddingTop: articlePaddingTop,
          paddingRight: articlePaddingX,
          paddingBottom: articlePaddingBottom,
          paddingLeft: articlePaddingX,
          duration: expansionDuration,
        }, 0)
        .to(reflowElements, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: reduceMotion ? 0 : 0.68,
        }, reduceMotion ? 0 : 0.14)
        .to(headBackdrop, {
          opacity: 1,
          duration: reduceMotion ? 0 : 0.4,
          ease: 'power2.out',
        }, reduceMotion ? 0 : 0.4)
        .to(articleContent, {
          autoAlpha: 1,
          y: 0,
          duration: reduceMotion ? 0 : 0.46,
          ease: 'power2.out',
        }, reduceMotion ? 0 : 0.58)
        .call(() => {
          if (expansionTimeline?.reversed()) sourceElement.scrollTo(0, 0)
        }, null, reduceMotion ? 0 : 0.57)

      expansionTimeline.play(0)
    }

    // Ticket step timelines may leave the selected stack item hidden while
    // React has already accepted the article request. The article lives inside
    // that item, so make its parent explicitly visible for the whole transition.
    gsap.set(world, { autoAlpha: 1 })
    gsap.set(sourceItem, { zIndex: 899, autoAlpha: 1 })
    gsap.set(sourceElement, { willChange: 'transform,width,height' })
    onProgress(0)

    const ticketRects = new Map(reflowElements.map(element => [element, getRect(element)]))
    const introRect = getRect(intro)
    sourceElement.classList.add('ticket-right--prelude')
    gsap.set(sourceElement, {
      x: 0,
      y: 0,
      width: sourceRect.width,
      height: sourceRect.height,
      borderRadius: 32,
    })
    reflowElements.forEach((element) => {
      setViewportOrigin(element, ticketRects.get(element), getRect(element), false)
    })
    const introPreludeRect = getRect(intro)
    gsap.set(intro, {
      x: introRect.left - introPreludeRect.left,
      y: introRect.top - introPreludeRect.top,
    })

    const followTimeline = gsap.timeline({
      paused: true,
      onComplete: buildExpansion,
      onReverseComplete: onClosed,
    })
      .to(world, {
        x: -cameraDistance,
        duration: followDuration,
        ease: 'power3.inOut',
      }, 0)
      .to(sourceElement, {
        x: centeredX,
        y: centeredY,
        width: compactWidth,
        height: compactHeight,
        borderRadius: 32,
        duration: followDuration,
        ease: 'power3.inOut',
      }, 0)
      .to(reflowElements, {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: followDuration,
        ease: 'power3.inOut',
      }, 0)
      .to(typeElements, {
        fontSize: 28,
        lineHeight: '32px',
        duration: reduceMotion ? 0 : 0.6,
        ease: 'power2.inOut',
      }, reduceMotion ? 0 : 0.06)
      .to(logoGraphic, {
        width: 44,
        height: 44,
        duration: reduceMotion ? 0 : 0.6,
        ease: 'power2.inOut',
      }, reduceMotion ? 0 : 0.06)
      .to(intro, {
        autoAlpha: 0,
        y: -10,
        filter: 'blur(5px)',
        duration: reduceMotion ? 0 : 0.4,
        ease: 'power2.inOut',
      }, reduceMotion ? 0 : 0.08)

    apiRef.current = {
      close: () => {
        if (isClosing) return
        isClosing = true
        sourceElement.removeEventListener('scroll', updateProgress)
        if (expansionTimeline) {
          expansionTimeline.reverse()
        } else {
          followTimeline.reverse()
        }
      },
    }

    followTimeline.play(0)

    return () => {
      sourceElement.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame)
      expansionTimeline?.kill()
      followTimeline.kill()
      apiRef.current = null
      sourceItem.style.zIndex = originalZIndex
      sourceElement.classList.remove('ticket-right--article', 'ticket-right--prelude')
      gsap.set(localAnimatedElements, { clearProps: 'all' })
      gsap.set(logoGraphic, { width: 60, height: 60 })
      gsap.set(world, { clearProps: 'transform', autoAlpha: 1 })
      gsap.set(sourceItem, { autoAlpha: 1 })
    }
  }, [apiRef, onClosed, onProgress, sourceElement])

  return null
}

export default FollowArticleTransition
