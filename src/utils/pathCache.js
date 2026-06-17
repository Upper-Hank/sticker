const CACHED_LEN_ATTR = 'data-cached-len'

export function getPathLength(path) {
  const cached = path.getAttribute(CACHED_LEN_ATTR)
  if (cached !== null) {
    return parseFloat(cached)
  }
  const len = path.getTotalLength()
  path.setAttribute(CACHED_LEN_ATTR, len)
  return len
}

export function clearPathCache(path) {
  path.removeAttribute(CACHED_LEN_ATTR)
}
