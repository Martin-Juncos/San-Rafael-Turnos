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
    <div className='space-y-5 print:space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2 print:hidden'>
        <Link to='/dashboard/medico'>
          <Button variant='secondary'>Volver al panel</Button>
        </Link>
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>

      <Card className='space-y-5 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none'>
        <div className='rounded-2xl border border-emerald-200/80 bg-white/70 p-5 shadow-sm print:rounded-none print:border-0 print:bg-white print:px-0 print:py-2 print:shadow-none'>
          <p className='text-center text-3xl font-bold tracking-tight text-emerald-950 print:text-4xl'>
            Clinica San Rafael Arcangel
          </p>
          <div className='mx-auto mt-3 h-px w-full max-w-3xl bg-gradient-to-r from-transparent via-emerald-300 to-transparent print:bg-emerald-300' />
          <h1 className='mt-4 text-center text-2xl font-semibold text-emerald-950 print:text-2xl'>
            Listado de pacientes del dia
          </h1>
          <div className='mt-4 grid gap-1'>
            <p className='flex items-baseline gap-2 text-sm text-emerald-900/85 print:text-xs'>
              <span>Profesional:</span>
              <span className='text-2xl font-semibold leading-tight text-emerald-950 print:text-2xl'>
                {doctorName}
              </span>
            </p>
            <p className='pt-1 text-sm text-emerald-900/85 print:text-xs'>
              Fecha: <span className='font-semibold text-emerald-950'>{formatLongDate(selectedDate)}</span>
            </p>
          </div>
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
              <table className='min-w-full text-left text-sm print:text-[11px]'>
                <thead className='bg-emerald-50 print:bg-white'>
                  <tr>
                    <th className='whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-emerald-950'>Hora</th>
                    <th className='whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-emerald-950'>Paciente</th>
                    <th className='whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-emerald-950'>DNI</th>
                    <th className='whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-emerald-950'>Telefono</th>
                    <th className='whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-emerald-950'>Estado</th>
                    <th className='whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide text-emerald-950'>Pago</th>
                    <th className='w-[40%] px-3 py-2 font-semibold uppercase tracking-wide text-emerald-950'>Sintomas / motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment, index) => (
                    <tr
                      key={appointment.id}
                      className={`border-t border-emerald-100 print:border-emerald-300 ${index % 2 === 0 ? 'bg-white/60' : 'bg-emerald-50/30 print:bg-white'}`}
                    >
                      <td className='whitespace-nowrap px-3 py-2'>{appointment.startTime?.slice(0, 5) || '-'}</td>
                      <td className='whitespace-nowrap px-3 py-2'>{appointment.patient?.fullName || '-'}</td>
                      <td className='whitespace-nowrap px-3 py-2'>{appointment.patient?.dni || '-'}</td>
                      <td className='whitespace-nowrap px-3 py-2'>{appointment.patient?.phone || '-'}</td>
                      <td className='whitespace-nowrap px-3 py-2'>
                        {appointmentStatusLabels[appointment.status] || appointment.status}
                      </td>
                      <td className='whitespace-nowrap px-3 py-2'>
                        {paymentStatusLabels[appointment.payment?.status] || appointment.payment?.status || '-'}
                      </td>
                      <td className='px-3 py-2 align-top whitespace-normal break-words'>{appointment.symptoms || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )
          : null}

        <p className='text-right text-xs text-emerald-900/70 print:text-[10px]'>
          Emitido: {new Date().toLocaleString('es-AR')}
        </p>
      </Card>
    </div>
  )
}
