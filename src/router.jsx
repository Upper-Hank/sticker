import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import articlesByTicketId from './articles/registry'

const articleRoutes = Object.values(articlesByTicketId).map(article => ({
  path: article.slug,
  element: <App />,
}))

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  ...articleRoutes,
  { path: '*', element: <Navigate to="/" replace /> },
])

export default router
