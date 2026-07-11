import './ArticleContent.css'

function ArticleContent({ article, variant = 'desktop' }) {
  const Content = article.Content
  const isMobile = variant === 'mobile'
  const rootClass = isMobile ? 'mobile-ticket-article' : 'ticket-article'
  const heroClass = isMobile ? 'mobile-article-hero' : 'ticket-article-hero'
  const bodyClass = isMobile ? 'mobile-article-body' : 'ticket-article-body'

  return (
    <div className={rootClass}>
      <header className={heroClass}>
        <h1>{article.title}</h1>
      </header>
      <div className={bodyClass}>
        <Content />
      </div>
    </div>
  )
}

export default ArticleContent
