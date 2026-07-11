import ArticleContent from './ArticleContent'
import './DirectArticle.css'

function DirectArticle({ article }) {
  const goHome = () => {
    window.history.pushState({ route: 'home' }, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
  }

  return (
    <main className="direct-article">
      <nav className="direct-article-nav">
        <button type="button" onClick={goHome}>← Back home</button>
      </nav>
      <ArticleContent article={article} />
    </main>
  )
}

export default DirectArticle
