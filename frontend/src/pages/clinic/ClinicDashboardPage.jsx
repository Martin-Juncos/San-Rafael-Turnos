import { useCallback, useEffect, useMemo, useState } from 'react'
import { appointmentsService, doctorsService, slotsService, specialtiesService } from '../../api/services'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const toLocalIsoDate = (date = new Date()) => {
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return local.toISOString().slice(0, 10)
}

const buildUpcomingDates = (days) => {
  const base = new Date()
  return Array.from({ length: days }, (_item, index) => {
    const next = new Date(base)
    next.setDate(base.getDate() + index)
    return toLocalIsoDate(next)
  })
}

export function ClinicDashboardPage () {
  const today = useMemo(() => toLocalIsoDate(), [])
  const [specialties, setSpecialties] = useState([])
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [slots, setSlots] = useState([])
  const [manualAvailableDates, setManualAvailableDates] = useState([])
  const [manualDateSlots, setManualDateSlots] = useState([])
  const [manualAvailabilityLoading, setManualAvailabilityLoading] = useState(false)
  const [manualSlotsLoading, setManualSlotsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [doctorFilters, setDoctorFilters] = useState({
    specialtyId: '',
    search: '',
    date: today
  })
  const [appointmentFilters, setAppointmentFilters] = useState({
    doctorId: '',
    status: '',
    dateFrom: today,
    dateTo: ''
  })
  const [manualAppointment, setManualAppointment] = useState({
    doctorId: '',
    specialtyId: '',
    date: today,
    startTime: '',
    fullName: '',
    dni: '',
    phone: '',
    symptoms: ''
  })
  const [rescheduleDraft, setRescheduleDraft] = useState({
    appointmentId: '',
    date: today,
    startTime: '09:00'
  })
  const [blockDraft, setBlockDraft] = useState({
    doctorId: '',
    date: today,
    startTime: '12:00',
    endTime: '13:00',
    reason: 'Bloqueo administrativo'
  })

  const loadBase = useCallback(async () => {
    const [specialtiesResult, doctorsResult] = await Promise.all([
      specialtiesService.list({ pageSize: 100 }),
      doctorsService.list({
        pageSize: 100,
        specialtyId: doctorFilters.specialtyId || undefined,
        search: doctorFilters.search || undefined
      })
    ])
    setSpecialties(specialtiesResult.items)
    setDoctors(doctorsResult.items)
  }, [doctorFilters.search, doctorFilters.specialtyId])

  const loadAppointments = useCallback(async () => {
    const result = await appointmentsService.list({
      pageSize: 50,
      ...appointmentFilters
    })
    setAppointments(result.items)
  }, [appointmentFilters])

  useEffect(() => {
    loadBase().catch((apiError) => setError(apiError.message))
  }, [loadBase])

  useEffect(() => {
    loadAppointments().catch((apiError) => setError(apiError.message))
  }, [loadAppointments])

  useEffect(() => {
    if (!manualAppointment.doctorId) {
      setManualAvailableDates([])
      setManualDateSlots([])
      return
    }

    let isCancelled = false
    const loadDoctorAvailability = async () => {
      setManualAvailabilityLoading(true)
      setError('')
      try {
        const dates = buildUpcomingDates(21)
        const results = await Promise.all(
          dates.map(async (date) => {
            const data = await slotsService.list({ doctorId: manualAppointment.doctorId, date })
            return { date, count: data.slots.length }
          })
        )

        if (isCancelled) return

        const withAvailability = results.filter((item) => item.count > 0)
        setManualAvailableDates(withAvailability)

        if (withAvailability.length === 0) {
          setManualDateSlots([])
          setManualAppointment((prev) => ({ ...prev, startTime: '' }))
          return
        }

        setManualAppointment((prev) => ({
          ...prev,
          date: withAvailability[0].date,
          startTime: ''
        }))
      } catch (apiError) {
        if (!isCancelled) setError(apiError.message)
      } finally {
        if (!isCancelled) setManualAvailabilityLoading(false)
      }
    }

    loadDoctorAvailability().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [manualAppointment.doctorId])

  useEffect(() => {
    if (!manualAppointment.doctorId || !manualAppointment.date) {
      setManualDateSlots([])
      return
    }

    let isCancelled = false
    const loadManualDateSlots = async () => {
      setManualSlotsLoading(true)
      try {
        const data = await slotsService.list({
          doctorId: manualAppointment.doctorId,
          date: manualAppointment.date
        })
        if (isCancelled) return
        setManualDateSlots(data.slots)
        setManualAppointment((prev) => {
          const exists = data.slots.some((slot) => slot.startTime === prev.startTime)
          return exists
            ? prev
            : {
                ...prev,
                startTime: data.slots[0]?.startTime || ''
              }
        })
      } catch (apiError) {
        if (!isCancelled) setError(apiError.message)
      } finally {
        if (!isCancelled) setManualSlotsLoading(false)
      }
    }

    loadManualDateSlots().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [manualAppointment.doctorId, manualAppointment.date])

  const loadSlots = async () => {
    if (!doctorFilters.date || !appointmentFilters.doctorId) return
    try {
      const data = await slotsService.list({
        doctorId: appointmentFilters.doctorId,
        date: doctorFilters.date
      })
      setSlots(data.slots)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const selectedSpecialtyName = useMemo(() => {
    return specialties.find((item) => item.id === doctorFilters.specialtyId)?.name || 'Todas'
  }, [doctorFilters.specialtyId, specialties])

  const formatDateLabel = (value) => {
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const createManualAppointment = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!manualAppointment.startTime) {
      setError('Selecciona un horario disponible para el medico elegido.')
      return
    }
    try {
      await appointmentsService.create(manualAppointment)
      setMessage('Turno manual creado en HOLD')
      await loadAppointments()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const cancelAppointment = async (appointmentId) => {
    try {
      await appointmentsService.cancel(appointmentId, 'cancelled_by_clinic')
      await loadAppointments()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const rescheduleAppointment = async (event) => {
    event.preventDefault()
    if (!rescheduleDraft.appointmentId) return
    try {
      await appointmentsService.reschedule(rescheduleDraft.appointmentId, {
        date: rescheduleDraft.date,
        startTime: rescheduleDraft.startTime
      })
      setMessage('Turno reprogramado')
      await loadAppointments()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const createBlock = async (event) => {
    event.preventDefault()
    if (!blockDraft.doctorId) return
    try {
      await doctorsService.createBlock(blockDraft.doctorId, {
        date: blockDraft.date,
        startTime: blockDraft.startTime,
        endTime: blockDraft.endTime,
        reason: blockDraft.reason
      })
      setMessage('Bloqueo guardado')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  return (
    <div className='space-y-6'>
      <Card className='space-y-1'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Panel Clinica</h1>
        <p className='text-sm text-emerald-900/80'>Gestion de turnos, agenda por medico y bloqueos administrativos.</p>
      </Card>

      <div className='grid gap-6 xl:grid-cols-[1.2fr_1fr]'>
        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Medicos y filtros</h2>
          <div className='grid gap-3 sm:grid-cols-3'>
            <label className='space-y-1'>
              <span className='text-xs text-emerald-900/75'>Especialidad</span>
              <select
                className='glass-input'
                value={doctorFilters.specialtyId}
                onChange={(event) => setDoctorFilters((prev) => ({ ...prev, specialtyId: event.target.value }))}
              >
                <option value=''>Todas</option>
                {specialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                ))}
              </select>
            </label>
            <Input
              label='Buscar medico'
              value={doctorFilters.search}
              onChange={(event) => setDoctorFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
            <Input
              label='Fecha agenda'
              type='date'
              value={doctorFilters.date}
              onChange={(event) => setDoctorFilters((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <p className='text-xs text-emerald-900/70'>Mostrando especialidad: {selectedSpecialtyName}</p>

          <div className='grid gap-2 sm:grid-cols-2'>
            {doctors.map((doctor) => (
              <div key={doctor.id} className='rounded-xl bg-white/70 p-3'>
                <p className='text-sm font-semibold text-emerald-950'>{doctor.fullName}</p>
                <p className='text-xs text-emerald-900/70'>{doctor.specialty?.name || 'Sin especialidad'}</p>
                <button
                  type='button'
                  className='mt-2 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs'
                  onClick={() => setAppointmentFilters((prev) => ({ ...prev, doctorId: doctor.id }))}
                >
                  Ver agenda
                </button>
              </div>
            ))}
          </div>
          <Button variant='secondary' onClick={loadSlots}>Cargar slots del medico seleccionado</Button>
          <div className='flex flex-wrap gap-2'>
            {slots.map((slot) => (
              <span key={slot.startTime} className='rounded-lg bg-white/70 px-3 py-1 text-xs text-emerald-900/80'>
                {slot.startTime.slice(0, 5)}
              </span>
            ))}
          </div>
        </Card>

        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Bloqueos</h2>
          <form className='space-y-3' onSubmit={createBlock}>
            <label className='space-y-1 block'>
              <span className='text-xs text-emerald-900/75'>Medico</span>
              <select
                className='glass-input'
                value={blockDraft.doctorId}
                onChange={(event) => setBlockDraft((prev) => ({ ...prev, doctorId: event.target.value }))}
              >
                <option value=''>Seleccionar</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                ))}
              </select>
            </label>
            <Input label='Fecha' type='date' value={blockDraft.date} onChange={(event) => setBlockDraft((prev) => ({ ...prev, date: event.target.value }))} />
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input label='Inicio' type='time' value={blockDraft.startTime} onChange={(event) => setBlockDraft((prev) => ({ ...prev, startTime: event.target.value }))} />
              <Input label='Fin' type='time' value={blockDraft.endTime} onChange={(event) => setBlockDraft((prev) => ({ ...prev, endTime: event.target.value }))} />
            </div>
            <Input label='Motivo' value={blockDraft.reason} onChange={(event) => setBlockDraft((prev) => ({ ...prev, reason: event.target.value }))} />
            <Button type='submit'>Guardar bloqueo</Button>
          </form>
        </Card>
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Crear turno manual</h2>
          <form className='space-y-3' onSubmit={createManualAppointment}>
            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Medico</span>
              <select
                className='glass-input'
                value={manualAppointment.doctorId}
                onChange={(event) => {
                  const doctor = doctors.find((item) => item.id === event.target.value)
                  setManualAppointment((prev) => ({
                    ...prev,
                    doctorId: event.target.value,
                    specialtyId: doctor?.specialtyId || '',
                    date: today,
                    startTime: ''
                  }))
                }}
              >
                <option value=''>Seleccionar</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                ))}
              </select>
            </label>

            {manualAppointment.doctorId && (
              <div className='space-y-2 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
                  Proximos dias con agenda disponible
                </p>
                {manualAvailabilityLoading
                  ? <p className='text-xs text-emerald-900/70'>Buscando disponibilidad...</p>
                  : (
                      <div className='flex flex-wrap gap-2'>
                        {manualAvailableDates.length === 0
                          ? <span className='text-xs text-emerald-900/70'>Este medico no tiene agenda cargada en los proximos 21 dias.</span>
                          : manualAvailableDates.map((item) => (
                              <button
                                key={item.date}
                                type='button'
                                onClick={() => setManualAppointment((prev) => ({ ...prev, date: item.date, startTime: '' }))}
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                  manualAppointment.date === item.date
                                    ? 'border-brand-500 bg-brand-100 text-brand-800'
                                    : 'border-emerald-200 bg-white/70 text-emerald-900/75 hover:bg-emerald-100'
                                }`}
                              >
                                {formatDateLabel(item.date)} ({item.count})
                              </button>
                            ))}
                      </div>
                    )}
              </div>
            )}

            <div className='grid gap-2 sm:grid-cols-2'>
              <Input
                label='Fecha'
                type='date'
                min={today}
                value={manualAppointment.date}
                onChange={(event) => setManualAppointment((prev) => ({ ...prev, date: event.target.value, startTime: '' }))}
              />
              <label className='block space-y-1'>
                <span className='text-xs text-emerald-900/75'>Horario disponible</span>
                <select
                  className='glass-input'
                  value={manualAppointment.startTime}
                  onChange={(event) => setManualAppointment((prev) => ({ ...prev, startTime: event.target.value }))}
                >
                  <option value=''>
                    {manualSlotsLoading ? 'Buscando horarios...' : 'Seleccionar'}
                  </option>
                  {manualDateSlots.map((slot) => (
                    <option key={slot.startTime} value={slot.startTime}>{slot.startTime.slice(0, 5)}</option>
                  ))}
                </select>
              </label>
            </div>
            {!manualSlotsLoading && manualAppointment.doctorId && manualDateSlots.length === 0
              ? <p className='text-xs text-amber-700'>No hay horarios disponibles para la fecha elegida.</p>
              : null}
            <Input label='Paciente' value={manualAppointment.fullName} onChange={(event) => setManualAppointment((prev) => ({ ...prev, fullName: event.target.value }))} />
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input label='DNI' value={manualAppointment.dni} onChange={(event) => setManualAppointment((prev) => ({ ...prev, dni: event.target.value }))} />
              <Input label='Telefono' value={manualAppointment.phone} onChange={(event) => setManualAppointment((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <Input label='Sintomas / motivo' value={manualAppointment.symptoms} onChange={(event) => setManualAppointment((prev) => ({ ...prev, symptoms: event.target.value }))} />
            <Button type='submit'>Crear turno</Button>
          </form>
        </Card>

        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Reprogramar turno</h2>
          <form className='space-y-3' onSubmit={rescheduleAppointment}>
            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Turno</span>
              <select
                className='glass-input'
                value={rescheduleDraft.appointmentId}
                onChange={(event) => setRescheduleDraft((prev) => ({ ...prev, appointmentId: event.target.value }))}
              >
                <option value=''>Seleccionar</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input label='Nueva fecha' type='date' value={rescheduleDraft.date} onChange={(event) => setRescheduleDraft((prev) => ({ ...prev, date: event.target.value }))} />
              <Input label='Nueva hora' type='time' value={rescheduleDraft.startTime} onChange={(event) => setRescheduleDraft((prev) => ({ ...prev, startTime: event.target.value }))} />
            </div>
            <Button type='submit'>Reprogramar</Button>
          </form>
        </Card>
      </div>

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
            <div key={appointment.id} className='rounded-xl bg-white/70 p-3 text-sm'>
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

      {message ? <p className='text-sm text-emerald-700'>{message}</p> : null}
      {error ? <p className='text-sm text-red-600'>{error}</p> : null}
    </div>
  )
}
