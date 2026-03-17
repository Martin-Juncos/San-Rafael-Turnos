import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Building2, CalendarDays, House, LayoutDashboard, LogIn, LogOut, Menu, Newspaper, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { clearSession, selectAuth } from '../../features/auth/authSlice'
import { Button } from '../ui/Button'
import { useReserveLink } from '../../hooks/useReserveLink'

const rolePath = {
  admin: '/dashboard/admin',
  clinic: '/dashboard/clinica',
  doctor: '/dashboard/medico',
  patient: '/dashboard/paciente'
}

export function AppHeader () {
  const auth = useAppSelector(selectAuth)
  const dispatch = useAppDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const [logoImageError, setLogoImageError] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const reserveLink = useReserveLink()
  const identityLabel = auth.role === 'patient'
    ? (auth.patient?.fullName || auth.patient?.dni)
    : (auth.user?.fullName || auth.user?.email)

  const handleLogout = () => {
    dispatch(clearSession())
    navigate('/ingresar')
  }

  const navItemClassName = 'inline-flex items-center gap-1.5 text-base font-medium text-emerald-900/85 hover:text-emerald-950'
  const mobileNavItemClassName = 'inline-flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2.5 text-sm font-medium text-emerald-900 transition hover:border-brand-300 hover:text-brand-700'
  const dashboardPath = auth.role ? rolePath[auth.role] : ''

  const isCurrentPage = (targetPath) => {
    if (!targetPath) return false
    if (targetPath === '/') return location.pathname === '/'
    if (targetPath === '/noticias') {
      return location.pathname === '/noticias' || location.pathname.startsWith('/noticias/')
    }
    return location.pathname === targetPath
  }

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <header className='sticky top-0 z-40 border-b border-emerald-200/70 bg-white/45 backdrop-blur-xl print:hidden'>
      <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8'>
        <Link to='/' className='group flex items-center gap-3' aria-label='Ir al inicio'>
          <div className='h-14 w-14 overflow-hidden rounded-xl bg-white/75 shadow-sm ring-1 ring-emerald-200 transition group-hover:scale-[1.02] sm:h-16 sm:w-16'>
            {!logoImageError
              ? (
                <img
                  src='/logo-san-rafael.png'
                  alt='San Rafael Turnos'
                  className='h-full w-full object-contain'
                  onError={() => setLogoImageError(true)}
                />
                )
              : (
                <div className='flex h-full w-full items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white'>
                  SR
                </div>
                )}
          </div>
          <div>
            <p className='text-lg font-semibold leading-tight text-emerald-950 sm:text-2xl'>San Rafael Turnos</p>
          </div>
        </Link>

        <nav className='hidden md:flex items-center gap-6 lg:gap-9'>
          {!isCurrentPage('/') ? (
            <NavLink to='/' className={navItemClassName}>
              <House className='h-5 w-5' />
              Inicio
            </NavLink>
          ) : null}
          {!isCurrentPage('/sobre-nosotros') ? (
            <NavLink to='/sobre-nosotros' className={navItemClassName}>
              <Building2 className='h-5 w-5' />
              Sobre nosotros
            </NavLink>
          ) : null}
          {!isCurrentPage('/noticias') ? (
            <NavLink to='/noticias' className={navItemClassName}>
              <Newspaper className='h-5 w-5' />
              Noticias
            </NavLink>
          ) : null}
          {!isCurrentPage('/reservar') ? (
            <NavLink to={reserveLink} className={navItemClassName}>
              <CalendarDays className='h-5 w-5' />
              Reservar
            </NavLink>
          ) : null}
          {auth.role && !isCurrentPage(dashboardPath)
            ? (
              <NavLink to={dashboardPath} className={navItemClassName}>
                <LayoutDashboard className='h-5 w-5' />
                Panel
              </NavLink>
              )
            : null}
        </nav>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className='inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-white/80 text-emerald-900 transition hover:border-brand-300 hover:text-brand-700 md:hidden'
            aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls='mobile-nav-menu'
          >
            {isMobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
          </button>

          <div className='hidden md:flex items-center gap-2'>
            {auth.role
              ? (
                <>
                  <span className='hidden text-sm font-medium text-emerald-900/75 sm:block'>
                    {identityLabel}
                  </span>
                  <Button variant='secondary' onClick={handleLogout}>
                    <span className='inline-flex items-center gap-2'>
                      <LogOut className='h-5 w-5' />
                      Salir
                    </span>
                  </Button>
                </>
                )
              : !isCurrentPage('/ingresar')
                  ? (
                    <Link to='/ingresar'>
                      <Button>
                        <span className='inline-flex items-center gap-2'>
                          <LogIn className='h-5 w-5' />
                          Ingresar
                        </span>
                      </Button>
                    </Link>
                    )
                  : null}
          </div>
        </div>
      </div>

      {isMobileMenuOpen
        ? (
          <div className='fixed inset-0 z-50 md:hidden'>
            <button
              type='button'
              aria-label='Cerrar menu'
              className='absolute inset-0 bg-emerald-950/35 backdrop-blur-[1px]'
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <aside
              id='mobile-nav-menu'
              className='absolute right-0 top-0 flex h-full w-80 max-w-[86vw] flex-col border-l border-emerald-200/70 bg-white/95 p-4 shadow-2xl backdrop-blur-xl'
            >
              <div className='mb-4 flex items-center justify-between border-b border-emerald-200/70 pb-3'>
                <p className='text-sm font-semibold text-emerald-950'>Menu</p>
                <button
                  type='button'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-white/90 text-emerald-900'
                  aria-label='Cerrar panel'
                >
                  <X className='h-4 w-4' />
                </button>
              </div>

              {auth.role && identityLabel
                ? (
                  <p className='mb-3 rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-sm font-medium text-emerald-900'>
                    {identityLabel}
                  </p>
                  )
                : null}

              <nav className='flex flex-col gap-2'>
                {!isCurrentPage('/') ? (
                  <NavLink to='/' className={mobileNavItemClassName}>
                    <House className='h-4 w-4' />
                    Inicio
                  </NavLink>
                ) : null}
                {!isCurrentPage('/sobre-nosotros') ? (
                  <NavLink to='/sobre-nosotros' className={mobileNavItemClassName}>
                    <Building2 className='h-4 w-4' />
                    Sobre nosotros
                  </NavLink>
                ) : null}
                {!isCurrentPage('/noticias') ? (
                  <NavLink to='/noticias' className={mobileNavItemClassName}>
                    <Newspaper className='h-4 w-4' />
                    Noticias
                  </NavLink>
                ) : null}
                {!isCurrentPage('/reservar') ? (
                  <NavLink to={reserveLink} className={mobileNavItemClassName}>
                    <CalendarDays className='h-4 w-4' />
                    Reservar
                  </NavLink>
                ) : null}
                {auth.role && !isCurrentPage(dashboardPath)
                  ? (
                    <NavLink to={dashboardPath} className={mobileNavItemClassName}>
                      <LayoutDashboard className='h-4 w-4' />
                      Panel
                    </NavLink>
                    )
                  : null}
              </nav>

              <div className='mt-auto border-t border-emerald-200/70 pt-4'>
                {auth.role
                  ? (
                    <Button
                      variant='secondary'
                      className='w-full'
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        handleLogout()
                      }}
                    >
                      <span className='inline-flex items-center gap-2'>
                        <LogOut className='h-5 w-5' />
                        Salir
                      </span>
                    </Button>
                    )
                  : !isCurrentPage('/ingresar')
                      ? (
                        <Link to='/ingresar' className='block'>
                          <Button className='w-full'>
                            <span className='inline-flex items-center gap-2'>
                              <LogIn className='h-5 w-5' />
                              Ingresar
                            </span>
                          </Button>
                        </Link>
                        )
                      : null}
              </div>
            </aside>
          </div>
          )
        : null}
    </header>
  )
}
