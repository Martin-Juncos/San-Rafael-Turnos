import { useCallback, useEffect, useMemo, useState } from 'react'
import { appointmentsService, doctorsService, slotsService } from '../../../../api/services'
import {
  buildUpcomingDates,
  formatDateLabel,
  formatMinutesToTime,
  normalizeTimeValue,
  parseTimeToMinutes,
  rangesOverlap
} from '../clinicDashboardUtils'
import { useClinicActions } from './useClinicActions'
import { useClinicAppointments } from './useClinicAppointments'
import { useClinicFilters } from './useClinicFilters'

export function useClinicDashboardState () {
  const {
    today,
    doctorFilters,
    setDoctorFilters,
    appointmentFilters,
    setAppointmentFilters,
    manualAppointment,
    setManualAppointment,
    rescheduleDraft,
    setRescheduleDraft,
    blockDraft,
    setBlockDraft,
    rescheduleDoctorId,
    setRescheduleDoctorId
  } = useClinicFilters()

  const [slots, setSlots] = useState([])
  const [agendaConfirmedAppointments, setAgendaConfirmedAppointments] = useState([])
  const [agendaAvailableDates, setAgendaAvailableDates] = useState([])
  const [agendaAvailabilityLoading, setAgendaAvailabilityLoading] = useState(false)
  const [manualAvailableDates, setManualAvailableDates] = useState([])
  const [manualDateSlots, setManualDateSlots] = useState([])
  const [manualAvailabilityLoading, setManualAvailabilityLoading] = useState(false)
  const [manualSlotsLoading, setManualSlotsLoading] = useState(false)
  const [manualPatientLookupLoading, setManualPatientLookupLoading] = useState(false)
  const [manualPatientLookupDone, setManualPatientLookupDone] = useState(false)
  const [manualPatientExists, setManualPatientExists] = useState(false)
  const [manualPatientLookupMessage, setManualPatientLookupMessage] = useState('')
  const [rescheduleAvailableDates, setRescheduleAvailableDates] = useState([])
  const [rescheduleDateSlots, setRescheduleDateSlots] = useState([])
  const [rescheduleAvailabilityLoading, setRescheduleAvailabilityLoading] = useState(false)
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
  const [blockWeeklyAvailability, setBlockWeeklyAvailability] = useState([])
  const [blockExistingRanges, setBlockExistingRanges] = useState([])
  const [blockAvailableDates, setBlockAvailableDates] = useState([])
  const [blockAvailabilityLoading, setBlockAvailabilityLoading] = useState(false)
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })

  const {
    specialties,
    doctors,
    appointments,
    loadAppointments
  } = useClinicAppointments({
    doctorFilters,
    appointmentFilters,
    setError
  })

  useEffect(() => {
    if (!message) return
    setFeedbackModal({
      open: true,
      type: 'success',
      title: 'Operacion completada',
      description: message
    })
  }, [message])

  useEffect(() => {
    if (!error) return
    setFeedbackModal({
      open: true,
      type: 'error',
      title: 'No se pudo completar la operacion',
      description: error
    })
  }, [error])

  const closeFeedbackModal = () => {
    setFeedbackModal((prev) => ({ ...prev, open: false }))
    setMessage('')
    setError('')
  }

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
  }, [manualAppointment.doctorId, setManualAppointment])

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
  }, [manualAppointment.doctorId, manualAppointment.date, setManualAppointment])

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
  }, [rescheduleDoctorId, setRescheduleDraft])

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
  }, [rescheduleDoctorId, rescheduleDraft.date, setRescheduleDraft])

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
  }, [blockDraft.doctorId, setBlockDraft])

  const loadAgendaAvailability = useCallback(async (doctorId) => {
    if (!doctorId) {
      setAgendaAvailableDates([])
      return
    }

    setAgendaAvailabilityLoading(true)
    setError('')
    try {
      const dates = buildUpcomingDates(21)
      const results = await Promise.all(
        dates.map(async (date) => {
          const data = await slotsService.list({ doctorId, date })
          return { date, count: data.slots.length }
        })
      )

      const withAvailability = results.filter((item) => item.count > 0)
      setAgendaAvailableDates(withAvailability)

      if (withAvailability.length === 0) {
        setSlots([])
        return
      }

      setDoctorFilters((prev) => {
        const keepDate = withAvailability.some((item) => item.date === prev.date)
        if (keepDate) return prev
        return {
          ...prev,
          date: withAvailability[0].date
        }
      })
    } catch (apiError) {
      setError(apiError.message)
      setAgendaAvailableDates([])
    } finally {
      setAgendaAvailabilityLoading(false)
    }
  }, [setDoctorFilters])

  const loadSlots = useCallback(async (options = {}) => {
    const doctorId = options.doctorId || appointmentFilters.doctorId
    const date = options.date || doctorFilters.date

    if (!date || !doctorId) {
      setSlots([])
      setAgendaConfirmedAppointments([])
      return
    }

    setAgendaLoading(true)
    try {
      const [slotsResult, confirmedResult] = await Promise.all([
        slotsService.list({
          doctorId,
          date
        }),
        appointmentsService.list({
          doctorId,
          dateFrom: date,
          dateTo: date,
          status: 'confirmed',
          pageSize: 100
        })
      ])

      setSlots(slotsResult.slots)
      setAgendaConfirmedAppointments(
        (confirmedResult.items || []).sort((left, right) => left.startTime.localeCompare(right.startTime))
      )
    } catch (apiError) {
      setError(apiError.message)
      setAgendaConfirmedAppointments([])
    } finally {
      setAgendaLoading(false)
    }
  }, [appointmentFilters.doctorId, doctorFilters.date])

  useEffect(() => {
    if (!appointmentFilters.doctorId) {
      setAgendaAvailableDates([])
      setSlots([])
      setAgendaConfirmedAppointments([])
      return
    }
    setSlots([])
    setAgendaConfirmedAppointments([])
    loadAgendaAvailability(appointmentFilters.doctorId).catch(() => {})
  }, [appointmentFilters.doctorId, loadAgendaAvailability])

  useEffect(() => {
    if (!appointmentFilters.doctorId) {
      setSlots([])
      return
    }
    loadSlots({
      doctorId: appointmentFilters.doctorId,
      date: doctorFilters.date
    }).catch(() => {})
  }, [appointmentFilters.doctorId, doctorFilters.date, loadSlots])

  const selectedSpecialtyName = useMemo(() => {
    return specialties.find((item) => item.id === doctorFilters.specialtyId)?.name || 'Todas'
  }, [doctorFilters.specialtyId, specialties])

  const selectedAgendaDoctor = useMemo(() => {
    return doctors.find((item) => item.id === appointmentFilters.doctorId) || null
  }, [doctors, appointmentFilters.doctorId])

  const agendaDaysWithAvailability = useMemo(
    () => agendaAvailableDates.filter((item) => Number(item.count) > 0),
    [agendaAvailableDates]
  )

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

  const {
    handleManualPatientDniChange,
    lookupManualPatientByDni,
    createManualAppointment,
    cancelAppointment,
    rescheduleAppointment,
    createBlock
  } = useClinicActions({
    manualAppointment,
    setManualAppointment,
    manualOpenSlots,
    manualPatientLookupDone,
    setManualPatientLookupDone,
    manualPatientExists,
    setManualPatientExists,
    setManualPatientLookupMessage,
    setManualPatientLookupLoading,
    rescheduleDraft,
    rescheduleOpenSlots,
    blockDraft,
    blockStartOptions,
    blockEndOptions,
    setBlockDraft,
    setError,
    setMessage,
    loadAppointments
  })

  return {
    today,
    error,
    message,
    feedbackModal,
    closeFeedbackModal,
    specialties,
    doctors,
    appointments,
    slots,
    agendaConfirmedAppointments,
    agendaAvailableDates,
    agendaAvailabilityLoading,
    manualAvailableDates,
    manualDateSlots,
    manualAvailabilityLoading,
    manualSlotsLoading,
    manualPatientLookupLoading,
    manualPatientLookupDone,
    manualPatientExists,
    manualPatientLookupMessage,
    rescheduleDoctorId,
    rescheduleAvailableDates,
    rescheduleDateSlots,
    rescheduleAvailabilityLoading,
    rescheduleSlotsLoading,
    blockAvailableDates,
    blockAvailabilityLoading,
    agendaLoading,
    doctorFilters,
    setDoctorFilters,
    appointmentFilters,
    setAppointmentFilters,
    manualAppointment,
    setManualAppointment,
    rescheduleDraft,
    setRescheduleDraft,
    blockDraft,
    setBlockDraft,
    setRescheduleDoctorId,
    selectedSpecialtyName,
    selectedAgendaDoctor,
    agendaDaysWithAvailability,
    rescheduleAppointments,
    manualDaysWithAvailability,
    rescheduleDaysWithAvailability,
    manualOpenSlots,
    rescheduleOpenSlots,
    blockStartOptions,
    blockEndOptions,
    formatDateLabel,
    handleManualPatientDniChange,
    lookupManualPatientByDni,
    createManualAppointment,
    cancelAppointment,
    rescheduleAppointment,
    createBlock
  }
}

