import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ActionResultModal } from '../../components/ui/ActionResultModal'
import {
  appointmentsService,
  doctorsService,
  insurancesService,
  patientAuthService,
  paymentsService,
  slotsService,
  specialtiesService
} from '../../api/services'
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
  const location = useLocation()
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
  const [patientAppointments, setPatientAppointments] = useState([])
  const [checkingMercadoPago, setCheckingMercadoPago] = useState(false)
  const [mercadoPagoLoading, setMercadoPagoLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })
  const summaryRef = useRef(null)
  const webhookPaidNotifiedRef = useRef(false)
  const isPatientRole = auth.role === 'patient'
  const isStaffBooking = ['admin', 'clinic', 'doctor'].includes(auth.role)

  const today = useMemo(() => toLocalIsoDate(), [])
  const normalizeDni = (value) => String(value || '').replace(/\D/g, '')
  const [form, setForm] = useState({
    specialtyId: '',
    doctorId: '',
    insuranceId: '',
    date: today,
    startTime: '',
    fullName: auth.patient?.fullName || '',
    dni: auth.patient?.dni || '',
    phone: auth.patient?.phone || '',
    streetAndNumber: auth.patient?.streetAndNumber || '',
    city: auth.patient?.city || '',
    symptoms: ''
  })
  const [patientLookupLoading, setPatientLookupLoading] = useState(false)
  const [patientLookupDone, setPatientLookupDone] = useState(isPatientRole)
  const [patientExists, setPatientExists] = useState(isPatientRole)
  const [patientLookupMessage, setPatientLookupMessage] = useState(
    isPatientRole ? 'Estas reservando con los datos de tu cuenta.' : ''
  )

  useEffect(() => {
    if (isPatientRole) {
      setPatientLookupDone(true)
      setPatientExists(true)
      setPatientLookupMessage('Estas reservando con los datos de tu cuenta.')
      setForm((prev) => ({
        ...prev,
        fullName: auth.patient?.fullName || prev.fullName,
        dni: auth.patient?.dni || prev.dni,
        phone: auth.patient?.phone || prev.phone,
        streetAndNumber: auth.patient?.streetAndNumber || prev.streetAndNumber,
        city: auth.patient?.city || prev.city
      }))
      return
    }

    setPatientLookupDone(false)
    setPatientExists(false)
    setPatientLookupMessage('')
    setForm((prev) => ({
      ...prev,
      fullName: '',
      dni: '',
      phone: '',
      streetAndNumber: '',
      city: ''
    }))
  }, [
    isPatientRole,
    auth.patient?.fullName,
    auth.patient?.dni,
    auth.patient?.phone,
    auth.patient?.streetAndNumber,
    auth.patient?.city
  ])

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

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const prefillDoctorId = params.get('doctorId') || ''
    const prefillSpecialtyId = params.get('specialtyId') || ''
    if (!prefillDoctorId && !prefillSpecialtyId) return

    setForm((prev) => {
      const next = { ...prev }
      let changed = false

      if (prefillSpecialtyId && prefillSpecialtyId !== prev.specialtyId) {
        next.specialtyId = prefillSpecialtyId
        changed = true
      }
      if (prefillDoctorId && prefillDoctorId !== prev.doctorId) {
        next.doctorId = prefillDoctorId
        changed = true
      }
      if (changed) {
        next.startTime = ''
      }
      return changed ? next : prev
    })
  }, [location.search])

  useEffect(() => {
    if (!success) return
    setFeedbackModal({
      open: true,
      type: 'success',
      title: 'Operacion completada',
      description: success
    })
  }, [success])

  useEffect(() => {
    if (!error) return
    setFeedbackModal({
      open: true,
      type: 'error',
      title: 'No se pudo completar la operacion',
      description: error
    })
  }, [error])

  useEffect(() => {
    if (!paymentError) return
    setFeedbackModal({
      open: true,
      type: 'error',
      title: 'No se pudo completar el pago',
      description: paymentError
    })
  }, [paymentError])

  const closeFeedbackModal = () => {
    setFeedbackModal((prev) => ({ ...prev, open: false }))
    setSuccess('')
    setError('')
    setPaymentError('')
  }

  const handlePatientDniChange = (value) => {
    const dni = normalizeDni(value)
    setForm((prev) => ({
      ...prev,
      dni,
      fullName: '',
      phone: '',
      streetAndNumber: '',
      city: ''
    }))
    setPatientLookupDone(false)
    setPatientExists(false)
    setPatientLookupMessage('')
  }

  const lookupPatientByDni = async () => {
    setError('')
    setSuccess('')
    setPaymentError('')
    setPatientLookupMessage('')

    const dni = normalizeDni(form.dni)
    if (dni.length < 6 || dni.length > 12) {
      setError('Ingresa un DNI valido para continuar.')
      return
    }

    setPatientLookupLoading(true)
    try {
      const result = await patientAuthService.prefillByDni(dni)
      const exists = Boolean(result?.exists && result?.patient)
      setPatientLookupDone(true)
      setPatientExists(exists)
      setForm((prev) => ({
        ...prev,
        dni,
        fullName: exists ? (result.patient.fullName || '') : '',
        phone: exists ? (result.patient.phone || '') : '',
        streetAndNumber: exists ? (result.patient.streetAndNumber || '') : '',
        city: exists ? (result.patient.city || '') : ''
      }))
      setPatientLookupMessage(
        exists
          ? 'Paciente encontrado. Revisa los datos y continua con la reserva.'
          : 'No encontramos ese DNI. Completa los datos para crear el turno.'
      )
    } catch (apiError) {
      setError(apiError.message || 'No se pudo verificar el DNI del paciente.')
      setPatientLookupDone(false)
      setPatientExists(false)
    } finally {
      setPatientLookupLoading(false)
    }
  }

  const filteredDoctors = useMemo(() => {
    if (!form.specialtyId) return doctors
    return doctors.filter((doctor) => doctor.specialtyId === form.specialtyId)
  }, [doctors, form.specialtyId])

  const loadPatientAppointments = useCallback(async () => {
    if (auth.role !== 'patient') {
      setPatientAppointments([])
      return
    }

    try {
      const result = await appointmentsService.listMy({ pageSize: 100 })
      setPatientAppointments(result.items)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [auth.role])

  useEffect(() => {
    loadPatientAppointments().catch(() => {})
  }, [loadPatientAppointments])

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

  useEffect(() => {
    if (auth.role !== 'patient') return

    const params = new URLSearchParams(location.search)
    const appointmentId = params.get('appointmentId')
    const mpStatus = params.get('mp_status')
    const paymentId = params.get('payment_id') || params.get('collection_id')

    if (!appointmentId && !mpStatus && !paymentId) return

    let isCancelled = false
    const clearQuery = () => {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/reservar')
      }
    }

    const syncReturn = async () => {
      setError('')
      setPaymentError('')

      try {
        if (!appointmentId) {
          clearQuery()
          return
        }

        const [appointment, payment] = await Promise.all([
          appointmentsService.getById(appointmentId),
          paymentsService.getByAppointment(appointmentId)
        ])

        if (isCancelled) return
        setHoldResult((prev) => ({
          appointment,
          payment,
          paymentIntent: prev?.paymentIntent ?? null,
          pricing: prev?.pricing ?? null
        }))
        await loadPatientAppointments()

        if (payment.status === 'paid') {
          setSuccess('Pago aprobado y validado. Tu turno quedo confirmado.')
        } else if (mpStatus === 'success' || paymentId) {
          setSuccess('Recibimos tu regreso de Mercado Pago. Estamos validando el pago con webhook seguro.')
        } else if (mpStatus === 'failure') {
          setError('El pago en Mercado Pago fue rechazado o cancelado.')
        } else if (mpStatus === 'pending') {
          setSuccess('Pago pendiente de acreditacion. Te avisaremos cuando se confirme.')
        }

        clearQuery()
        summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch (apiError) {
        if (!isCancelled) {
          setError(apiError.message || 'No se pudo consultar el estado del pago de Mercado Pago.')
          clearQuery()
        }
      }
    }

    syncReturn().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [auth.role, location.search, loadPatientAppointments])

  useEffect(() => {
    if (auth.role !== 'patient') return
    if (!holdResult?.appointment?.id) return
    if (holdResult?.payment?.status !== 'pending') return

    let isCancelled = false

    const refreshPaymentStatus = async () => {
      setCheckingMercadoPago(true)
      try {
        const [appointment, payment] = await Promise.all([
          appointmentsService.getById(holdResult.appointment.id),
          paymentsService.getByAppointment(holdResult.appointment.id)
        ])
        if (isCancelled) return

        setHoldResult((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            appointment,
            payment
          }
        })

        if (payment.status === 'paid' && !webhookPaidNotifiedRef.current) {
          webhookPaidNotifiedRef.current = true
          setSuccess('Pago aprobado y validado por Mercado Pago. Tu turno quedo confirmado.')
          await loadPatientAppointments()
        }
      } catch (_apiError) {
        // Best effort: we keep the page usable even if a polling tick fails.
      } finally {
        if (!isCancelled) {
          setCheckingMercadoPago(false)
        }
      }
    }

    refreshPaymentStatus().catch(() => {})
    const intervalId = window.setInterval(() => {
      refreshPaymentStatus().catch(() => {})
    }, 5000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [auth.role, holdResult?.appointment?.id, holdResult?.payment?.status, loadPatientAppointments])

  const createHold = async () => {
    setError('')
    setSuccess('')
    if (!['patient', 'clinic', 'admin', 'doctor'].includes(auth.role)) {
      setError('Debes iniciar sesion para cargar un turno.')
      return
    }

    if (!form.doctorId || !form.specialtyId || !form.date || !form.startTime) {
      setError('Completa profesional, especialidad, fecha y horario para continuar.')
      return
    }

    if (isStaffBooking && !patientLookupDone) {
      setError('Primero verifica el DNI del paciente.')
      return
    }

    const normalizedDni = normalizeDni(form.dni)
    if (normalizedDni.length < 6 || normalizedDni.length > 12) {
      setError('Ingresa un DNI valido del paciente.')
      return
    }
    if (!form.fullName.trim() || form.fullName.trim().length < 3) {
      setError('Completa el nombre del paciente.')
      return
    }
    if (!form.phone.trim() || form.phone.trim().length < 8) {
      setError('Completa un telefono valido del paciente.')
      return
    }
    if (isStaffBooking && !patientExists && (!form.streetAndNumber.trim() || form.streetAndNumber.trim().length < 3)) {
      setError('Completa calle y numero del paciente para continuar.')
      return
    }
    if (isStaffBooking && !patientExists && (!form.city.trim() || form.city.trim().length < 2)) {
      setError('Completa la ciudad del paciente para continuar.')
      return
    }

    try {
      const payload = {
        ...form,
        fullName: form.fullName.trim(),
        dni: normalizedDni,
        phone: form.phone.trim(),
        streetAndNumber: form.streetAndNumber.trim() || undefined,
        city: form.city.trim() || undefined,
        symptoms: form.symptoms.trim() || undefined,
        insuranceId: form.insuranceId || undefined
      }
      const data = await appointmentsService.create(payload)
      setHoldResult(data)
      await loadPatientAppointments()
      webhookPaidNotifiedRef.current = false
      setPaymentError('')
      setSuccess('La reserva se creo correctamente. Ahora completa el pago con Mercado Pago para confirmar el turno.')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const startMercadoPagoCheckout = async () => {
    if (!holdResult?.appointment?.id) {
      setError('Primero debes reservar el turno para habilitar el pago.')
      return
    }

    setError('')
    setPaymentError('')
    webhookPaidNotifiedRef.current = false
    setMercadoPagoLoading(true)
    try {
      const preference = await paymentsService.createMercadoPagoPreference(holdResult.appointment.id)
      const checkoutUrl = preference.sandboxInitPoint || preference.initPoint
      if (!checkoutUrl) {
        throw new Error('No se recibio URL de checkout')
      }
      window.location.assign(checkoutUrl)
    } catch (apiError) {
      setError(apiError.message || 'No se pudo iniciar Mercado Pago.')
    } finally {
      setMercadoPagoLoading(false)
    }
  }

  const formatMoney = (value) => {
    const amount = Number(value)
    if (Number.isNaN(amount)) return '-'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2
    }).format(amount)
  }

  const currentReservation = useMemo(() => {
    if (!holdResult?.appointment) return null

    const appointment = holdResult.appointment
    const payment = holdResult.payment
    const doctorName =
      appointment.doctor?.fullName ||
      doctors.find((item) => item.id === appointment.doctorId)?.fullName ||
      doctors.find((item) => item.id === form.doctorId)?.fullName ||
      'Profesional seleccionado'
    const specialtyName =
      appointment.specialty?.name ||
      specialties.find((item) => item.id === appointment.specialtyId)?.name ||
      specialties.find((item) => item.id === form.specialtyId)?.name ||
      'Especialidad seleccionada'
    const insuranceName =
      appointment.insurance?.name ||
      insurances.find((item) => item.id === appointment.insuranceId)?.name ||
      insurances.find((item) => item.id === form.insuranceId)?.name ||
      'Particular'
    const date = appointment.date || form.date
    const startTime = (appointment.startTime || form.startTime || '').slice(0, 5)
    const paidAmount = holdResult.pricing?.finalAmount ?? payment?.amount ?? 0

    return {
      doctorName,
      specialtyName,
      insuranceName,
      date,
      startTime,
      appointmentStatus: appointmentStatusLabels[appointment.status] || appointment.status,
      paymentStatus: paymentStatusLabels[payment?.status] || payment?.status || 'Sin pago',
      paidAmount
    }
  }, [holdResult, doctors, specialties, insurances, form.doctorId, form.specialtyId, form.insuranceId, form.date, form.startTime])

  const appointmentsForList = useMemo(() => {
    return patientAppointments.filter((item) => item.id !== holdResult?.appointment?.id)
  }, [patientAppointments, holdResult?.appointment?.id])

  const formatDateLabel = (value) => {
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const formatDateLongLabel = (value) => {
    if (!value) return '-'
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
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

          <div className='space-y-3 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
            <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
              Datos del paciente
            </p>

            {isStaffBooking
              ? (
                <div className='grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end'>
                  <Input
                    label='DNI'
                    value={form.dni}
                    onChange={(event) => handlePatientDniChange(event.target.value)}
                    placeholder='Solo numeros'
                  />
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={lookupPatientByDni}
                    disabled={patientLookupLoading}
                  >
                    {patientLookupLoading ? 'Verificando...' : 'Verificar DNI'}
                  </Button>
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={() => handlePatientDniChange('')}
                    disabled={!form.dni && !patientLookupDone}
                  >
                    Cambiar DNI
                  </Button>
                </div>
                )
              : (
                <Input label='DNI' value={form.dni} disabled />
                )}

            {patientLookupMessage
              ? (
                <p className='rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900/80'>
                  {patientLookupMessage}
                </p>
                )
              : null}

            {isStaffBooking && !patientLookupDone
              ? (
                <p className='text-xs text-amber-700'>
                  Verifica el DNI para desplegar y completar los datos del paciente.
                </p>
                )
              : (
                <div className='grid gap-3 sm:grid-cols-2'>
                  <Input
                    label='Nombre completo'
                    value={form.fullName}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  />
                  <Input
                    label='Telefono'
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                  <Input
                    label='Calle y numero'
                    value={form.streetAndNumber}
                    onChange={(event) => setForm((prev) => ({ ...prev, streetAndNumber: event.target.value }))}
                  />
                  <Input
                    label='Ciudad'
                    value={form.city}
                    onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  />
                  <div className='sm:col-span-2'>
                    <Input
                      label='Motivo / sintomas'
                      value={form.symptoms}
                      onChange={(event) => setForm((prev) => ({ ...prev, symptoms: event.target.value }))}
                    />
                  </div>
                </div>
                )}
          </div>

          <div className='grid gap-2 sm:grid-cols-2'>
            <Button onClick={createHold} disabled={!form.startTime}>Reservar turno (pendiente de pago)</Button>
            <Button
              variant='secondary'
              onClick={startMercadoPagoCheckout}
              disabled={
                !isPatientRole ||
                !holdResult?.appointment?.id ||
                mercadoPagoLoading ||
                holdResult?.payment?.status === 'paid'
              }
            >
              {mercadoPagoLoading ? 'Redirigiendo...' : 'Pagar con Mercado Pago (sandbox)'}
            </Button>
          </div>

          {holdResult?.appointment?.id && holdResult?.payment?.status === 'pending'
            ? (
              <p className='text-xs text-emerald-900/75'>
                El turno queda confirmado solo cuando Mercado Pago envie un webhook valido y el backend verifique el pago.
                {checkingMercadoPago ? ' Verificando estado...' : ''}
              </p>
              )
            : null}

          {!auth.token && (
            <p className='text-xs text-amber-700'>
              Debes <Link to='/ingresar' className='underline'>iniciar sesion</Link> como paciente para confirmar la reserva.
            </p>
          )}
        </Card>

        <div ref={summaryRef}>
          <Card className='space-y-2'>
            <h2 className='text-lg font-semibold text-emerald-950'>Resumen de reserva</h2>
            {currentReservation
              ? (
                <div className='space-y-1 text-sm text-emerald-900/80'>
                  <p><span className='font-semibold'>Medico:</span> {currentReservation.doctorName}</p>
                  <p><span className='font-semibold'>Especialidad:</span> {currentReservation.specialtyName}</p>
                  <p><span className='font-semibold'>Dia:</span> {formatDateLongLabel(currentReservation.date)}</p>
                  <p><span className='font-semibold'>Horario:</span> {currentReservation.startTime || '-'}</p>
                  <p><span className='font-semibold'>Cobertura:</span> {currentReservation.insuranceName}</p>
                  <p><span className='font-semibold'>Estado del turno:</span> {currentReservation.appointmentStatus}</p>
                  <p><span className='font-semibold'>Estado del pago:</span> {currentReservation.paymentStatus}</p>
                  <p><span className='font-semibold'>Monto pagado:</span> {formatMoney(currentReservation.paidAmount)}</p>
                </div>
                )
              : <p className='text-sm text-emerald-900/70'>Aun no creaste una reserva.</p>}

            <div className='space-y-2 pt-3'>
              <h3 className='text-sm font-semibold text-emerald-950'>Mis turnos</h3>
              {appointmentsForList.length === 0
                ? <p className='text-xs text-emerald-900/70'>No tenes otros turnos registrados.</p>
                : (
                    <div className='space-y-2'>
                      {appointmentsForList.map((appointment) => (
                        <div key={appointment.id} className='rounded-xl border border-emerald-200/70 bg-white/70 p-3 text-xs text-emerald-900/80'>
                          <p className='font-semibold text-emerald-950'>
                            {appointment.doctor?.fullName || 'Profesional'} - {appointment.specialty?.name || 'Especialidad'}
                          </p>
                          <p>{formatDateLongLabel(appointment.date)} {appointment.startTime?.slice(0, 5) || '-'}</p>
                          <p>Estado del turno: {appointmentStatusLabels[appointment.status] || appointment.status}</p>
                          <p>Estado del pago: {paymentStatusLabels[appointment.payment?.status] || appointment.payment?.status || 'Sin pago'}</p>
                          <p>Monto: {formatMoney(appointment.payment?.amount ?? 0)}</p>
                        </div>
                      ))}
                    </div>
                  )}
            </div>
          </Card>
        </div>
      </div>

      <ActionResultModal
        open={feedbackModal.open}
        type={feedbackModal.type}
        title={feedbackModal.title}
        description={feedbackModal.description}
        onClose={closeFeedbackModal}
      />
    </div>
  )
}
