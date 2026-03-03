import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAdminActions } from './useAdminActions'
import { useAdminDoctors } from './useAdminDoctors'
import { useAdminFilters } from './useAdminFilters'
import { useAdminInsurances } from './useAdminInsurances'
import { useAdminSecretaries } from './useAdminSecretaries'
import { useAdminSpecialties } from './useAdminSpecialties'

export function useAdminDashboardState () {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })

  const {
    specialties,
    loadingSpecialties,
    loadSpecialties
  } = useAdminSpecialties()
  const {
    doctors,
    loadingDoctors,
    loadDoctors
  } = useAdminDoctors()
  const {
    insurances,
    loadingInsurances,
    loadInsurances
  } = useAdminInsurances()
  const {
    secretaries,
    loadingSecretaries,
    loadSecretaries
  } = useAdminSecretaries()

  const filters = useAdminFilters()

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadSpecialties(),
      loadInsurances(),
      loadDoctors(),
      loadSecretaries()
    ])
  }, [loadSpecialties, loadInsurances, loadDoctors, loadSecretaries])

  useEffect(() => {
    loadAll().catch((apiError) => setError(apiError.message))
  }, [loadAll])

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

  const actions = useAdminActions({
    specialties,
    doctors,
    insurances,
    secretaries,
    specialtyForm: filters.specialtyForm,
    setSpecialtyForm: filters.setSpecialtyForm,
    editingSpecialtyId: filters.editingSpecialtyId,
    setEditingSpecialtyId: filters.setEditingSpecialtyId,
    resetSpecialtyForm: filters.resetSpecialtyForm,
    doctorForm: filters.doctorForm,
    setDoctorForm: filters.setDoctorForm,
    editingDoctorId: filters.editingDoctorId,
    setEditingDoctorId: filters.setEditingDoctorId,
    resetDoctorForm: filters.resetDoctorForm,
    secretaryForm: filters.secretaryForm,
    setSecretaryForm: filters.setSecretaryForm,
    editingSecretaryId: filters.editingSecretaryId,
    setEditingSecretaryId: filters.setEditingSecretaryId,
    resetSecretaryForm: filters.resetSecretaryForm,
    insuranceForm: filters.insuranceForm,
    setInsuranceForm: filters.setInsuranceForm,
    editingInsuranceId: filters.editingInsuranceId,
    setEditingInsuranceId: filters.setEditingInsuranceId,
    resetInsuranceForm: filters.resetInsuranceForm,
    availabilityDoctorId: filters.availabilityDoctorId,
    setAvailabilityDoctorId: filters.setAvailabilityDoctorId,
    availabilityDraft: filters.availabilityDraft,
    setAvailabilityDraft: filters.setAvailabilityDraft,
    availabilityForm: filters.availabilityForm,
    setAvailabilityForm: filters.setAvailabilityForm,
    editingAvailabilityIndex: filters.editingAvailabilityIndex,
    setEditingAvailabilityIndex: filters.setEditingAvailabilityIndex,
    resetAvailabilityForm: filters.resetAvailabilityForm,
    setError,
    setMessage,
    loadAll
  })

  const selectedAvailabilityDay = Number(filters.availabilityForm.dayOfWeek)
  const availabilityForSelectedDay = useMemo(() => {
    return filters.availabilityDraft
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.dayOfWeek === selectedAvailabilityDay)
      .sort((a, b) => a.item.startTime.localeCompare(b.item.startTime))
  }, [filters.availabilityDraft, selectedAvailabilityDay])

  return {
    error,
    message,
    feedbackModal,
    closeFeedbackModal,
    loadingSpecialties,
    loadingDoctors,
    loadingInsurances,
    loadingSecretaries,
    specialties,
    doctors,
    insurances,
    secretaries,
    loadAll,
    availabilityForSelectedDay,
    ...filters,
    ...actions
  }
}

