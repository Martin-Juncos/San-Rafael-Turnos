import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { appointmentsService, doctorsService, insurancesService, paymentsService, slotsService, specialtiesService } from '../../api/services'
import { useAppSelector } from '../../app/hooks'
import { selectAuth } from '../../features/auth/authSlice'

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

export function ReservePage () {
  const auth = useAppSelector(selectAuth)
  const [specialties, setSpecialties] = useState([])
  const [insurances, setInsurances] = useState([])
  const [doctors, setDoctors] = useState([])
  const [availableDates, setAvailableDates] = useState([])
  const [loadingDates, setLoadingDates] = useState(false)
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [holdResult, setHoldResult] = useState(null)

  const today = useMemo(() => toLocalIsoDate(), [])
  const [form, setForm] = useState({
    specialtyId: '',
    doctorId: '',
    insuranceId: '',
    date: today,
    startTime: '',
    fullName: auth.patient?.fullName || '',
    dni: auth.patient?.dni || '',
    phone: auth.patient?.phone || '',
    symptoms: ''
  })

  useEffect(() => {
    const load = async () => {
      const [specResult, insuranceResult, doctorsResult] = await Promise.all([
        specialtiesService.list({ pageSize: 100 }),
        insurancesService.list({ pageSize: 100, isActive: 'true' }),
        doctorsService.list({ pageSize: 100 })
      ])
      setSpecialties(specResult.items)
      setInsurances(insuranceResult.items)
      setDoctors(doctorsResult.items)
    }
    load().catch((apiError) => setError(apiError.message))
  }, [])

  const filteredDoctors = useMemo(() => {
    if (!form.specialtyId) return doctors
    return doctors.filter((doctor) => doctor.specialtyId === form.specialtyId)
  }, [doctors, form.specialtyId])

  const fetchSlotsByDate = useCallback(async (doctorId, date, showLoading = true) => {
    if (!doctorId || !date) {
      setSlots([])
      return
    }

    setError('')
    if (showLoading) setLoadingSlots(true)
    try {
      const data = await slotsService.list({ doctorId, date })
      setSlots(data.slots)
    } catch (apiError) {
      setError(apiError.message)
      setSlots([])
    } finally {
      if (showLoading) setLoadingSlots(false)
    }
  }, [])

  const searchSlots = async () => {
    await fetchSlotsByDate(form.doctorId, form.date, true)
  }

  useEffect(() => {
    if (!form.doctorId) {
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
          dates.map(async (date) => {
            const data = await slotsService.list({ doctorId: form.doctorId, date })
            return { date, count: data.slots.length }
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

    loadDoctorAgenda()

    return () => {
      isCancelled = true
    }
  }, [form.doctorId])

  useEffect(() => {
    if (!form.doctorId || !form.date) {
      setSlots([])
      return
    }
    fetchSlotsByDate(form.doctorId, form.date, true).catch(() => {})
  }, [form.doctorId, form.date, fetchSlotsByDate])

  const createHold = async () => {
    setError('')
    setSuccess('')
    if (auth.role !== 'patient') {
      setError('Para reservar debes ingresar como paciente.')
      return
    }
    try {
      const payload = {
        ...form,
        insuranceId: form.insuranceId || undefined
      }
      const data = await appointmentsService.create(payload)
      setHoldResult(data)
      setSuccess('Reserva creada. Completa el pago para confirmar tu turno.')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const confirmPayment = async () => {
    if (!holdResult?.appointment?.id) return
    setError('')
    try {
      await paymentsService.confirmMock(holdResult.appointment.id)
      setSuccess('Pago confirmado. Tu turno quedo confirmado.')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const formatDateLabel = (value) => {
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    })
  }

  return (
    <div className='space-y-6'>
      <Card className='space-y-4'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Reserva de turnos</h1>
        <p className='text-sm text-emerald-900/80'>
          Selecciona especialidad y profesional. Te mostramos dias y horarios disponibles para reservar.
        </p>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
        <Card className='space-y-3'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='space-y-1 text-sm'>
              <span className='text-xs text-emerald-900/75'>Especialidad</span>
              <select
                className='glass-input'
                value={form.specialtyId}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, specialtyId: event.target.value, doctorId: '', startTime: '' }))
                  setSlots([])
                }}
              >
                <option value=''>Seleccionar</option>
                {specialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                ))}
              </select>
            </label>

            <label className='space-y-1 text-sm'>
              <span className='text-xs text-emerald-900/75'>Profesional</span>
              <select
                className='glass-input'
                value={form.doctorId}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, doctorId: event.target.value, startTime: '' }))
                  setAvailableDates([])
                  setSlots([])
                }}
              >
                <option value=''>Seleccionar</option>
                {filteredDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                ))}
              </select>
              <span className='text-[11px] text-emerald-900/60'>
                Los dias y horarios los configura la clinica en Panel Admin {'->'} Disponibilidad por medico.
              </span>
            </label>

            <label className='space-y-1 text-sm sm:col-span-2'>
              <span className='text-xs text-emerald-900/75'>Obra social (opcional)</span>
              <select
                className='glass-input'
                value={form.insuranceId}
                onChange={(event) => setForm((prev) => ({ ...prev, insuranceId: event.target.value }))}
              >
                <option value=''>Particular (sin descuento)</option>
                {insurances.map((insurance) => (
                  <option key={insurance.id} value={insurance.id}>
                    {insurance.name} - {insurance.discountPercent}% desc.
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.doctorId && (
            <div className='space-y-2 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
                Proximos dias con turnos disponibles
              </p>
              {loadingDates
                ? <p className='text-xs text-emerald-900/70'>Buscando disponibilidad...</p>
                : (
                    <div className='flex flex-wrap gap-2'>
                      {availableDates.length === 0
                        ? (
                          <span className='text-xs text-emerald-900/70'>
                            Este profesional no tiene agenda publicada en los proximos 21 dias. Solicita a la clinica cargar disponibilidad.
                          </span>
                          )
                        : availableDates.map((item) => (
                            <button
                              key={item.date}
                              type='button'
                              onClick={() => setForm((prev) => ({ ...prev, date: item.date, startTime: '' }))}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                form.date === item.date
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

          <div className='grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end'>
            <Input
              type='date'
              label='Fecha'
              min={today}
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value, startTime: '' }))}
            />
            <Button onClick={searchSlots} disabled={loadingSlots || !form.doctorId}>
              {loadingSlots ? 'Buscando...' : 'Actualizar horarios'}
            </Button>
          </div>

          <div className='flex flex-wrap gap-2'>
            {slots.length === 0
              ? (
                <span className='text-xs text-emerald-900/70'>
                  {!form.doctorId
                    ? 'Selecciona un profesional para ver horarios.'
                    : 'No hay horarios disponibles para la fecha seleccionada.'}
                </span>
                )
              : slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type='button'
                    onClick={() => setForm((prev) => ({ ...prev, startTime: slot.startTime }))}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      form.startTime === slot.startTime
                        ? 'border-brand-500 bg-brand-100 text-brand-800'
                        : 'border-emerald-200 bg-white/70 text-emerald-900/75 hover:bg-emerald-100'
                    }`}
                  >
                    {slot.startTime.slice(0, 5)}
                  </button>
                ))}
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <Input
              label='Nombre completo'
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
            <Input
              label='DNI'
              value={form.dni}
              onChange={(event) => setForm((prev) => ({ ...prev, dni: event.target.value }))}
            />
            <Input
              label='Telefono'
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <Input
              label='Motivo / sintomas'
              value={form.symptoms}
              onChange={(event) => setForm((prev) => ({ ...prev, symptoms: event.target.value }))}
            />
          </div>

          <Button onClick={createHold} disabled={!form.startTime}>Reservar turno (pendiente de pago)</Button>
          {holdResult?.appointment?.id ? (
            <Button variant='secondary' onClick={confirmPayment}>
              Confirmar pago y confirmar turno
            </Button>
          ) : null}

          {!auth.token && (
            <p className='text-xs text-amber-700'>
              Debes <Link to='/ingresar' className='underline'>iniciar sesion</Link> como paciente para confirmar la reserva.
            </p>
          )}
        </Card>

        <Card className='space-y-2'>
          <h2 className='text-lg font-semibold text-emerald-950'>Resumen de reserva</h2>
          {holdResult
            ? (
              <div className='space-y-1 text-sm text-emerald-900/80'>
                <p>Reserva: {holdResult.appointment.id}</p>
                <p>Estado del turno: {appointmentStatusLabels[holdResult.appointment.status] || holdResult.appointment.status}</p>
                <p>Estado del pago: {paymentStatusLabels[holdResult.payment.status] || holdResult.payment.status}</p>
                <p>Monto a pagar: ${holdResult.payment.amount}</p>
                {holdResult.pricing
                  ? (
                    <>
                      <p>Arancel base: ${holdResult.pricing.baseAmount}</p>
                      <p>Descuento aplicado: {holdResult.pricing.discountPercent}%</p>
                      <p>Monto final: ${holdResult.pricing.finalAmount}</p>
                    </>
                    )
                  : null}
              </div>
              )
            : <p className='text-sm text-emerald-900/70'>Aun no creaste una reserva.</p>}
          {success ? <p className='text-sm text-emerald-700'>{success}</p> : null}
          {error ? <p className='text-sm text-red-600'>{error}</p> : null}
        </Card>
      </div>
    </div>
  )
}
