import { Card } from '../../../../components/ui/Card'

export function ReserveHeader () {
  return (
    <Card className='space-y-4'>
      <h1 className='text-2xl font-semibold text-emerald-950'>Reserva de turnos</h1>
      <p className='text-sm text-emerald-900/80'>
        Selecciona especialidad y profesional. Te mostramos dias y horarios disponibles para reservar.
      </p>
    </Card>
  )
}
