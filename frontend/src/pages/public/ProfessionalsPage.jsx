import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2, Clock3, Home } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { doctorsService, slotsService } from '../../api/services'

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

const formatDateLabel = (value) => {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  }).format(date)
}

const formatTime = (value) => String(value || '').slice(0, 5)

export function ProfessionalsPage () {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [expandedDoctorId, setExpandedDoctorId] = useState('')
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [agendaError, setAgendaError] = useState('')
  const [availableDates, setAvailableDates] = useState([])
  const [slotsByDate, setSlotsByDate] = useState({})
  const [selectedDate, setSelectedDate] = useState('')

  const agendaRequestRef = useRef(0)

  useEffect(() => {
    let isCancelled = false

    const loadDoctors = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await doctorsService.list({
          pageSize: 200,
          isActive: 'true'
        })
        if (isCancelled) return
        setDoctors(result.items)
      } catch (apiError) {
        if (isCancelled) return
        setError(apiError.message || 'No se pudieron cargar los profesionales.')
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadDoctors().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [])

  const selectedSlots = useMemo(
    () => slotsByDate[selectedDate] || [],
    [slotsByDate, selectedDate]
  )

  const resetAgendaState = () => {
    setAgendaLoading(false)
    setAgendaError('')
    setAvailableDates([])
    setSlotsByDate({})
    setSelectedDate('')
  }

  const loadDoctorAgenda = async (doctorId) => {
    const requestId = agendaRequestRef.current + 1
    agendaRequestRef.current = requestId
    setAgendaLoading(true)
    setAgendaError('')
    setAvailableDates([])
    setSlotsByDate({})
    setSelectedDate('')

    try {
      const dates = buildUpcomingDates(21)
      const results = await Promise.all(
        dates.map(async (date) => {
          const data = await slotsService.list({ doctorId, date })
          return { date, slots: data.slots }
        })
      )

      if (agendaRequestRef.current !== requestId) return

      const daysWithAvailability = results.filter((item) => item.slots.length > 0)
      setAvailableDates(daysWithAvailability.map((item) => ({
        date: item.date,
        count: item.slots.length
      })))

      const byDate = daysWithAvailability.reduce((acc, item) => {
        acc[item.date] = item.slots
        return acc
      }, {})

      setSlotsByDate(byDate)

      if (daysWithAvailability.length > 0) {
        setSelectedDate(daysWithAvailability[0].date)
      }
    } catch (apiError) {
      if (agendaRequestRef.current !== requestId) return
      setAgendaError(apiError.message || 'No se pudo cargar la disponibilidad del profesional.')
    } finally {
      if (agendaRequestRef.current === requestId) {
        setAgendaLoading(false)
      }
    }
  }

  const toggleDoctorAgenda = (doctorId) => {
    if (expandedDoctorId === doctorId) {
      setExpandedDoctorId('')
      resetAgendaState()
      return
    }

    setExpandedDoctorId(doctorId)
    loadDoctorAgenda(doctorId).catch(() => {})
  }

  return (
    <div className='space-y-6'>
      <section className='glass-card space-y-3 p-6 sm:p-8'>
        <h1 className='text-3xl font-semibold text-emerald-950'>Profesionales</h1>
        <p className='text-sm text-emerald-900/80'>
          Revisa todos los profesionales, su especialidad y la disponibilidad de atencion.
        </p>
        <div className='flex flex-wrap gap-3'>
          <Link to='/'>
            <Button variant='secondary'>
              <span className='inline-flex items-center gap-2'>
                <Home className='h-4 w-4' />
                Volver al inicio
              </span>
            </Button>
          </Link>
          <Link to='/reservar'>
            <Button>
              <span className='inline-flex items-center gap-2'>
                <CalendarCheck2 className='h-4 w-4' />
                Reservar turno
              </span>
            </Button>
          </Link>
        </div>
      </section>

      {loading ? <Card className='text-sm text-emerald-900/75'>Cargando profesionales...</Card> : null}
      {!loading && error ? <Card className='text-sm text-red-600'>{error}</Card> : null}

      {!loading && !error
        ? (
          <section className='space-y-4'>
            {doctors.map((doctor) => (
              <Card key={doctor.id} className='space-y-4'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='space-y-1'>
                    <h2 className='text-lg font-semibold text-emerald-950'>{doctor.fullName}</h2>
                    <p className='text-sm text-emerald-900/80'>
                      Especialidad: {doctor.specialty?.name || 'Sin especialidad asignada'}
                    </p>
                  </div>
                  <Button
                    variant='secondary'
                    className='px-4 py-2 text-sm'
                    onClick={() => toggleDoctorAgenda(doctor.id)}
                  >
                    <span className='inline-flex items-center gap-2'>
                      <Clock3 className='h-4 w-4' />
                      {expandedDoctorId === doctor.id ? 'Ocultar disponibilidad' : 'Ver disponibilidad'}
                    </span>
                  </Button>
                </div>

                {expandedDoctorId === doctor.id
                  ? (
                    <div className='space-y-3 rounded-xl border border-emerald-200 bg-white/70 p-4'>
                      {agendaLoading ? <p className='text-sm text-emerald-900/75'>Cargando disponibilidad...</p> : null}
                      {!agendaLoading && agendaError ? <p className='text-sm text-red-600'>{agendaError}</p> : null}

                      {!agendaLoading && !agendaError && availableDates.length === 0
                        ? <p className='text-sm text-emerald-900/75'>No hay disponibilidad en los proximos 21 dias.</p>
                        : null}

                      {!agendaLoading && !agendaError && availableDates.length > 0
                        ? (
                          <>
                            <div className='space-y-2'>
                              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/80'>
                                Dias disponibles
                              </p>
                              <div className='flex flex-wrap gap-2'>
                                {availableDates.map((item) => (
                                  <button
                                    key={item.date}
                                    type='button'
                                    onClick={() => setSelectedDate(item.date)}
                                    className={`rounded-xl border px-3 py-2 text-sm ${selectedDate === item.date ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-emerald-200 bg-white text-emerald-900'}`}
                                  >
                                    {formatDateLabel(item.date)} ({item.count})
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className='space-y-2'>
                              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/80'>
                                Horarios disponibles
                              </p>
                              <div className='flex flex-wrap gap-2'>
                                {selectedSlots.map((slot) => (
                                  <span
                                    key={`${selectedDate}-${slot.startTime}`}
                                    className='rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-950'
                                  >
                                    {formatTime(slot.startTime)}
                                  </span>
                                ))}
                                {selectedSlots.length === 0
                                  ? <p className='text-sm text-emerald-900/70'>No hay horarios disponibles para el dia seleccionado.</p>
                                  : null}
                              </div>
                            </div>
                          </>
                          )
                        : null}
                    </div>
                    )
                  : null}
              </Card>
            ))}

            {doctors.length === 0
              ? (
                <Card className='text-sm text-emerald-900/75'>
                  No hay profesionales activos para mostrar.
                </Card>
                )
              : null}
          </section>
          )
        : null}
    </div>
  )
}
