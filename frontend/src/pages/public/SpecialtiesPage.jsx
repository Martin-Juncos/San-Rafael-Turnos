import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { specialtiesService } from '../../api/services'

export function SpecialtiesPage () {
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await specialtiesService.list({
          pageSize: 200,
          isActive: 'true'
        })
        if (isCancelled) return
        setSpecialties(result.items)
      } catch (apiError) {
        if (isCancelled) return
        setError(apiError.message || 'No se pudieron cargar las especialidades.')
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    load().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <div className='space-y-6'>
      <section className='glass-card space-y-3 p-6 sm:p-8'>
        <h1 className='text-3xl font-semibold text-emerald-950'>Especialidades</h1>
        <p className='text-sm text-emerald-900/80'>
          Conoce todas las especialidades activas de la Clinica San Rafael Arcangel.
        </p>
        <div className='flex flex-wrap gap-3'>
          <Link to='/'><Button variant='secondary'>Volver al inicio</Button></Link>
          <Link to='/reservar'><Button>Reservar turno</Button></Link>
        </div>
      </section>

      {loading ? <Card className='text-sm text-emerald-900/75'>Cargando especialidades...</Card> : null}
      {!loading && error ? <Card className='text-sm text-red-600'>{error}</Card> : null}

      {!loading && !error
        ? (
          <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {specialties.map((specialty) => (
              <Link key={specialty.id} to={`/especialidades/${specialty.id}/profesionales`} className='block'>
                <Card className='space-y-2 transition-transform duration-150 hover:-translate-y-0.5'>
                  <h2 className='text-lg font-semibold text-emerald-950'>{specialty.name}</h2>
                  <p className='text-sm text-emerald-900/80'>
                    {specialty.description?.trim() || 'Descripcion no disponible por el momento.'}
                  </p>
                  <p className='text-xs font-semibold text-brand-700'>Ver profesionales -&gt;</p>
                </Card>
              </Link>
            ))}
            {specialties.length === 0
              ? (
                <Card className='text-sm text-emerald-900/75'>
                  No hay especialidades activas para mostrar.
                </Card>
                )
              : null}
          </section>
          )
        : null}
    </div>
  )
}
