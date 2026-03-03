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

  useEffect(() => {
    loadPatientAppointments().catch(() => {})
  }, [loadPatientAppointments])

  useEffect(() => {
    if (auth.role !== 'patient') return

    const params = new URLSearchParams(locationSearch)
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
  }, [auth.role, locationSearch, loadPatientAppointments, setError, setPaymentError, setSuccess])

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
  }, [auth.role, holdResult?.appointment?.id, holdResult?.payment?.status, loadPatientAppointments, setSuccess])

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
    summaryRef,
    createHold,
    startMercadoPagoCheckout,
    currentReservation,
    appointmentsForList,
    loadPatientAppointments
  }
}
