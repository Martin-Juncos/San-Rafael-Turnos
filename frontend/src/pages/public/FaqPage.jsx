import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, HelpCircle, Home } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { FAQ_ITEMS } from '../../data/faqs'
import { FaqAccordion } from '../../components/public/FaqAccordion'

export function FaqPage () {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  return (
    <div className='space-y-6'>
      <section className='glass-card space-y-4 p-6 sm:p-8'>
        <h1 className='inline-flex items-center gap-2 text-3xl font-semibold text-emerald-950'>
          <HelpCircle className='h-7 w-7 text-brand-700' />
          Preguntas frecuentes
        </h1>
        <p className='text-sm text-emerald-900/80'>
          Reunimos respuestas a las consultas mas habituales sobre turnos, atencion medica y funcionamiento general de la clinica, para que puedas gestionar tu atencion de forma mas clara, rapida y organizada.
        </p>

        <div className='flex flex-wrap gap-3'>
          <Link to='/'>
            <Button variant='secondary'>
              <span className='inline-flex items-center gap-2'>
                <Home className='h-4 w-4' />
                Volver al inicio
              </span>
            </Button>
          </Link>
          <Link to='/reservar'>
            <Button>
              <span className='inline-flex items-center gap-2'>
                <CalendarCheck2 className='h-4 w-4' />
                Reservar turno
              </span>
            </Button>
          </Link>
        </div>
      </section>

      <Card>
        <FaqAccordion items={FAQ_ITEMS} />
      </Card>
    </div>
  )
}
