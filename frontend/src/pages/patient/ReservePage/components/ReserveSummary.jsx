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
  return (
    <div ref={summaryRef}>
      <Card className='space-y-2'>
        <h2 className='text-lg font-semibold text-emerald-950'>Resumen de reserva</h2>
        {currentReservation
          ? (
            <div className='space-y-1 text-sm text-emerald-900/80'>
              <p><span className='font-semibold'>Medico:</span> {currentReservation.doctorName}</p>
              <p><span className='font-semibold'>Especialidad:</span> {currentReservation.specialtyName}</p>
              <p><span className='font-semibold'>Dia:</span> {formatDateLongLabel(currentReservation.date)}</p>
              <p><span className='font-semibold'>Horario:</span> {currentReservation.startTime || '-'}</p>
              <p><span className='font-semibold'>Cobertura:</span> {currentReservation.insuranceName}</p>
              <p><span className='font-semibold'>Estado del turno:</span> {currentReservation.appointmentStatus}</p>
              <p><span className='font-semibold'>Estado del pago:</span> {currentReservation.paymentStatus}</p>
              <p><span className='font-semibold'>Monto pagado:</span> {formatMoney(currentReservation.paidAmount)}</p>
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
