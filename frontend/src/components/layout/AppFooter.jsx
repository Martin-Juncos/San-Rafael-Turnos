import { Link } from 'react-router-dom'
import { SiFacebook, SiInstagram, SiLinkedin, SiX } from 'react-icons/si'
import { useReserveLink } from '../../hooks/useReserveLink'

export function AppFooter () {
  const reserveLink = useReserveLink()

  return (
    <footer className='border-t border-emerald-200/70 bg-white/45 backdrop-blur-xl print:hidden'>
      <div className='mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1fr_auto_1fr] lg:items-start'>
          <div className='order-2 space-y-3 lg:order-1'>
            <h4 className='text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70'>
              Clinica
            </h4>
            <div className='grid gap-2 text-sm text-emerald-900/85'>
              <Link to='/' className='transition hover:text-brand-700'>Inicio</Link>
              <Link to='/sobre-nosotros' className='transition hover:text-brand-700'>Sobre nosotros</Link>
              <Link to='/especialidades' className='transition hover:text-brand-700'>Especialidades</Link>
              <Link to='/profesionales' className='transition hover:text-brand-700'>Profesionales</Link>
            </div>
          </div>

          <div className='order-1 col-span-2 flex flex-col items-center gap-3 text-center lg:order-2 lg:col-span-1'>
            <h3 className='text-xl font-semibold text-emerald-950 sm:text-2xl'>
              Clinica San Rafael Arcangel
            </h3>
            <p className='max-w-lg text-sm text-emerald-900/80 sm:text-base'>
              Salud de calidad con cercania, organizacion e innovacion.
            </p>
            <div className='flex flex-wrap items-center gap-4 sm:gap-5'>
              <a
                href='https://www.facebook.com'
                target='_blank'
                rel='noreferrer'
                aria-label='Facebook'
                className='inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200/80 bg-white/70 text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white sm:h-14 sm:w-14'
              >
                <SiFacebook className='h-6 w-6' />
              </a>
              <a
                href='https://www.instagram.com'
                target='_blank'
                rel='noreferrer'
                aria-label='Instagram'
                className='inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200/80 bg-white/70 text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white sm:h-14 sm:w-14'
              >
                <SiInstagram className='h-6 w-6' />
              </a>
              <a
                href='https://www.linkedin.com'
                target='_blank'
                rel='noreferrer'
                aria-label='LinkedIn'
                className='inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200/80 bg-white/70 text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white sm:h-14 sm:w-14'
              >
                <SiLinkedin className='h-6 w-6' />
              </a>
              <a
                href='https://x.com'
                target='_blank'
                rel='noreferrer'
                aria-label='Twitter / X'
                className='inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200/80 bg-white/70 text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white sm:h-14 sm:w-14'
              >
                <SiX className='h-6 w-6' />
              </a>
            </div>
          </div>

          <div className='order-3 space-y-3 text-right lg:order-3'>
            <h4 className='text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900/70'>
              Atencion
            </h4>
            <div className='grid justify-items-end gap-2 text-sm text-emerald-900/85'>
              <Link to={reserveLink} className='transition hover:text-brand-700'>Reservar turno</Link>
              <Link to='/noticias' className='transition hover:text-brand-700'>Noticias</Link>
              <Link to='/preguntas-frecuentes' className='transition hover:text-brand-700'>
                Preguntas frecuentes
              </Link>
              <a href='/#contacto' className='transition hover:text-brand-700'>Contacto</a>
              <Link to='/ingresar' className='transition hover:text-brand-700'>Ingresar</Link>
            </div>
          </div>
        </div>

        <div className='mt-8 h-px w-full bg-emerald-200/80' />
        <p className='mt-4 text-center text-xs text-emerald-900/70'>
          (c) 2026 Clinica San Rafael Arcangel. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
