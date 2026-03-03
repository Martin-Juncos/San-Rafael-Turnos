import { useCallback, useEffect, useState } from 'react'
import { slotsService } from '../../../../api/services'
import { buildUpcomingDates } from '../reserveUtils'

export function useReserveSlots ({
  doctorId,
  date,
  setForm,
  setError
}) {
  const [availableDates, setAvailableDates] = useState([])
  const [loadingDates, setLoadingDates] = useState(false)
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const clearAvailability = useCallback(() => {
    setAvailableDates([])
    setSlots([])
  }, [])

  const fetchSlotsByDate = useCallback(async (nextDoctorId, nextDate, showLoading = true) => {
    if (!nextDoctorId || !nextDate) {
      setSlots([])
      return
    }

    setError('')
    if (showLoading) setLoadingSlots(true)
    try {
      const data = await slotsService.list({ doctorId: nextDoctorId, date: nextDate })
      setSlots(data.slots)
    } catch (apiError) {
      setError(apiError.message)
      setSlots([])
    } finally {
      if (showLoading) setLoadingSlots(false)
    }
  }, [setError])

  const searchSlots = useCallback(async () => {
    await fetchSlotsByDate(doctorId, date, true)
  }, [doctorId, date, fetchSlotsByDate])

  useEffect(() => {
    if (!doctorId) {
      setAvailableDates([])
      setSlots([])
      return
    }

    let isCancelled = false

    const loadDoctorAgenda = async () => {
      setLoadingDates(true)
      setError('')
      try {
        const dates = buildUpcomingDates(21)
        const results = await Promise.all(
          dates.map(async (agendaDate) => {
            const data = await slotsService.list({ doctorId, date: agendaDate })
            return { date: agendaDate, count: data.slots.length }
          })
        )

        if (isCancelled) return

        const datesWithAvailability = results.filter((item) => item.count > 0)
        setAvailableDates(datesWithAvailability)

        if (datesWithAvailability.length === 0) {
          setSlots([])
          return
        }

        setForm((prev) => ({
          ...prev,
          date: datesWithAvailability[0].date,
          startTime: ''
        }))
      } catch (apiError) {
        if (!isCancelled) setError(apiError.message)
      } finally {
        if (!isCancelled) setLoadingDates(false)
      }
    }

    loadDoctorAgenda().catch(() => {})

    return () => {
      isCancelled = true
    }
  }, [doctorId, setError, setForm])

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([])
      return
    }
    fetchSlotsByDate(doctorId, date, true).catch(() => {})
  }, [doctorId, date, fetchSlotsByDate])

  return {
    availableDates,
    loadingDates,
    slots,
    loadingSlots,
    clearAvailability,
    searchSlots
  }
}
