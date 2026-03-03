import { useCallback, useState } from 'react'
import {
  buildManagementForm,
  EMPTY_MANAGEMENT_FORM
} from '../doctorDashboardUtils'

export function useDoctorFilters () {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [selectedPrintDate, setSelectedPrintDate] = useState('')
  const [managementForm, setManagementForm] = useState(EMPTY_MANAGEMENT_FORM)
  const [chatDraft, setChatDraft] = useState('')

  const syncManagementForm = useCallback((appointment) => {
    setManagementForm(buildManagementForm(appointment))
  }, [])

  const resetManagementForm = useCallback(() => {
    setManagementForm(EMPTY_MANAGEMENT_FORM)
  }, [])

  return {
    selectedAppointmentId,
    setSelectedAppointmentId,
    selectedPrintDate,
    setSelectedPrintDate,
    managementForm,
    setManagementForm,
    chatDraft,
    setChatDraft,
    syncManagementForm,
    resetManagementForm
  }
}
