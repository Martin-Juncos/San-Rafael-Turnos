import { useState } from 'react'

const initialSpecialtyForm = {
  name: '',
  description: '',
  fee: 15000
}

const initialInsuranceForm = {
  name: '',
  discountPercent: 0
}

const initialDoctorForm = {
  fullName: '',
  email: '',
  phone: '',
  dni: '',
  consultorio: '',
  specialtyId: ''
}

const initialSecretaryForm = {
  fullName: '',
  email: '',
  phone: '',
  dni: '',
  doctorId: ''
}

const initialAvailabilityForm = {
  dayOfWeek: '1',
  startTime: '09:00',
  endTime: '13:00',
  slotMinutes: '30'
}

export function useAdminFilters () {
  const [specialtyForm, setSpecialtyForm] = useState(initialSpecialtyForm)
  const [editingSpecialtyId, setEditingSpecialtyId] = useState('')

  const [insuranceForm, setInsuranceForm] = useState(initialInsuranceForm)
  const [editingInsuranceId, setEditingInsuranceId] = useState('')

  const [doctorForm, setDoctorForm] = useState(initialDoctorForm)
  const [editingDoctorId, setEditingDoctorId] = useState('')

  const [secretaryForm, setSecretaryForm] = useState(initialSecretaryForm)
  const [editingSecretaryId, setEditingSecretaryId] = useState('')

  const [availabilityDoctorId, setAvailabilityDoctorId] = useState('')
  const [availabilityDraft, setAvailabilityDraft] = useState([])
  const [availabilityForm, setAvailabilityForm] = useState(initialAvailabilityForm)
  const [editingAvailabilityIndex, setEditingAvailabilityIndex] = useState(-1)

  const resetSpecialtyForm = () => {
    setSpecialtyForm(initialSpecialtyForm)
    setEditingSpecialtyId('')
  }

  const resetInsuranceForm = () => {
    setInsuranceForm(initialInsuranceForm)
    setEditingInsuranceId('')
  }

  const resetDoctorForm = () => {
    setDoctorForm(initialDoctorForm)
    setEditingDoctorId('')
  }

  const resetSecretaryForm = () => {
    setSecretaryForm(initialSecretaryForm)
    setEditingSecretaryId('')
  }

  const resetAvailabilityForm = () => {
    setAvailabilityForm(initialAvailabilityForm)
    setEditingAvailabilityIndex(-1)
  }

  return {
    specialtyForm,
    setSpecialtyForm,
    editingSpecialtyId,
    setEditingSpecialtyId,
    insuranceForm,
    setInsuranceForm,
    editingInsuranceId,
    setEditingInsuranceId,
    doctorForm,
    setDoctorForm,
    editingDoctorId,
    setEditingDoctorId,
    secretaryForm,
    setSecretaryForm,
    editingSecretaryId,
    setEditingSecretaryId,
    availabilityDoctorId,
    setAvailabilityDoctorId,
    availabilityDraft,
    setAvailabilityDraft,
    availabilityForm,
    setAvailabilityForm,
    editingAvailabilityIndex,
    setEditingAvailabilityIndex,
    resetSpecialtyForm,
    resetInsuranceForm,
    resetDoctorForm,
    resetSecretaryForm,
    resetAvailabilityForm
  }
}

