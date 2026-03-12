import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppSelector } from '../../../../app/hooks'
import { selectAuth } from '../../../../features/auth/authSlice'
import {
  formatDateLabel,
  formatDateLongLabel,
  formatMoney
} from '../reserveUtils'
import { useReserveCatalog } from './useReserveCatalog'
import { useReserveForm } from './useReserveForm'
import { useReserveSelection } from './useReserveSelection'
import { useReserveSlots } from './useReserveSlots'
import { useReserveSubmit } from './useReserveSubmit'

export function useReservePageState () {
  const auth = useAppSelector(selectAuth)
  const location = useLocation()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })

  const isPatientRole = auth.role === 'patient'
  const isStaffBooking = ['admin', 'clinic', 'doctor'].includes(auth.role)

  const reserveForm = useReserveForm({
    auth,
    isPatientRole,
    setError,
    setSuccess,
    setPaymentError
  })

  const catalog = useReserveCatalog({ setError })

  const slots = useReserveSlots({
    doctorId: reserveForm.form.doctorId,
    date: reserveForm.form.date,
    setForm: reserveForm.setForm,
    setError
  })

  const selection = useReserveSelection({
    doctors: catalog.doctors,
    form: reserveForm.form,
    setForm: reserveForm.setForm,
    locationSearch: location.search,
    clearAvailability: slots.clearAvailability
  })

  const submit = useReserveSubmit({
    auth,
    locationSearch: location.search,
    form: reserveForm.form,
    doctors: catalog.doctors,
    specialties: catalog.specialties,
    insurances: catalog.insurances,
    isStaffBooking,
    patientLookupDone: reserveForm.patientLookupDone,
    patientExists: reserveForm.patientExists,
    setError,
    setSuccess,
    setPaymentError
  })

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

  return {
    auth,
    error,
    success,
    paymentError,
    feedbackModal,
    closeFeedbackModal,
    isPatientRole,
    isStaffBooking,
    specialties: catalog.specialties,
    insurances: catalog.insurances,
    doctors: catalog.doctors,
    availableDates: slots.availableDates,
    loadingDates: slots.loadingDates,
    slots: slots.slots,
    loadingSlots: slots.loadingSlots,
    searchSlots: slots.searchSlots,
    filteredDoctors: selection.filteredDoctors,
    handleSpecialtyChange: selection.handleSpecialtyChange,
    handleDoctorChange: selection.handleDoctorChange,
    handleInsuranceChange: selection.handleInsuranceChange,
    handleDateChange: selection.handleDateChange,
    handleSlotSelect: selection.handleSlotSelect,
    form: reserveForm.form,
    setForm: reserveForm.setForm,
    updateFormField: reserveForm.updateFormField,
    today: reserveForm.today,
    patientLookupLoading: reserveForm.patientLookupLoading,
    patientLookupDone: reserveForm.patientLookupDone,
    patientExists: reserveForm.patientExists,
    patientLookupMessage: reserveForm.patientLookupMessage,
    handlePatientDniChange: reserveForm.handlePatientDniChange,
    lookupPatientByDni: reserveForm.lookupPatientByDni,
    holdResult: submit.holdResult,
    patientAppointments: submit.patientAppointments,
    checkingMercadoPago: submit.checkingMercadoPago,
    mercadoPagoReturnPending: submit.mercadoPagoReturnPending,
    mercadoPagoLoading: submit.mercadoPagoLoading,
    mercadoPagoPreferenceId: submit.mercadoPagoPreferenceId,
    summaryRef: submit.summaryRef,
    createHold: submit.createHold,
    startMercadoPagoCheckout: submit.startMercadoPagoCheckout,
    handleMercadoPagoWalletReady: submit.handleMercadoPagoWalletReady,
    handleMercadoPagoWalletError: submit.handleMercadoPagoWalletError,
    handleMercadoPagoWalletSubmit: submit.handleMercadoPagoWalletSubmit,
    currentReservation: submit.currentReservation,
    paymentUiState: submit.paymentUiState,
    appointmentsForList: submit.appointmentsForList,
    formatDateLabel,
    formatDateLongLabel,
    formatMoney
  }
}
