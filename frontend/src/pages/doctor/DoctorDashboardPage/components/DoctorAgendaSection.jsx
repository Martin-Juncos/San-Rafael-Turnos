import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'

export function DoctorAgendaSection ({
  selectedPrintDate,
  setSelectedPrintDate,
  printableDates,
  openPrintDayView,
  appointments,
  unreadAppointmentIds,
  handleSelectAppointment,
  openConsultRecord,
  updateStatus,
  markPaymentAsPaid,
  appointmentStatusLabels,
  paymentStatusLabels
}) {
  return (
    <Card className='space-y-3'>
      <h2 className='text-lg font-semibold text-emerald-950'>Mis turnos</h2>
      <div className='flex flex-wrap items-end justify-between gap-3 rounded-xl border border-emerald-200 bg-white/70 p-3'>
        <label className='space-y-1 text-sm'>
          <span className='text-xs text-emerald-900/75'>Fecha para imprimir</span>
          <select
            className='glass-input min-w-[220px]'
            value={selectedPrintDate}
            onChange={(event) => setSelectedPrintDate(event.target.value)}
          >
            {printableDates.length === 0
              ? <option value=''>Sin fechas con turnos</option>
              : printableDates.map((date) => (
                  <option key={date} value={date}>{date}</option>
                ))}
          </select>
        </label>
        <Button
          variant='secondary'
          onClick={openPrintDayView}
          disabled={!selectedPrintDate}
        >
          Imprimir pacientes del dia
        </Button>
      </div>
      <div className='space-y-2'>
        {appointments.map((appointment) => (
          <div key={appointment.id} className='rounded-xl bg-white/70 p-3 text-sm'>
            <div className='flex items-start justify-between gap-2'>
              <div>
                <p className='font-semibold text-emerald-950'>
                  {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                </p>
                <p className='text-xs text-emerald-900/75'>
                  Estado: {appointmentStatusLabels[appointment.status] || appointment.status}
                  {' '}|{' '}
                  Pago: {paymentStatusLabels[appointment.payment?.status] || appointment.payment?.status || 'Pendiente'}
                </p>
                {unreadAppointmentIds.includes(appointment.id)
                  ? <p className='text-xs font-semibold text-amber-800'>Nuevo mensaje</p>
                  : null}
              </div>
              <div className='flex flex-wrap justify-end gap-1.5'>
                <button
                  type='button'
                  className='rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs'
                  onClick={() => handleSelectAppointment(appointment.id)}
                >
                  Gestionar
                </button>
                <button
                  type='button'
                  className='rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs'
                  onClick={() => openConsultRecord(appointment)}
                >
                  Registro de consulta
                </button>
              </div>
            </div>
            <div className='mt-2 flex flex-wrap gap-2'>
              <Button
                variant='secondary'
                className={`px-3 py-1.5 text-xs ${
                  appointment.status === 'attended'
                    ? '!border-brand-700 !bg-brand-700 !text-white hover:!bg-brand-800'
                    : '!border-emerald-200 !bg-emerald-100 !text-emerald-900 hover:!bg-emerald-200'
                }`}
                onClick={() => updateStatus(appointment.id, 'attended')}
                aria-pressed={appointment.status === 'attended'}
              >
                Atendido
              </Button>
              <Button
                variant='secondary'
                className={`px-3 py-1.5 text-xs ${
                  appointment.status === 'no_show'
                    ? '!border-brand-700 !bg-brand-700 !text-white hover:!bg-brand-800'
                    : '!border-emerald-200 !bg-emerald-100 !text-emerald-900 hover:!bg-emerald-200'
                }`}
                onClick={() => updateStatus(appointment.id, 'no_show')}
                aria-pressed={appointment.status === 'no_show'}
              >
                Ausente
              </Button>
              <Button
                variant='secondary'
                className={`px-3 py-1.5 text-xs ${
                  appointment.payment?.status === 'paid'
                    ? '!border-brand-700 !bg-brand-700 !text-white hover:!bg-brand-800'
                    : '!border-emerald-200 !bg-emerald-100 !text-emerald-900 hover:!bg-emerald-200'
                }`}
                onClick={() => markPaymentAsPaid(appointment.id)}
                aria-pressed={appointment.payment?.status === 'paid'}
              >
                {appointment.payment?.status === 'paid' ? 'Pagado' : 'Pagar'}
              </Button>
            </div>
          </div>
        ))}
        {appointments.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay turnos asignados.</p> : null}
      </div>
    </Card>
  )
}
