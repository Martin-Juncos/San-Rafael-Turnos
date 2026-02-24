import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function NotFoundPage () {
  return (
    <Card className='mx-auto max-w-xl text-center'>
      <h1 className='text-2xl font-semibold text-emerald-950'>Pagina no encontrada</h1>
      <p className='mt-2 text-sm text-emerald-900/80'>La ruta solicitada no existe o fue movida.</p>
      <Link to='/' className='mt-5 inline-block'>
        <Button>Volver al inicio</Button>
      </Link>
    </Card>
  )
}
