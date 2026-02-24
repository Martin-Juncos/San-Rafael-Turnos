import { useCallback, useEffect, useMemo, useState } from 'react'
import { appointmentsService, doctorsService, slotsService, specialtiesService } from '../../api/services'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export function ClinicDashboardPage () {
  const [specialties, setSpecialties] = useState([])
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [slots, setSlots] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [doctorFilters, setDoctorFilters] = useState({
    specialtyId: '',
    search: '',
    date: new Date().toISOString().slice(0, 10)
  })
  const [appointmentFilters, setAppointmentFilters] = useState({
    doctorId: '',
    status: '',
    dateFrom: new Date().toISOString().slice(0, 10),
    dateTo: ''
  })
  const [manualAppointment, setManualAppointment] = useState({
    doctorId: '',
    specialtyId: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '',
    fullName: '',
    dni: '',
    phone: '',
    symptoms: ''
  })
  const [rescheduleDraft, setRescheduleDraft] = useState({
    appointmentId: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '09:00'
  })
  const [blockDraft, setBlockDraft] = useState({
    doctorId: '',
    date: new Date().toISOString().slice(0, 10),
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

  const createManualAppointment = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
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
                    specialtyId: doctor?.specialtyId || ''
                  }))
                }}
              >
                <option value=''>Seleccionar</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                ))}
              </select>
            </label>
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input label='Fecha' type='date' value={manualAppointment.date} onChange={(event) => setManualAppointment((prev) => ({ ...prev, date: event.target.value }))} />
              <Input label='Hora' type='time' value={manualAppointment.startTime} onChange={(event) => setManualAppointment((prev) => ({ ...prev, startTime: event.target.value }))} />
            </div>
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
