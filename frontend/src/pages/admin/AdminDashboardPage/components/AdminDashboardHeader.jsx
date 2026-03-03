import { Card } from '../../../../components/ui/Card'

export function AdminDashboardHeader () {
  return (
    <Card className='space-y-1'>
      <h1 className='text-2xl font-semibold text-emerald-950'>Panel Admin</h1>
      <p className='text-sm text-emerald-900/80'>CRUD de especialidades, medicos, disponibilidades y trazabilidad operativa.</p>
    </Card>
  )
}

