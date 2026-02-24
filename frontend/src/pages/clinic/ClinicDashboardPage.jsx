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

const parseTimeToMinutes = (value) => {
  const [hours, minutes] = String(value || '').split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN
  return (hours * 60) + minutes
}

const formatMinutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const normalizeTimeValue = (value) => {
  const [hours = '00', minutes = '00'] = String(value || '').split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  const a1 = parseTimeToMinutes(aStart)
  const a2 = parseTimeToMinutes(aEnd)
  const b1 = parseTimeToMinutes(bStart)
  const b2 = parseTimeToMinutes(bEnd)
  return a1 < b2 && b1 < a2
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
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState('')
  const [rescheduleAvailableDates, setRescheduleAvailableDates] = useState([])
  const [rescheduleDateSlots, setRescheduleDateSlots] = useState([])
  const [rescheduleAvailabilityLoading, setRescheduleAvailabilityLoading] = useState(false)
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
  const [blockWeeklyAvailability, setBlockWeeklyAvailability] = useState([])
  const [blockExistingRanges, setBlockExistingRanges] = useState([])
  const [blockAvailableDates, setBlockAvailableDates] = useState([])
  const [blockAvailabilityLoading, setBlockAvailabilityLoading] = useState(false)
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
    startTime: ''
  })
  const [blockDraft, setBlockDraft] = useState({
    doctorId: '',
    date: today,
    startTime: '',
    endTime: '',
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
                startTime: ''
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

  useEffect(() => {
    if (!rescheduleDoctorId) {
      setRescheduleAvailableDates([])
      setRescheduleDateSlots([])
      return
    }

    let isCancelled = false
    const loadRescheduleAvailability = async () => {
      setRescheduleAvailabilityLoading(true)
      setError('')
      try {
        const dates = buildUpcomingDates(21)
        const results = await Promise.all(
          dates.map(async (date) => {
            const data = await slotsService.list({ doctorId: rescheduleDoctorId, date })
            return { date, count: data.slots.length }
          })
        )

        if (isCancelled) return

        const withAvailability = results.filter((item) => item.count > 0)
        setRescheduleAvailableDates(withAvailability)

        if (withAvailability.length === 0) {
          setRescheduleDateSlots([])
          setRescheduleDraft((prev) => ({ ...prev, startTime: '' }))
          return
        }

        setRescheduleDraft((prev) => {
          const keepDate = withAvailability.some((item) => item.date === prev.date)
          return {
            ...prev,
            date: keepDate ? prev.date : withAvailability[0].date,
            startTime: ''
          }
        })
      } catch (apiError) {
        if (!isCancelled) setError(apiError.message)
      } finally {
        if (!isCancelled) setRescheduleAvailabilityLoading(false)
      }
    }

    loadRescheduleAvailability().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [rescheduleDoctorId])

  useEffect(() => {
    if (!rescheduleDoctorId || !rescheduleDraft.date) {
      setRescheduleDateSlots([])
      return
    }

    let isCancelled = false
    const loadRescheduleDateSlots = async () => {
      setRescheduleSlotsLoading(true)
      try {
        const data = await slotsService.list({
          doctorId: rescheduleDoctorId,
          date: rescheduleDraft.date
        })
        if (isCancelled) return
        setRescheduleDateSlots(data.slots)
        setRescheduleDraft((prev) => {
          const exists = data.slots.some((slot) => slot.startTime === prev.startTime)
          return exists
            ? prev
            : {
                ...prev,
                startTime: ''
              }
        })
      } catch (apiError) {
        if (!isCancelled) setError(apiError.message)
      } finally {
        if (!isCancelled) setRescheduleSlotsLoading(false)
      }
    }

    loadRescheduleDateSlots().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [rescheduleDoctorId, rescheduleDraft.date])

  useEffect(() => {
    if (!blockDraft.doctorId) {
      setBlockWeeklyAvailability([])
      setBlockExistingRanges([])
      setBlockAvailableDates([])
      return
    }

    let isCancelled = false
    const loadBlockAvailability = async () => {
      setBlockAvailabilityLoading(true)
      setError('')
      try {
        const data = await doctorsService.getAvailability(blockDraft.doctorId)
        if (isCancelled) return

        const weeklyAvailability = (data.availability || [])
          .filter((item) => item.isActive !== false)
          .map((item) => ({
            dayOfWeek: Number(item.dayOfWeek),
            startTime: normalizeTimeValue(item.startTime),
            endTime: normalizeTimeValue(item.endTime),
            slotMinutes: Number(item.slotMinutes) || 30
          }))

        const existingRanges = (data.blocks || []).map((item) => ({
          date: item.date,
          startTime: normalizeTimeValue(item.startTime),
          endTime: normalizeTimeValue(item.endTime)
        }))

        const dates = buildUpcomingDates(21)
        const withAvailability = dates
          .map((date) => {
            const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
            const ranges = weeklyAvailability.filter((item) => item.dayOfWeek === dayOfWeek)
            const dayBlocks = existingRanges.filter((item) => item.date === date)

            const freeStartCount = ranges.reduce((accumulator, range) => {
              const start = parseTimeToMinutes(range.startTime)
              const end = parseTimeToMinutes(range.endTime)
              const step = Number(range.slotMinutes) || 30
              let count = 0

              for (let cursor = start; cursor + step <= end; cursor += step) {
                const candidateStart = formatMinutesToTime(cursor)
                let hasAnyValidEnd = false

                for (let endCursor = cursor + step; endCursor <= end; endCursor += step) {
                  const candidateEnd = formatMinutesToTime(endCursor)
                  const overlaps = dayBlocks.some((item) =>
                    rangesOverlap(candidateStart, candidateEnd, item.startTime, item.endTime)
                  )
                  if (!overlaps) {
                    hasAnyValidEnd = true
                    break
                  }
                }

                if (hasAnyValidEnd) {
                  count += 1
                }
              }

              return accumulator + count
            }, 0)

            return { date, count: freeStartCount }
          })
          .filter((item) => item.count > 0)

        setBlockWeeklyAvailability(weeklyAvailability)
        setBlockExistingRanges(existingRanges)
        setBlockAvailableDates(withAvailability)

        if (withAvailability.length === 0) {
          setBlockDraft((prev) => ({ ...prev, startTime: '', endTime: '' }))
          return
        }

        setBlockDraft((prev) => {
          const keepDate = withAvailability.some((item) => item.date === prev.date)
          return {
            ...prev,
            date: keepDate ? prev.date : withAvailability[0].date,
            startTime: '',
            endTime: ''
          }
        })
      } catch (apiError) {
        if (!isCancelled) setError(apiError.message)
      } finally {
        if (!isCancelled) setBlockAvailabilityLoading(false)
      }
    }

    loadBlockAvailability().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [blockDraft.doctorId])

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

  const rescheduleAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const appointmentDoctorId = appointment.doctorId || appointment.doctor?.id
      if (rescheduleDoctorId && appointmentDoctorId !== rescheduleDoctorId) return false
      return !['cancelled', 'attended', 'no_show'].includes(appointment.status)
    })
  }, [appointments, rescheduleDoctorId])

  const manualDaysWithAvailability = useMemo(
    () => manualAvailableDates.filter((item) => Number(item.count) > 0),
    [manualAvailableDates]
  )

  const rescheduleDaysWithAvailability = useMemo(
    () => rescheduleAvailableDates.filter((item) => Number(item.count) > 0),
    [rescheduleAvailableDates]
  )

  const manualOpenSlots = useMemo(() => {
    const uniqueByStart = new Map(
      manualDateSlots
        .filter((slot) => Boolean(slot?.startTime))
        .map((slot) => [slot.startTime, slot])
    )
    return Array.from(uniqueByStart.values()).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [manualDateSlots])

  const rescheduleOpenSlots = useMemo(() => {
    const uniqueByStart = new Map(
      rescheduleDateSlots
        .filter((slot) => Boolean(slot?.startTime))
        .map((slot) => [slot.startTime, slot])
    )
    return Array.from(uniqueByStart.values()).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [rescheduleDateSlots])

  const blockDayRanges = useMemo(() => {
    if (!blockDraft.date) return []
    const dayOfWeek = new Date(`${blockDraft.date}T00:00:00`).getDay()
    return blockWeeklyAvailability
      .filter((item) => item.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [blockDraft.date, blockWeeklyAvailability])

  const blockExistingRangesForDate = useMemo(() => {
    if (!blockDraft.date) return []
    return blockExistingRanges.filter((item) => item.date === blockDraft.date)
  }, [blockDraft.date, blockExistingRanges])

  const blockStartOptions = useMemo(() => {
    const startValues = new Set()
    blockDayRanges.forEach((range) => {
      const start = parseTimeToMinutes(range.startTime)
      const end = parseTimeToMinutes(range.endTime)
      const step = Number(range.slotMinutes) || 30
      for (let cursor = start; cursor + step <= end; cursor += step) {
        const candidateStart = formatMinutesToTime(cursor)
        let hasAnyValidEnd = false

        for (let endCursor = cursor + step; endCursor <= end; endCursor += step) {
          const candidateEnd = formatMinutesToTime(endCursor)
          const overlaps = blockExistingRangesForDate.some((item) =>
            rangesOverlap(candidateStart, candidateEnd, item.startTime, item.endTime)
          )
          if (!overlaps) {
            hasAnyValidEnd = true
            break
          }
        }

        if (hasAnyValidEnd) {
          startValues.add(candidateStart)
        }
      }
    })
    return Array.from(startValues).sort((a, b) => a.localeCompare(b))
  }, [blockDayRanges, blockExistingRangesForDate])

  const blockEndOptions = useMemo(() => {
    if (!blockDraft.startTime) return []
    const startMinutes = parseTimeToMinutes(blockDraft.startTime)
    if (Number.isNaN(startMinutes)) return []

    const endValues = new Set()
    blockDayRanges.forEach((range) => {
      const rangeStart = parseTimeToMinutes(range.startTime)
      const rangeEnd = parseTimeToMinutes(range.endTime)
      const step = Number(range.slotMinutes) || 30

      if (startMinutes < rangeStart || startMinutes >= rangeEnd) {
        return
      }

      for (let cursor = startMinutes + step; cursor <= rangeEnd; cursor += step) {
        const candidateEnd = formatMinutesToTime(cursor)
        const overlaps = blockExistingRangesForDate.some((item) =>
          rangesOverlap(blockDraft.startTime, candidateEnd, item.startTime, item.endTime)
        )
        if (!overlaps) {
          endValues.add(candidateEnd)
        }
      }
    })
    return Array.from(endValues).sort((a, b) => a.localeCompare(b))
  }, [blockDayRanges, blockDraft.startTime, blockExistingRangesForDate])

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
    const isManualTimeAvailable = manualOpenSlots.some((slot) => slot.startTime === manualAppointment.startTime)
    if (!manualAppointment.startTime || !isManualTimeAvailable) {
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
    const isRescheduleTimeAvailable = rescheduleOpenSlots.some((slot) => slot.startTime === rescheduleDraft.startTime)
    if (!rescheduleDraft.startTime || !isRescheduleTimeAvailable) {
      setError('Selecciona un horario disponible para reprogramar el turno.')
      return
    }
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
    if (!blockDraft.startTime || !blockDraft.endTime) {
      setError('Selecciona un dia y un rango horario valido para bloquear.')
      return
    }
    const validStart = blockStartOptions.includes(blockDraft.startTime)
    const validEnd = blockEndOptions.includes(blockDraft.endTime)
    if (!validStart || !validEnd) {
      setError('El rango de bloqueo debe estar dentro del horario de atencion del medico.')
      return
    }
    try {
      await doctorsService.createBlock(blockDraft.doctorId, {
        date: blockDraft.date,
        startTime: blockDraft.startTime,
        endTime: blockDraft.endTime,
        reason: blockDraft.reason
      })
      setMessage('Bloqueo guardado')
      setBlockDraft((prev) => ({ ...prev, startTime: '', endTime: '' }))
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
                onChange={(event) => setBlockDraft((prev) => ({
                  ...prev,
                  doctorId: event.target.value,
                  date: today,
                  startTime: '',
                  endTime: ''
                }))}
              >
                <option value=''>Seleccionar</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                ))}
              </select>
            </label>

            {blockDraft.doctorId && (
              <div className='space-y-2 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
                  Proximos dias con agenda disponible
                </p>
                {blockAvailabilityLoading
                  ? <p className='text-xs text-emerald-900/70'>Buscando disponibilidad...</p>
                  : (
                      <div className='flex flex-wrap gap-2'>
                        {blockAvailableDates.length === 0
                          ? <span className='text-xs text-emerald-900/70'>Este medico no tiene agenda cargada en los proximos 21 dias.</span>
                          : blockAvailableDates.map((item) => (
                              <button
                                key={item.date}
                                type='button'
                                onClick={() => setBlockDraft((prev) => ({ ...prev, date: item.date, startTime: '', endTime: '' }))}
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                  blockDraft.date === item.date
                                    ? 'border-brand-500 bg-brand-100 text-brand-800'
                                    : 'border-emerald-200 bg-white/70 text-emerald-900/75 hover:bg-emerald-100'
                                }`}
                              >
                                {formatDateLabel(item.date)}
                              </button>
                            ))}
                      </div>
                    )}
              </div>
            )}

            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Dia seleccionado</span>
              <div className='glass-input flex h-11 items-center'>
                {blockDraft.date ? formatDateLabel(blockDraft.date) : 'Seleccionar un dia'}
              </div>
            </label>

            <div className='grid gap-2 sm:grid-cols-2'>
              <label className='block space-y-1'>
                <span className='text-xs text-emerald-900/75'>Inicio del bloqueo</span>
                <select
                  className='glass-input'
                  value={blockDraft.startTime}
                  onChange={(event) => setBlockDraft((prev) => ({ ...prev, startTime: event.target.value, endTime: '' }))}
                  disabled={!blockDraft.doctorId || blockStartOptions.length === 0}
                >
                  <option value=''>Seleccionar</option>
                  {blockStartOptions.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </label>
              <label className='block space-y-1'>
                <span className='text-xs text-emerald-900/75'>Fin del bloqueo</span>
                <select
                  className='glass-input'
                  value={blockDraft.endTime}
                  onChange={(event) => setBlockDraft((prev) => ({ ...prev, endTime: event.target.value }))}
                  disabled={!blockDraft.startTime || blockEndOptions.length === 0}
                >
                  <option value=''>Seleccionar</option>
                  {blockEndOptions.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </label>
            </div>
            {!blockAvailabilityLoading && blockDraft.doctorId && blockAvailableDates.length === 0
              ? <p className='text-xs text-amber-700'>No hay dias disponibles para bloquear en los proximos 21 dias.</p>
              : null}
            {!blockAvailabilityLoading && blockDraft.doctorId && blockAvailableDates.length > 0 && blockStartOptions.length === 0
              ? <p className='text-xs text-amber-700'>No hay horarios libres para bloquear en el dia seleccionado.</p>
              : null}
            <Input label='Motivo' value={blockDraft.reason} onChange={(event) => setBlockDraft((prev) => ({ ...prev, reason: event.target.value }))} />
            <Button
              type='submit'
              disabled={!blockDraft.doctorId || !blockDraft.startTime || !blockDraft.endTime}
            >
              Guardar bloqueo
            </Button>
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
                        {manualDaysWithAvailability.length === 0
                          ? <span className='text-xs text-emerald-900/70'>Este medico no tiene agenda cargada en los proximos 21 dias.</span>
                          : manualDaysWithAvailability.map((item) => (
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
              <label className='block space-y-1'>
                <span className='text-xs text-emerald-900/75'>Dia seleccionado</span>
                <div className='glass-input flex h-11 items-center'>
                  {manualAppointment.date ? formatDateLabel(manualAppointment.date) : 'Seleccionar un dia'}
                </div>
              </label>
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
                  {manualOpenSlots.map((slot) => (
                    <option key={slot.startTime} value={slot.startTime}>{slot.startTime.slice(0, 5)}</option>
                  ))}
                </select>
              </label>
            </div>
            {!manualSlotsLoading && manualAppointment.doctorId && manualOpenSlots.length === 0
              ? <p className='text-xs text-amber-700'>No hay horarios disponibles para la fecha elegida.</p>
              : null}
            <Input label='Paciente' value={manualAppointment.fullName} onChange={(event) => setManualAppointment((prev) => ({ ...prev, fullName: event.target.value }))} />
            <div className='grid gap-2 sm:grid-cols-2'>
              <Input label='DNI' value={manualAppointment.dni} onChange={(event) => setManualAppointment((prev) => ({ ...prev, dni: event.target.value }))} />
              <Input label='Telefono' value={manualAppointment.phone} onChange={(event) => setManualAppointment((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <Input label='Sintomas / motivo' value={manualAppointment.symptoms} onChange={(event) => setManualAppointment((prev) => ({ ...prev, symptoms: event.target.value }))} />
            <Button type='submit' disabled={!manualAppointment.doctorId || !manualAppointment.startTime || manualOpenSlots.length === 0}>
              Crear turno
            </Button>
          </form>
        </Card>

        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Reprogramar turno</h2>
          <form className='space-y-3' onSubmit={rescheduleAppointment}>
            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Medico</span>
              <select
                className='glass-input'
                value={rescheduleDoctorId}
                onChange={(event) => {
                  setRescheduleDoctorId(event.target.value)
                  setRescheduleDraft((prev) => ({
                    ...prev,
                    appointmentId: '',
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

            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Turno</span>
              <select
                className='glass-input'
                value={rescheduleDraft.appointmentId}
                onChange={(event) => {
                  const appointmentId = event.target.value
                  const appointment = appointments.find((item) => item.id === appointmentId)
                  setRescheduleDraft((prev) => ({
                    ...prev,
                    appointmentId,
                    date: appointment?.date || prev.date,
                    startTime: ''
                  }))
                }}
                disabled={!rescheduleDoctorId}
              >
                <option value=''>{rescheduleDoctorId ? 'Seleccionar' : 'Primero seleccionar medico'}</option>
                {rescheduleAppointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                  </option>
                ))}
              </select>
            </label>

            {rescheduleDoctorId && (
              <div className='space-y-2 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
                  Proximos dias con agenda disponible
                </p>
                {rescheduleAvailabilityLoading
                  ? <p className='text-xs text-emerald-900/70'>Buscando disponibilidad...</p>
                  : (
                      <div className='flex flex-wrap gap-2'>
                        {rescheduleDaysWithAvailability.length === 0
                          ? <span className='text-xs text-emerald-900/70'>Este medico no tiene agenda cargada en los proximos 21 dias.</span>
                          : rescheduleDaysWithAvailability.map((item) => (
                              <button
                                key={item.date}
                                type='button'
                                onClick={() => setRescheduleDraft((prev) => ({ ...prev, date: item.date, startTime: '' }))}
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                  rescheduleDraft.date === item.date
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
              <label className='block space-y-1'>
                <span className='text-xs text-emerald-900/75'>Nuevo dia seleccionado</span>
                <div className='glass-input flex h-11 items-center'>
                  {rescheduleDraft.date ? formatDateLabel(rescheduleDraft.date) : 'Seleccionar un dia'}
                </div>
              </label>
              <label className='block space-y-1'>
                <span className='text-xs text-emerald-900/75'>Nuevo horario disponible</span>
                <select
                  className='glass-input'
                  value={rescheduleDraft.startTime}
                  onChange={(event) => setRescheduleDraft((prev) => ({ ...prev, startTime: event.target.value }))}
                >
                  <option value=''>
                    {rescheduleSlotsLoading ? 'Buscando horarios...' : 'Seleccionar'}
                  </option>
                  {rescheduleOpenSlots.map((slot) => (
                    <option key={slot.startTime} value={slot.startTime}>{slot.startTime.slice(0, 5)}</option>
                  ))}
                </select>
              </label>
            </div>
            {!rescheduleSlotsLoading && rescheduleDoctorId && rescheduleOpenSlots.length === 0
              ? <p className='text-xs text-amber-700'>No hay horarios disponibles para la fecha elegida.</p>
              : null}
            <Button
              type='submit'
              disabled={!rescheduleDraft.appointmentId || !rescheduleDraft.startTime || rescheduleOpenSlots.length === 0}
            >
              Reprogramar
            </Button>
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
