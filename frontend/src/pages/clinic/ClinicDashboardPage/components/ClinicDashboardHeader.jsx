import { Card } from '../../../../components/ui/Card'

export function ClinicDashboardHeader () {
  return (
    <Card className='space-y-1'>
      <h1 className='text-2xl font-semibold text-emerald-950'>Panel Clinica</h1>
      <p className='text-sm text-emerald-900/80'>Gestion de turnos, agenda por medico y bloqueos administrativos.</p>
    </Card>
  )
}

