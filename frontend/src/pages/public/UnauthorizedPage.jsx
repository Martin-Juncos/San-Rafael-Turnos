import { Link, useLocation } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function UnauthorizedPage () {
  const location = useLocation()
  const from = location.state?.from
  const requiredRoles = location.state?.requiredRoles

  return (
    <div className='mx-auto max-w-2xl'>
      <Card className='space-y-4'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Acceso no autorizado</h1>
        <p className='text-sm text-emerald-900/80'>
          Tu cuenta no tiene permisos para abrir esta pantalla.
          {from ? ` Ruta solicitada: ${from}.` : ''}
        </p>
        {Array.isArray(requiredRoles) && requiredRoles.length > 0
          ? (
            <p className='text-xs text-emerald-900/70'>
              Roles permitidos: {requiredRoles.join(', ')}.
            </p>
            )
          : null}
        <div className='flex flex-wrap gap-2'>
          <Link to='/'>
            <Button>Volver al inicio</Button>
          </Link>
          <Link to='/ingresar'>
            <Button variant='secondary'>Ingresar con otra cuenta</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

