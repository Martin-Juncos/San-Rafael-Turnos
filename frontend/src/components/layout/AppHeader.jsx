import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Building2, CalendarDays, House, LayoutDashboard, LogIn, LogOut, Newspaper } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { clearSession, selectAuth } from '../../features/auth/authSlice'
import { Button } from '../ui/Button'

const rolePath = {
  admin: '/dashboard/admin',
  clinic: '/dashboard/clinica',
  doctor: '/dashboard/medico',
  patient: '/dashboard/paciente'
}

export function AppHeader () {
  const auth = useAppSelector(selectAuth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [logoImageError, setLogoImageError] = useState(false)
  const identityLabel = auth.role === 'patient'
    ? (auth.patient?.fullName || auth.patient?.dni)
    : auth.user?.email

  const handleLogout = () => {
    dispatch(clearSession())
    navigate('/ingresar')
  }

  const navItemClassName = 'inline-flex items-center gap-1 text-sm text-emerald-900/80 hover:text-emerald-950'

  return (
    <header className='sticky top-0 z-40 border-b border-emerald-200/70 bg-white/45 backdrop-blur-xl'>
      <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8'>
        <div className='flex items-center gap-3'>
          <div className='h-11 w-11 overflow-hidden rounded-xl bg-white/75 shadow-sm ring-1 ring-emerald-200'>
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
                <div className='flex h-full w-full items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white'>
                  SR
                </div>
                )}
          </div>
          <div>
            <p className='text-sm font-semibold leading-tight'>San Rafael Turnos</p>
            <p className='text-xs text-emerald-900/70'>Clinica San Rafael Arcangel</p>
          </div>
        </div>

        <nav className='hidden items-center gap-3 md:flex'>
          <NavLink to='/' className={navItemClassName}>
            <House className='h-4 w-4' />
            Inicio
          </NavLink>
          <NavLink to='/sobre-nosotros' className={navItemClassName}>
            <Building2 className='h-4 w-4' />
            Sobre nosotros
          </NavLink>
          <NavLink to='/noticias' className={navItemClassName}>
            <Newspaper className='h-4 w-4' />
            Noticias
          </NavLink>
          <NavLink to='/reservar' className={navItemClassName}>
            <CalendarDays className='h-4 w-4' />
            Reservar
          </NavLink>
          {auth.role ? (
            <NavLink to={rolePath[auth.role]} className={navItemClassName}>
              <LayoutDashboard className='h-4 w-4' />
              Panel
            </NavLink>
          ) : (
            <NavLink to='/ingresar' className={navItemClassName}>
              <LogIn className='h-4 w-4' />
              Ingresar
            </NavLink>
          )}
        </nav>

        <div className='flex items-center gap-2'>
          {auth.role
            ? (
              <>
                <span className='hidden text-xs font-medium text-emerald-900/70 sm:block'>
                  {identityLabel}
                </span>
                <Button variant='secondary' onClick={handleLogout}>
                  <span className='inline-flex items-center gap-2'>
                    <LogOut className='h-4 w-4' />
                    Salir
                  </span>
                </Button>
              </>
              )
            : (
              <Link to='/ingresar'>
                <Button>
                  <span className='inline-flex items-center gap-2'>
                    <LogIn className='h-4 w-4' />
                    Ingresar
                  </span>
                </Button>
              </Link>
              )}
        </div>
      </div>
    </header>
  )
}
