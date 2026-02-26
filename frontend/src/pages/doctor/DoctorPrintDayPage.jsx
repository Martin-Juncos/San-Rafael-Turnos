import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { appointmentsService } from '../../api/services'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const appointmentStatusLabels = {
  requested: 'Solicitado',
  hold: 'Pendiente de pago',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  rescheduled: 'Reprogramado',
  attended: 'Atendido',
  no_show: 'Ausente'
}

const paymentStatusLabels = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  refunded: 'Reintegrado'
}

const formatLongDate = (value) => {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

export function DoctorPrintDayPage () {
  const [searchParams] = useSearchParams()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const selectedDate = searchParams.get('date') || ''

  useEffect(() => {
    let isCancelled = false

    const load = async () => {
      setLoading(true)
      setError('')

      if (!selectedDate) {
        setAppointments([])
        setLoading(false)
        return
      }

      try {
        const result = await appointmentsService.list({
          dateFrom: selectedDate,
          dateTo: selectedDate,
          pageSize: 200
        })
        if (isCancelled) return
        const sorted = [...result.items].sort((left, right) => String(left.startTime).localeCompare(String(right.startTime)))
        setAppointments(sorted)
      } catch (apiError) {
        if (isCancelled) return
        setError(apiError.message || 'No se pudo cargar el listado para imprimir.')
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    load().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [selectedDate])

  const doctorName = useMemo(() => {
    if (appointments.length === 0) return 'Medico'
    return appointments[0].doctor?.fullName || 'Medico'
  }, [appointments])

  return (
    <div className='space-y-4 print:space-y-2'>
      <div className='flex flex-wrap items-center justify-between gap-2 print:hidden'>
        <Link to='/dashboard/medico'>
          <Button variant='secondary'>Volver al panel</Button>
        </Link>
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>

      <Card className='space-y-4 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold text-emerald-950 print:text-xl'>
            Listado de pacientes del dia
          </h1>
          <p className='text-sm text-emerald-900/80'>
            Profesional: <span className='font-semibold text-emerald-950'>{doctorName}</span>
          </p>
          <p className='text-sm text-emerald-900/80'>
            Fecha: <span className='font-semibold text-emerald-950'>{formatLongDate(selectedDate)}</span>
          </p>
        </div>

        {loading
          ? <p className='text-sm text-emerald-900/75'>Cargando listado...</p>
          : null}
        {!loading && error
          ? <p className='text-sm text-red-600'>{error}</p>
          : null}
        {!loading && !error && appointments.length === 0
          ? <p className='text-sm text-emerald-900/75'>No hay turnos para la fecha seleccionada.</p>
          : null}

        {!loading && !error && appointments.length > 0
          ? (
            <div className='overflow-x-auto rounded-xl border border-emerald-200 print:rounded-none print:border-emerald-300'>
              <table className='min-w-full text-left text-sm'>
                <thead className='bg-emerald-50 print:bg-white'>
                  <tr>
                    <th className='px-3 py-2 font-semibold text-emerald-950'>Hora</th>
                    <th className='px-3 py-2 font-semibold text-emerald-950'>Paciente</th>
                    <th className='px-3 py-2 font-semibold text-emerald-950'>DNI</th>
                    <th className='px-3 py-2 font-semibold text-emerald-950'>Telefono</th>
                    <th className='px-3 py-2 font-semibold text-emerald-950'>Estado</th>
                    <th className='px-3 py-2 font-semibold text-emerald-950'>Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className='border-t border-emerald-100 print:border-emerald-300'>
                      <td className='px-3 py-2'>{appointment.startTime?.slice(0, 5) || '-'}</td>
                      <td className='px-3 py-2'>{appointment.patient?.fullName || '-'}</td>
                      <td className='px-3 py-2'>{appointment.patient?.dni || '-'}</td>
                      <td className='px-3 py-2'>{appointment.patient?.phone || '-'}</td>
                      <td className='px-3 py-2'>
                        {appointmentStatusLabels[appointment.status] || appointment.status}
                      </td>
                      <td className='px-3 py-2'>
                        {paymentStatusLabels[appointment.payment?.status] || appointment.payment?.status || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )
          : null}
      </Card>
    </div>
  )
}
