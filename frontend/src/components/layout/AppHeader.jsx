import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
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
          <NavLink to='/' className='text-sm text-emerald-900/80 hover:text-emerald-950'>Inicio</NavLink>
          <NavLink to='/sobre-nosotros' className='text-sm text-emerald-900/80 hover:text-emerald-950'>Sobre nosotros</NavLink>
          <NavLink to='/noticias' className='text-sm text-emerald-900/80 hover:text-emerald-950'>Noticias</NavLink>
          <NavLink to='/reservar' className='text-sm text-emerald-900/80 hover:text-emerald-950'>Reservar</NavLink>
          {auth.role ? (
            <NavLink to={rolePath[auth.role]} className='text-sm text-emerald-900/80 hover:text-emerald-950'>Panel</NavLink>
          ) : (
            <NavLink to='/ingresar' className='text-sm text-emerald-900/80 hover:text-emerald-950'>Ingresar</NavLink>
          )}
        </nav>

        <div className='flex items-center gap-2'>
          {auth.role
            ? (
              <>
                <span className='hidden text-xs font-medium text-emerald-900/70 sm:block'>
                  {identityLabel}
                </span>
                <Button variant='secondary' onClick={handleLogout}>Salir</Button>
              </>
              )
            : <Link to='/ingresar'><Button>Ingresar</Button></Link>}
        </div>
      </div>
    </header>
  )
}
