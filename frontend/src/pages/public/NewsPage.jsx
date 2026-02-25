import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { NewsCard } from '../../components/public/NewsCard'
import { newsService } from '../../api/services'

export function NewsPage () {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCancelled = false

    const loadNews = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await newsService.list({ limit: 18 })
        if (isCancelled) return
        setItems(result.items)
      } catch (apiError) {
        if (isCancelled) return
        setError(apiError.message || 'No se pudieron cargar las noticias de salud.')
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadNews().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <div className='space-y-6'>
      <section className='glass-card space-y-3 p-6 sm:p-8'>
        <h1 className='text-3xl font-semibold text-emerald-950'>Noticias de salud</h1>
        <p className='text-sm text-emerald-900/80'>
          Novedades y articulos de interes general para pacientes y profesionales.
        </p>
        <div className='flex flex-wrap gap-3'>
          <Link to='/'><Button variant='secondary'>Volver al inicio</Button></Link>
          <Link to='/reservar'><Button>Reservar turno</Button></Link>
        </div>
      </section>

      {loading ? <Card className='text-sm text-emerald-900/75'>Cargando noticias...</Card> : null}
      {!loading && error ? <Card className='text-sm text-red-600'>{error}</Card> : null}

      {!loading && !error
        ? (
          <>
            <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </section>

            {items.length === 0
              ? <Card className='text-sm text-emerald-900/75'>No hay noticias disponibles en este momento.</Card>
              : null}
          </>
          )
        : null}
    </div>
  )
}
