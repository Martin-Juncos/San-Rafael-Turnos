import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Input } from '../../../../components/ui/Input'

export function ClinicAppointmentsSection ({
  appointmentFilters,
  setAppointmentFilters,
  doctors,
  appointments,
  cancelAppointment
}) {
  return (
    <Card className='space-y-3'>
      <h2 className='text-lg font-semibold text-emerald-950'>Turnos</h2>
      <div className='grid gap-2 sm:grid-cols-4'>
        <label className='space-y-1'>
          <span className='text-xs text-emerald-900/75'>Estado</span>
          <select
            className='glass-input'
            value={appointmentFilters.status}
            onChange={(event) => setAppointmentFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value=''>Todos</option>
            {['hold', 'confirmed', 'cancelled', 'attended', 'no_show'].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <Input label='Desde' type='date' value={appointmentFilters.dateFrom} onChange={(event) => setAppointmentFilters((prev) => ({ ...prev, dateFrom: event.target.value }))} />
        <Input label='Hasta' type='date' value={appointmentFilters.dateTo} onChange={(event) => setAppointmentFilters((prev) => ({ ...prev, dateTo: event.target.value }))} />
        <label className='space-y-1'>
          <span className='text-xs text-emerald-900/75'>Medico</span>
          <select
            className='glass-input'
            value={appointmentFilters.doctorId}
            onChange={(event) => setAppointmentFilters((prev) => ({ ...prev, doctorId: event.target.value }))}
          >
            <option value=''>Todos</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
            ))}
          </select>
        </label>
      </div>
      <div className='space-y-2'>
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className={`rounded-xl p-3 text-sm ${
              appointment.status === 'confirmed'
                ? 'border border-brand-400/70 bg-brand-700/20'
                : 'bg-white/70'
            }`}
          >
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='font-semibold text-emerald-950'>
                  {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                </p>
                <p className='text-xs text-emerald-900/75'>
                  {appointment.doctor?.fullName} | {appointment.status} | pago: {appointment.payment?.status}
                </p>
              </div>
              <Button variant='danger' className='px-3 py-1.5 text-xs' onClick={() => cancelAppointment(appointment.id)}>
                Cancelar
              </Button>
            </div>
          </div>
        ))}
        {appointments.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay turnos para los filtros aplicados.</p> : null}
      </div>
    </Card>
  )
}

