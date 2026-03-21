import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'

export function DoctorDashboardHeader ({
  doctorId,
  isSecretary,
  activeDoctorId,
  doctorScopes,
  onDoctorContextChange,
  onOpenPatientRecords,
  onOpenReserveWithPrefill
}) {
  const title = isSecretary ? 'Panel Secretaria' : 'Panel Medico'
  const description = isSecretary
    ? 'Gestion operativa del medico activo, agenda diaria y mensajeria por turno confirmado.'
    : 'Agenda diaria/semanal, estado de atencion y mensajeria por turno confirmado.'

  return (
    <Card>
      <div className='grid gap-4 md:grid-cols-[1fr_auto] md:items-center'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold text-emerald-950'>{title}</h1>
          <p className='text-sm text-emerald-900/80'>{description}</p>
          {isSecretary
            ? (
              <label className='block max-w-md space-y-1 pt-2'>
                <span className='text-xs text-emerald-900/75'>Medico activo</span>
                <select
                  className='glass-input'
                  value={activeDoctorId || ''}
                  onChange={(event) => onDoctorContextChange(event.target.value)}
                >
                  <option value=''>Seleccionar</option>
                  {doctorScopes.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                  ))}
                </select>
              </label>
              )
            : null}
        </div>
        <div className='flex flex-wrap justify-start gap-2 md:justify-end'>
          {!isSecretary
            ? (
              <Button
                variant='secondary'
                onClick={onOpenPatientRecords}
                className='px-6 py-3 text-base'
              >
                Ver registros de pacientes
              </Button>
              )
            : null}
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
