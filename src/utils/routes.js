import articlesByTicketId from '../articles/registry'
import tickets from '../data/tickets.json'

export const HOME_PATH = '/'

export function getArticlePath(ticketId) {
  return `/${articlesByTicketId[ticketId].slug}`
}

export function getArticleIndex(pathname = window.location.pathname) {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  if (!slug) return null

  return tickets.findIndex(ticket => articlesByTicketId[ticket.id]?.slug === slug)
}

export function isKnownPath(pathname = window.location.pathname) {
  return pathname === HOME_PATH || getArticleIndex(pathname) >= 0
}
