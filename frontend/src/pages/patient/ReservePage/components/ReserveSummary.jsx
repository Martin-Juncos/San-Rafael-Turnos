import { Card } from '../../../../components/ui/Card'
import {
  appointmentStatusLabels,
  paymentStatusLabels
} from '../reserveUtils'

export function ReserveSummary ({
  summaryRef,
  currentReservation,
  appointmentsForList,
  formatDateLongLabel,
  formatMoney
}) {
  const paymentToneClass = currentReservation?.appointmentStatusCode === 'cancelled' && currentReservation?.cancelReason === 'hold_expired'
    ? 'bg-red-100 text-red-900'
    : currentReservation?.paymentStatus === 'Pagado'
    ? 'bg-emerald-100 text-emerald-900'
    : currentReservation?.paymentStatus === 'Pendiente'
      ? 'bg-amber-100 text-amber-900'
      : currentReservation?.paymentStatus === 'Fallido'
        ? 'bg-red-100 text-red-900'
        : 'bg-slate-100 text-slate-800'

  return (
    <div ref={summaryRef}>
      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-emerald-950'>Resumen de reserva</h2>
        {currentReservation
          ? (
            <div className='space-y-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-sm font-semibold text-emerald-950'>Estado actual</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentToneClass}`}>
                  {currentReservation.appointmentStatusCode === 'cancelled' && currentReservation.cancelReason === 'hold_expired'
                    ? 'Reserva vencida'
                    : currentReservation.paymentStatus}
                </span>
                <span className='rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-emerald-900'>
                  Turno: {currentReservation.appointmentStatus}
                </span>
              </div>

              <div className='grid gap-2 rounded-2xl border border-emerald-200/70 bg-white/70 p-4 text-sm text-emerald-900/80'>
                <p><span className='font-semibold'>Medico:</span> {currentReservation.doctorName}</p>
                <p><span className='font-semibold'>Especialidad:</span> {currentReservation.specialtyName}</p>
                <p><span className='font-semibold'>Dia:</span> {formatDateLongLabel(currentReservation.date)}</p>
                <p><span className='font-semibold'>Horario:</span> {currentReservation.startTime || '-'}</p>
                <p><span className='font-semibold'>Cobertura:</span> {currentReservation.insuranceName}</p>
                <p><span className='font-semibold'>Monto:</span> {formatMoney(currentReservation.paidAmount)}</p>
              </div>
            </div>
            )
          : <p className='text-sm text-emerald-900/70'>Aun no creaste una reserva.</p>}

        <div className='space-y-2 pt-3'>
          <h3 className='text-sm font-semibold text-emerald-950'>Mis turnos</h3>
          {appointmentsForList.length === 0
            ? <p className='text-xs text-emerald-900/70'>No tenes otros turnos registrados.</p>
            : (
                <div className='space-y-2'>
                  {appointmentsForList.map((appointment) => (
                    <div key={appointment.id} className='rounded-xl border border-emerald-200/70 bg-white/70 p-3 text-xs text-emerald-900/80'>
                      <p className='font-semibold text-emerald-950'>
                        {appointment.doctor?.fullName || 'Profesional'} - {appointment.specialty?.name || 'Especialidad'}
                      </p>
                      <p>{formatDateLongLabel(appointment.date)} {appointment.startTime?.slice(0, 5) || '-'}</p>
                      <p>Estado del turno: {appointmentStatusLabels[appointment.status] || appointment.status}</p>
                      <p>Estado del pago: {paymentStatusLabels[appointment.payment?.status] || appointment.payment?.status || 'Sin pago'}</p>
                      <p>Monto: {formatMoney(appointment.payment?.amount ?? 0)}</p>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </Card>
    </div>
  )
}
