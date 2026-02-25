import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { doctorsService, slotsService, specialtiesService } from '../../api/services'

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

export function SpecialtyDoctorsPage () {
  const { specialtyId } = useParams()
  const [specialty, setSpecialty] = useState(null)
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
    if (!specialtyId) return

    let isCancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [specialtiesResult, doctorsResult] = await Promise.all([
          specialtiesService.list({ pageSize: 200, isActive: 'true' }),
          doctorsService.list({ pageSize: 100, specialtyId, isActive: 'true' })
        ])

        if (isCancelled) return

        const selectedSpecialty = specialtiesResult.items.find((item) => item.id === specialtyId) || null
        setSpecialty(selectedSpecialty)
        setDoctors(doctorsResult.items)
      } catch (apiError) {
        if (isCancelled) return
        setError(apiError.message || 'No se pudieron cargar los profesionales de esta especialidad.')
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
  }, [specialtyId])

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
      setAgendaError(apiError.message || 'No se pudo cargar la agenda del profesional.')
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
        <h1 className='text-3xl font-semibold text-emerald-950'>
          {specialty?.name || 'Profesionales por especialidad'}
        </h1>
        <p className='text-sm text-emerald-900/80'>
          {specialty?.description?.trim() || 'Consulta los profesionales y revisa sus dias y horarios disponibles.'}
        </p>
        <div className='flex flex-wrap gap-3'>
          <Link to='/especialidades'><Button variant='secondary'>Volver a especialidades</Button></Link>
          <Link to='/reservar'><Button>Reservar turno</Button></Link>
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
                    {doctor.bio
                      ? <p className='text-sm text-emerald-900/80'>{doctor.bio}</p>
                      : <p className='text-sm text-emerald-900/70'>Sin descripcion disponible.</p>}
                  </div>
                  <Button
                    variant='secondary'
                    className='px-4 py-2 text-sm'
                    onClick={() => toggleDoctorAgenda(doctor.id)}
                  >
                    {expandedDoctorId === doctor.id ? 'Ocultar dias y horarios' : 'Ver dias y horarios disponibles'}
                  </Button>
                </div>

                {expandedDoctorId === doctor.id
                  ? (
                    <div className='space-y-3 rounded-xl border border-emerald-200 bg-white/70 p-4'>
                      {agendaLoading ? <p className='text-sm text-emerald-900/75'>Cargando agenda...</p> : null}
                      {!agendaLoading && agendaError ? <p className='text-sm text-red-600'>{agendaError}</p> : null}

                      {!agendaLoading && !agendaError && availableDates.length === 0
                        ? <p className='text-sm text-emerald-900/75'>No hay disponibilidad en los proximos 21 dias.</p>
                        : null}

                      {!agendaLoading && !agendaError && availableDates.length > 0
                        ? (
                          <>
                            <div className='space-y-2'>
                              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/80'>
                                Proximos dias disponibles
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
                  No hay profesionales activos en esta especialidad.
                </Card>
                )
              : null}
          </section>
          )
        : null}
    </div>
  )
}
