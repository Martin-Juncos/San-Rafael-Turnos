import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { newsService } from '../../api/services'

const formatPublishedAt = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed)
}

export function NewsDetailPage () {
  const { newsId } = useParams()
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!newsId) return
    let isCancelled = false

    const loadDetail = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await newsService.getById(newsId)
        if (isCancelled) return
        setNews(result)
      } catch (apiError) {
        if (isCancelled) return
        setError(apiError.message || 'No se pudo cargar la noticia.')
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadDetail().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [newsId])

  const publishedLabel = useMemo(
    () => formatPublishedAt(news?.publishedAt),
    [news?.publishedAt]
  )

  return (
    <div className='space-y-6'>
      <section className='glass-card space-y-3 p-6 sm:p-8'>
        <h1 className='text-3xl font-semibold text-emerald-950'>Noticia</h1>
        <div className='flex flex-wrap gap-3'>
          <Link to='/noticias'><Button variant='secondary'>Volver a noticias</Button></Link>
          <Link to='/'><Button variant='secondary'>Inicio</Button></Link>
        </div>
      </section>

      {loading ? <Card className='text-sm text-emerald-900/75'>Cargando noticia...</Card> : null}
      {!loading && error ? <Card className='text-sm text-red-600'>{error}</Card> : null}

      {!loading && !error && news
        ? (
          <article className='space-y-4'>
            {news.imageUrl
              ? (
                <Card className='overflow-hidden p-0'>
                  <img
                    src={news.imageUrl}
                    alt={news.title}
                    className='max-h-[420px] w-full object-cover'
                  />
                </Card>
                )
              : null}

            <Card className='space-y-3'>
              <div className='flex flex-wrap items-center gap-2 text-xs text-emerald-900/75'>
                <span className='rounded-full border border-emerald-200 bg-white/70 px-2 py-0.5 font-semibold'>
                  {news.category || 'Salud'}
                </span>
                {publishedLabel ? <span>{publishedLabel}</span> : null}
              </div>

              <h2 className='text-2xl font-semibold text-emerald-950'>{news.title}</h2>
              {news.description
                ? <p className='text-sm text-emerald-900/85'>{news.description}</p>
                : null}
            </Card>

            <Card className='space-y-4'>
              {(news.content || []).map((paragraph, index) => (
                <p key={`paragraph-${index}`} className='text-[15px] leading-relaxed text-emerald-900/90'>
                  {paragraph}
                </p>
              ))}
              {(news.content || []).length === 0
                ? <p className='text-sm text-emerald-900/75'>No hay contenido disponible para esta noticia.</p>
                : null}
            </Card>
          </article>
          )
        : null}
    </div>
  )
}
