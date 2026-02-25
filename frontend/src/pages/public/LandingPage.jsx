import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck2,
  CircleDollarSign,
  Clock3,
  Facebook,
  Instagram,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Stethoscope
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { NewsCard } from '../../components/public/NewsCard'
import { doctorsService, newsService, slotsService, specialtiesService } from '../../api/services'

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

export function LandingPage () {
  const [specialties, setSpecialties] = useState([])
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true)
  const [specialtiesError, setSpecialtiesError] = useState('')
  const [doctors, setDoctors] = useState([])
  const [doctorsLoading, setDoctorsLoading] = useState(true)
  const [doctorsError, setDoctorsError] = useState('')
  const [expandedDoctorId, setExpandedDoctorId] = useState('')
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [agendaError, setAgendaError] = useState('')
  const [availableDates, setAvailableDates] = useState([])
  const [slotsByDate, setSlotsByDate] = useState({})
  const [selectedDate, setSelectedDate] = useState('')
  const [newsItems, setNewsItems] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState('')
  const [aboutImageFailed, setAboutImageFailed] = useState(false)

  useEffect(() => {
    let isCancelled = false

    const loadSpecialties = async () => {
      setSpecialtiesLoading(true)
      setSpecialtiesError('')
      try {
        const result = await specialtiesService.list({
          pageSize: 100,
          isActive: 'true'
        })
        if (isCancelled) return
        setSpecialties(result.items)
      } catch (apiError) {
        if (isCancelled) return
        setSpecialtiesError(apiError.message || 'No se pudieron cargar las especialidades.')
      } finally {
        if (!isCancelled) {
          setSpecialtiesLoading(false)
        }
      }
    }

    loadSpecialties().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [])

  const featuredSpecialties = useMemo(
    () => specialties.slice(0, 4),
    [specialties]
  )

  useEffect(() => {
    let isCancelled = false

    const loadDoctors = async () => {
      setDoctorsLoading(true)
      setDoctorsError('')
      try {
        const result = await doctorsService.list({
          pageSize: 100,
          isActive: 'true'
        })
        if (isCancelled) return
        setDoctors(result.items)
      } catch (apiError) {
        if (isCancelled) return
        setDoctorsError(apiError.message || 'No se pudieron cargar los profesionales.')
      } finally {
        if (!isCancelled) {
          setDoctorsLoading(false)
        }
      }
    }

    loadDoctors().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [])

  const featuredDoctors = useMemo(
    () => doctors.slice(0, 3),
    [doctors]
  )

  useEffect(() => {
    let isCancelled = false

    const loadNews = async () => {
      setNewsLoading(true)
      setNewsError('')
      try {
        const result = await newsService.list({ limit: 3 })
        if (isCancelled) return
        setNewsItems(result.items)
      } catch (apiError) {
        if (isCancelled) return
        setNewsError(apiError.message || 'No se pudieron cargar las noticias.')
      } finally {
        if (!isCancelled) {
          setNewsLoading(false)
        }
      }
    }

    loadNews().catch(() => {})
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
      setAgendaError(apiError.message || 'No se pudo cargar la disponibilidad del profesional.')
    } finally {
      setAgendaLoading(false)
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
    <div className='space-y-10'>
      <section className='glass-card overflow-hidden px-6 py-10 sm:px-10'>
        <div className='grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center'>
          <div className='space-y-5'>
            <p className='inline-flex rounded-full border border-brand-300 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700'>
              Turnos online con pagos y WhatsApp
            </p>
            <h1 className='text-3xl font-bold leading-tight text-emerald-950 sm:text-5xl'>
              Clinica San Rafael Arcangel
            </h1>
            <p className='max-w-2xl text-sm text-emerald-900/80 sm:text-base'>
              Gestiona agendas por especialidad y medico, evita sobre-reservas y confirma turnos en minutos con una experiencia digital simple y confiable.
            </p>
            <div className='flex flex-wrap gap-3'>
              <Link to='/reservar'>
                <Button>
                  <span className='inline-flex items-center gap-2'>
                    <CalendarCheck2 className='h-4 w-4' />
                    Reservar turno
                  </span>
                </Button>
              </Link>
              <Link to='/ingresar'>
                <Button variant='secondary'>
                  <span className='inline-flex items-center gap-2'>
                    <LogIn className='h-4 w-4' />
                    Ingresar
                  </span>
                </Button>
              </Link>
            </div>
          </div>
          <Card className='space-y-3 bg-white/65'>
            <p className='text-sm font-semibold text-emerald-900'>Como funciona</p>
            <ol className='space-y-2 text-sm text-emerald-900/80'>
              <li className='flex items-start gap-2'>
                <Stethoscope className='mt-0.5 h-4 w-4 text-brand-700' />
                <span>Elige especialidad, medico y horario.</span>
              </li>
              <li className='flex items-start gap-2'>
                <Clock3 className='mt-0.5 h-4 w-4 text-brand-700' />
                <span>Completa tus datos y bloquea el turno por 10 minutos.</span>
              </li>
              <li className='flex items-start gap-2'>
                <CircleDollarSign className='mt-0.5 h-4 w-4 text-brand-700' />
                <span>Realiza el pago online y confirma por WhatsApp.</span>
              </li>
            </ol>
          </Card>
        </div>
      </section>

      <section id='sobre-nosotros' className='space-y-4'>
        <h2 className='text-2xl font-semibold text-emerald-950'>Sobre nosotros</h2>
        <Card className='overflow-hidden p-0'>
          <div className='grid gap-0 md:grid-cols-[0.85fr_1.15fr] md:items-stretch'>
            <div className='h-48 bg-emerald-100 md:h-full md:min-h-[230px]'>
              {aboutImageFailed
                ? (
                  <div className='flex h-full items-center justify-center px-6 text-center text-sm font-medium text-emerald-900/80'>
                    Imagen frontal de la clinica pendiente de carga
                  </div>
                  )
                : (
                  <img
                    src='/about/frente-clinica.png'
                    alt='Frente de Clinica San Rafael Arcangel'
                    className='h-full w-full object-cover'
                    onError={() => setAboutImageFailed(true)}
                  />
                  )}
            </div>
            <div className='flex h-full flex-col justify-center gap-4 p-6 md:p-7'>
              <h3 className='text-xl font-semibold text-emerald-950'>
                Salud de calidad con cercania, organizacion e innovacion.
              </h3>
              <p className='text-sm leading-relaxed text-emerald-900/85'>
                Porque creemos que una buena atencion medica no depende solo del diagnostico, sino tambien de como acompanamos a cada paciente desde el primer contacto. En Clinica San Rafael Arcangel combinamos trato cercano, organizacion y procesos modernos para brindar una experiencia mas agil, clara y confiable para pacientes, profesionales y equipos administrativos.
              </p>
              <Link to='/sobre-nosotros' className='inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800'>
                Conoscanos mejor aca
                <ArrowRight className='h-4 w-4' />
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <section id='especialidades' className='space-y-4'>
        <h2 className='text-2xl font-semibold text-emerald-950'>Especialidades</h2>
        {specialtiesLoading
          ? (
            <Card className='p-4 text-sm text-emerald-900/75'>Cargando especialidades...</Card>
            )
          : null}
        {!specialtiesLoading && specialtiesError
          ? (
            <Card className='p-4 text-sm text-red-600'>{specialtiesError}</Card>
            )
          : null}
        {!specialtiesLoading && !specialtiesError
          ? (
            <>
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                {featuredSpecialties.map((specialty) => (
                  <Link key={specialty.id} to={`/especialidades/${specialty.id}/profesionales`} className='block'>
                    <Card className='p-4 text-center transition-transform duration-150 hover:-translate-y-0.5'>
                      <p className='text-sm font-semibold text-emerald-900'>{specialty.name}</p>
                    </Card>
                  </Link>
                ))}
              </div>
              {featuredSpecialties.length === 0
                ? <Card className='p-4 text-sm text-emerald-900/75'>No hay especialidades activas.</Card>
                : null}
            </>
            )
          : null}
        <div className='pt-1'>
          <Link to='/especialidades' className='inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800'>
            Ver todas
            <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </section>

      <section id='profesionales' className='space-y-4'>
        <h2 className='text-2xl font-semibold text-emerald-950'>Profesionales</h2>
        {doctorsLoading
          ? (
            <Card className='p-4 text-sm text-emerald-900/75'>Cargando profesionales...</Card>
            )
          : null}
        {!doctorsLoading && doctorsError
          ? (
            <Card className='p-4 text-sm text-red-600'>{doctorsError}</Card>
            )
          : null}
        {!doctorsLoading && !doctorsError
          ? (
            <>
              <div className='grid gap-4 md:grid-cols-3'>
                {featuredDoctors.map((doctor) => (
                  <Card key={doctor.id} className='space-y-3'>
                    <div className='space-y-1'>
                      <p className='text-sm font-semibold text-emerald-950'>{doctor.fullName}</p>
                      <p className='text-xs text-emerald-900/70'>
                        {doctor.specialty?.name || 'Sin especialidad asignada'}
                      </p>
                    </div>
                    <Button
                      variant='secondary'
                      className='px-3 py-1.5 text-xs'
                      onClick={() => toggleDoctorAgenda(doctor.id)}
                    >
                      {expandedDoctorId === doctor.id ? 'Ocultar disponibilidad' : 'Ver disponibilidad'}
                    </Button>

                    {expandedDoctorId === doctor.id
                      ? (
                        <div className='space-y-2 rounded-xl border border-emerald-200 bg-white/70 p-3'>
                          {agendaLoading ? <p className='text-xs text-emerald-900/75'>Cargando disponibilidad...</p> : null}
                          {!agendaLoading && agendaError ? <p className='text-xs text-red-600'>{agendaError}</p> : null}

                          {!agendaLoading && !agendaError && availableDates.length === 0
                            ? <p className='text-xs text-emerald-900/75'>No hay disponibilidad en los proximos 21 dias.</p>
                            : null}

                          {!agendaLoading && !agendaError && availableDates.length > 0
                            ? (
                              <>
                                <div className='flex flex-wrap gap-2'>
                                  {availableDates.map((item) => (
                                    <button
                                      key={item.date}
                                      type='button'
                                      onClick={() => setSelectedDate(item.date)}
                                      className={`rounded-xl border px-2 py-1 text-xs ${selectedDate === item.date ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-emerald-200 bg-white text-emerald-900'}`}
                                    >
                                      {formatDateLabel(item.date)} ({item.count})
                                    </button>
                                  ))}
                                </div>
                                <div className='flex flex-wrap gap-2'>
                                  {selectedSlots.map((slot) => (
                                    <span
                                      key={`${selectedDate}-${slot.startTime}`}
                                      className='rounded-xl border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-950'
                                    >
                                      {formatTime(slot.startTime)}
                                    </span>
                                  ))}
                                  {selectedSlots.length === 0
                                    ? <p className='text-xs text-emerald-900/70'>No hay horarios para el dia seleccionado.</p>
                                    : null}
                                </div>
                              </>
                              )
                            : null}
                        </div>
                        )
                      : null}
                  </Card>
                ))}
              </div>
              {featuredDoctors.length === 0
                ? <Card className='p-4 text-sm text-emerald-900/75'>No hay profesionales activos.</Card>
                : null}
            </>
            )
          : null}
        <div className='pt-1'>
          <Link to='/profesionales' className='inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800'>
            Ver todos
            <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </section>

      <section id='noticias' className='space-y-4'>
        <h2 className='text-2xl font-semibold text-emerald-950'>Noticias</h2>
        {newsLoading
          ? <Card className='p-4 text-sm text-emerald-900/75'>Cargando noticias...</Card>
          : null}
        {!newsLoading && newsError
          ? <Card className='p-4 text-sm text-red-600'>{newsError}</Card>
          : null}
        {!newsLoading && !newsError
          ? (
            <>
              <div className='grid gap-4 md:grid-cols-3'>
                {newsItems.map((item) => (
                  <NewsCard key={item.id} item={item} compact />
                ))}
              </div>
              {newsItems.length === 0
                ? <Card className='p-4 text-sm text-emerald-900/75'>No hay noticias disponibles en este momento.</Card>
                : null}
            </>
            )
          : null}
        <div className='pt-1'>
          <Link to='/noticias' className='inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800'>
            Ver mas noticias
            <ArrowRight className='h-4 w-4' />
          </Link>
        </div>
      </section>

      <section id='contacto' className='grid gap-4 md:grid-cols-2'>
        <Card>
          <h3 className='text-lg font-semibold text-emerald-950'>Contacto</h3>
          <div className='mt-3 space-y-2 text-sm text-emerald-900/80'>
            <p className='flex items-start gap-2'>
              <MapPin className='mt-0.5 h-4 w-4 text-brand-700' />
              <span>Av. San Martin 1234, San Rafael, Mendoza</span>
            </p>
            <p className='flex items-center gap-2'>
              <Phone className='h-4 w-4 text-brand-700' />
              <span>+54 260 412-3456</span>
            </p>
            <p className='flex items-center gap-2'>
              <Mail className='h-4 w-4 text-brand-700' />
              <span>contacto@sanrafaelturnos.com</span>
            </p>
          </div>
        </Card>
        <Card>
          <h3 className='text-lg font-semibold text-emerald-950'>Redes</h3>
          <div className='mt-2 flex flex-wrap gap-2 text-sm text-emerald-900/80'>
            <span className='inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1'>
              <Instagram className='h-4 w-4 text-brand-700' />
              Instagram
            </span>
            <span className='inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1'>
              <Facebook className='h-4 w-4 text-brand-700' />
              Facebook
            </span>
            <span className='inline-flex items-center gap-1 rounded-lg bg-white/70 px-3 py-1'>
              <MessageCircle className='h-4 w-4 text-brand-700' />
              WhatsApp
            </span>
          </div>
        </Card>
      </section>
    </div>
  )
}
