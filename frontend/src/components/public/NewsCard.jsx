import { Card } from '../ui/Card'
import { Link } from 'react-router-dom'

const formatPublishedAt = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed)
}

export function NewsCard ({ item, compact = false }) {
  const publishedAt = formatPublishedAt(item?.publishedAt)
  const detailPath = `/noticias/${item?.id || ''}`

  return (
    <Link to={detailPath} className='group block'>
      <Card className='overflow-hidden p-0 transition-transform duration-150 hover:-translate-y-0.5'>
        <div className='h-40 w-full bg-emerald-100'>
          {item?.imageUrl
            ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                loading='lazy'
                className='h-full w-full object-cover'
              />
              )
            : <div className='flex h-full items-center justify-center text-sm text-emerald-900/70'>Sin imagen</div>}
        </div>
        <div className='space-y-3 p-4'>
          <div className='flex flex-wrap items-center gap-2 text-xs text-emerald-900/75'>
            <span className='rounded-full border border-emerald-200 bg-white/70 px-2 py-0.5 font-semibold'>
              {item?.category || 'Salud'}
            </span>
            {publishedAt ? <span>{publishedAt}</span> : null}
          </div>

          <h3 className='text-base font-semibold text-emerald-950 group-hover:text-brand-700'>{item?.title || 'Noticia'}</h3>
          {!compact
            ? <p className='text-sm text-emerald-900/80'>{item?.description || 'Sin resumen disponible.'}</p>
            : null}
        </div>
      </Card>
    </Link>
  )
}
