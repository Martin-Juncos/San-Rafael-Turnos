import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'

export function DoctorDashboardHeader ({
  doctorId,
  onOpenPatientRecords,
  onOpenReserveWithPrefill
}) {
  return (
    <Card>
      <div className='grid gap-4 md:grid-cols-[1fr_auto] md:items-center'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold text-emerald-950'>Panel Medico</h1>
          <p className='text-sm text-emerald-900/80'>
            Agenda diaria/semanal, estado de atencion y mensajeria por turno confirmado.
          </p>
        </div>
        <div className='flex flex-wrap justify-start gap-2 md:justify-end'>
          <Button
            variant='secondary'
            onClick={onOpenPatientRecords}
            className='px-6 py-3 text-base'
          >
            Ver registros de pacientes
          </Button>
          <Button
            onClick={onOpenReserveWithPrefill}
            disabled={!doctorId}
            className='px-6 py-3 text-base'
          >
            Cargar turno para este medico
          </Button>
        </div>
      </div>
    </Card>
  )
}
