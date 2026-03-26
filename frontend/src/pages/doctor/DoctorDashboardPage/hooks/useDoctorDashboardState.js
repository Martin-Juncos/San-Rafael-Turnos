import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../../app/hooks'
import {
  selectAuth,
  setActiveDoctorContext
} from '../../../../features/auth/authSlice'
import { useDoctorSpecialty } from '../../../../hooks/useDoctorSpecialty'
import {
  APPOINTMENT_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  APPOINTMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS
} from '../doctorDashboardUtils'
import { useDoctorActions } from './useDoctorActions'
import { useDoctorAgenda } from './useDoctorAgenda'
import { useDoctorFilters } from './useDoctorFilters'
import { useDoctorMessages } from './useDoctorMessages'

const describeDeleteTarget = (appointment) => {
  if (!appointment) return ''
  const patientName = appointment.patient?.fullName || 'Paciente sin nombre'
  const time = (appointment.startTime || '').slice(0, 5)
  return `${appointment.date} ${time} - ${patientName}`.trim()
}

export function useDoctorDashboardState () {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const auth = useAppSelector(selectAuth)
  const isSecretary = auth.role === 'secretary'
  const activeDoctorId = ['doctor', 'secretary'].includes(auth.role) ? auth.activeDoctorId : ''
  const doctorScopes = Array.isArray(auth.user?.doctorScopes) ? auth.user.doctorScopes : []
  const doctorSpecialtyId = useDoctorSpecialty(activeDoctorId)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    appointmentId: '',
    appointmentLabel: ''
  })

  const filters = useDoctorFilters()
  const syncManagementForm = filters.syncManagementForm

  const agenda = useDoctorAgenda({
    activeDoctorId,
    selectedAppointmentId: filters.selectedAppointmentId,
    setSelectedAppointmentId: filters.setSelectedAppointmentId,
    setSelectedPrintDate: filters.setSelectedPrintDate,
    setError
  })

  const doctorMessages = useDoctorMessages({
    appointments: agenda.appointments,
    selectedAppointmentId: filters.selectedAppointmentId,
    selectedAppointment: agenda.selectedAppointment,
    chatDraft: filters.chatDraft,
    setChatDraft: filters.setChatDraft,
    setError
  })

  useEffect(() => {
    syncManagementForm(agenda.selectedAppointment)
  }, [agenda.selectedAppointment, syncManagementForm])

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

  const actions = useDoctorActions({
    navigate,
    activeDoctorId,
    canOpenPatientRecords: !isSecretary,
    canOpenConsultRecord: !isSecretary,
    doctorSpecialtyId,
    selectedPrintDate: filters.selectedPrintDate,
    appointments: agenda.appointments,
    selectedAppointmentId: filters.selectedAppointmentId,
    setSelectedAppointmentId: filters.setSelectedAppointmentId,
    selectedAppointment: agenda.selectedAppointment,
    managementForm: filters.managementForm,
    loadAppointments: agenda.loadAppointments,
    setError,
    setMessage
  })

  const handleSelectAppointment = (appointmentId) => {
    filters.setSelectedAppointmentId(appointmentId)
    doctorMessages.markConversationRead(appointmentId)
  }

  const setActiveDoctor = (doctorId) => {
    dispatch(setActiveDoctorContext(doctorId))
    filters.setSelectedAppointmentId('')
    filters.setSelectedPrintDate('')
  }

  const handleOpenIncomingAlert = () => {
    if (!doctorMessages.incomingAlert?.appointmentId) return
    handleSelectAppointment(doctorMessages.incomingAlert.appointmentId)
    doctorMessages.setIncomingAlert(null)
  }

  const openDeleteModal = () => {
    if (!agenda.selectedAppointment?.id) return
    setDeleteModal({
      open: true,
      appointmentId: agenda.selectedAppointment.id,
      appointmentLabel: describeDeleteTarget(agenda.selectedAppointment)
    })
  }

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      appointmentId: '',
      appointmentLabel: ''
    })
  }

  const confirmDeleteAppointment = async () => {
    if (!deleteModal.appointmentId) return
    const appointmentId = deleteModal.appointmentId
    closeDeleteModal()
    await actions.deleteAppointment(appointmentId)
  }

  return {
    auth,
    isSecretary,
    activeDoctorId,
    doctorScopes,
    setActiveDoctor,
    error,
    message,
    feedbackModal,
    deleteModal,
    closeFeedbackModal,
    closeDeleteModal,
    appointments: agenda.appointments,
    selectedAppointment: agenda.selectedAppointment,
    printableDates: agenda.printableDates,
    selectedAppointmentId: filters.selectedAppointmentId,
    selectedPrintDate: filters.selectedPrintDate,
    managementForm: filters.managementForm,
    chatDraft: filters.chatDraft,
    setSelectedPrintDate: filters.setSelectedPrintDate,
    setManagementForm: filters.setManagementForm,
    setChatDraft: filters.setChatDraft,
    messages: doctorMessages.messages,
    incomingAlert: doctorMessages.incomingAlert,
    setIncomingAlert: doctorMessages.setIncomingAlert,
    unreadAppointmentIds: doctorMessages.unreadAppointmentIds,
    chatEligibleAppointments: doctorMessages.chatEligibleAppointments,
    handleSelectAppointment,
    handleOpenIncomingAlert,
    markConversationRead: doctorMessages.markConversationRead,
    sendMessage: doctorMessages.sendMessage,
    savingManagement: actions.savingManagement,
    deletingAppointment: actions.deletingAppointment,
    updateStatus: actions.updateStatus,
    markPaymentAsPaid: actions.markPaymentAsPaid,
    saveManagement: actions.saveManagement,
    openDeleteModal,
    confirmDeleteAppointment,
    openPrintDayView: actions.openPrintDayView,
    openReserveWithPrefill: actions.openReserveWithPrefill,
    openPatientRecords: actions.openPatientRecords,
    openConsultRecord: actions.openConsultRecord,
    appointmentStatusOptions: APPOINTMENT_STATUS_OPTIONS,
    paymentStatusOptions: PAYMENT_STATUS_OPTIONS,
    appointmentStatusLabels: APPOINTMENT_STATUS_LABELS,
    paymentStatusLabels: PAYMENT_STATUS_LABELS
  }
}
