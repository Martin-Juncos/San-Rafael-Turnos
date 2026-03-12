import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  appointmentsService,
  paymentsService
} from '../../../../api/services'
import {
  appointmentStatusLabels,
  normalizeDni,
  paymentStatusLabels
} from '../reserveUtils'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useReserveSubmit ({
  auth,
  locationSearch,
  form,
  doctors,
  specialties,
  insurances,
  isStaffBooking,
  patientLookupDone,
  patientExists,
  setError,
  setSuccess,
  setPaymentError
}) {
  const [holdResult, setHoldResult] = useState(null)
  const [patientAppointments, setPatientAppointments] = useState([])
  const [checkingMercadoPago, setCheckingMercadoPago] = useState(false)
  const [mercadoPagoLoading, setMercadoPagoLoading] = useState(false)
  const [mercadoPagoPreferenceId, setMercadoPagoPreferenceId] = useState('')
  const summaryRef = useRef(null)
  const webhookPaidNotifiedRef = useRef(false)

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
  }, [auth.role, setError])

  const loadAppointmentReservation = useCallback(async (appointmentId) => {
    const [appointment, payment] = await Promise.all([
      appointmentsService.getById(appointmentId),
      paymentsService.getByAppointment(appointmentId)
    ])

    return { appointment, payment }
  }, [])

  useEffect(() => {
    loadPatientAppointments().catch(() => {})
  }, [loadPatientAppointments])

  useEffect(() => {
    if (auth.role !== 'patient') return

    const params = new URLSearchParams(locationSearch)
    const appointmentId = params.get('appointmentId')
    const mpStatus = params.get('mp_status')
    const paymentId = params.get('payment_id') || params.get('collection_id')
    const providerStatus = params.get('status') || params.get('collection_status')

    if (!appointmentId && !mpStatus && !paymentId && !providerStatus) return
    const cameFromMercadoPago = Boolean(mpStatus || paymentId || providerStatus)

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
          if (cameFromMercadoPago) {
            clearQuery()
          }
          return
        }

        let syncError = null
        if (paymentId) {
          try {
            await paymentsService.syncMercadoPago(appointmentId, paymentId)
          } catch (apiError) {
            syncError = apiError
          }
        }

        const { appointment, payment } = await loadAppointmentReservation(appointmentId)
        if (isCancelled) return
        setHoldResult((prev) => ({
          appointment,
          payment,
          paymentIntent: prev?.paymentIntent ?? null,
          pricing: prev?.pricing ?? null
        }))
        setMercadoPagoPreferenceId(payment.status === 'pending' ? (payment.preferenceId || '') : '')
        await loadPatientAppointments()

        if (cameFromMercadoPago) {
          if (payment.status === 'paid') {
            setSuccess('Pago aprobado y validado. Tu turno quedo confirmado.')
          } else if (syncError) {
            setPaymentError(syncError.message || 'No se pudo validar el pago devuelto por Mercado Pago.')
          } else if (mpStatus === 'success' || paymentId) {
            setSuccess('Recibimos tu regreso de Mercado Pago. Estamos validando el pago.')
          } else if (mpStatus === 'failure') {
            setError('El pago en Mercado Pago fue rechazado o cancelado.')
          } else if (mpStatus === 'pending' || providerStatus === 'pending' || providerStatus === 'in_process') {
            setSuccess('Pago pendiente de acreditacion. Te avisaremos cuando se confirme.')
          } else if (providerStatus === 'rejected' || providerStatus === 'cancelled') {
            setError('El pago en Mercado Pago fue rechazado o cancelado.')
          }
        }

        if (cameFromMercadoPago) {
          clearQuery()
        }
        summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch (apiError) {
        if (!isCancelled) {
          setPaymentError(apiError.message || 'No se pudo validar el pago devuelto por Mercado Pago.')
          if (cameFromMercadoPago) {
            clearQuery()
          }
        }
      }
    }

    syncReturn().catch(() => {})

    return () => {
      isCancelled = true
    }
  }, [auth.role, locationSearch, loadAppointmentReservation, loadPatientAppointments, setError, setPaymentError, setSuccess])

  useEffect(() => {
    if (auth.role !== 'patient') return
    if (!holdResult?.appointment?.id) return
    if (holdResult?.payment?.status !== 'pending') return

    let isCancelled = false

    const refreshPaymentStatus = async () => {
      setCheckingMercadoPago(true)
      try {
        const { appointment, payment } = await loadAppointmentReservation(holdResult.appointment.id)
        if (isCancelled) return

        setHoldResult((prev) => ({
          appointment,
          payment,
          paymentIntent: prev?.paymentIntent ?? null,
          pricing: prev?.pricing ?? null
        }))
        setMercadoPagoPreferenceId(payment.status === 'pending' ? (payment.preferenceId || '') : '')

        if (payment.status === 'paid' && !webhookPaidNotifiedRef.current) {
          webhookPaidNotifiedRef.current = true
          setMercadoPagoPreferenceId('')
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
  }, [auth.role, holdResult?.appointment?.id, holdResult?.payment?.status, loadAppointmentReservation, loadPatientAppointments, setSuccess])

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
    if (!form.email.trim()) {
      setError('Completa un email del paciente para continuar.')
      return
    }
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      setError('Completa un email valido del paciente.')
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
        email: form.email.trim() || undefined,
        streetAndNumber: form.streetAndNumber.trim() || undefined,
        city: form.city.trim() || undefined,
        symptoms: form.symptoms.trim() || undefined,
        insuranceId: form.insuranceId || undefined
      }
      const data = await appointmentsService.create(payload)
      setHoldResult(data)
      setMercadoPagoPreferenceId('')
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

    const existingPreferenceId = holdResult?.payment?.preferenceId || mercadoPagoPreferenceId
    if (existingPreferenceId) {
      setMercadoPagoPreferenceId(existingPreferenceId)
      return
    }

    if (!form.email.trim()) {
      setPaymentError('Completa un email del paciente antes de continuar con Mercado Pago.')
      return
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      setPaymentError('Completa un email valido del paciente antes de continuar con Mercado Pago.')
      return
    }

    setMercadoPagoLoading(true)
    try {
      const preference = await paymentsService.createMercadoPagoPreference(holdResult.appointment.id)
      const preferenceId = String(preference.preferenceId || preference.id || '')

      if (!preferenceId) {
        throw new Error('No se recibio preferenceId')
      }

      setMercadoPagoPreferenceId(preferenceId)
      setHoldResult((prev) => {
        if (!prev?.payment) return prev
        return {
          ...prev,
          payment: {
            ...prev.payment,
            provider: 'mercadopago',
            status: 'pending',
            preferenceId
          }
        }
      })
    } catch (apiError) {
      setError(apiError.message || 'No se pudo iniciar Mercado Pago.')
    } finally {
      setMercadoPagoLoading(false)
    }
  }

  const handleMercadoPagoWalletReady = useCallback(() => undefined, [])

  const handleMercadoPagoWalletSubmit = useCallback(() => undefined, [])

  const handleMercadoPagoWalletError = useCallback((error) => {
    const message = typeof error?.message === 'string' && error.message
      ? error.message
      : 'No se pudo cargar el boton de Mercado Pago.'
    setPaymentError(message)
  }, [setPaymentError])

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
    const reservationDate = appointment.date || form.date
    const startTime = (appointment.startTime || form.startTime || '').slice(0, 5)
    const paidAmount = holdResult.pricing?.finalAmount ?? payment?.amount ?? 0

    return {
      doctorName,
      specialtyName,
      insuranceName,
      date: reservationDate,
      startTime,
      appointmentStatus: appointmentStatusLabels[appointment.status] || appointment.status,
      paymentStatus: paymentStatusLabels[payment?.status] || payment?.status || 'Sin pago',
      paidAmount
    }
  }, [holdResult, doctors, specialties, insurances, form.doctorId, form.specialtyId, form.insuranceId, form.date, form.startTime])

  const appointmentsForList = useMemo(() => {
    return patientAppointments.filter((item) => item.id !== holdResult?.appointment?.id)
  }, [patientAppointments, holdResult?.appointment?.id])

  return {
    holdResult,
    patientAppointments,
    checkingMercadoPago,
    mercadoPagoLoading,
    mercadoPagoPreferenceId,
    summaryRef,
    createHold,
    startMercadoPagoCheckout,
    handleMercadoPagoWalletReady,
    handleMercadoPagoWalletSubmit,
    handleMercadoPagoWalletError,
    currentReservation,
    appointmentsForList,
    loadPatientAppointments
  }
}
