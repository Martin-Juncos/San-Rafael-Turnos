import { useEffect, useMemo } from 'react'

export function useReserveSelection ({
  doctors,
  form,
  setForm,
  locationSearch,
  clearAvailability
}) {
  useEffect(() => {
    const params = new URLSearchParams(locationSearch)
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
  }, [locationSearch, setForm])

  const filteredDoctors = useMemo(() => {
    if (!form.specialtyId) return doctors
    return doctors.filter((doctor) => doctor.specialtyId === form.specialtyId)
  }, [doctors, form.specialtyId])

  const handleSpecialtyChange = (specialtyId) => {
    setForm((prev) => ({ ...prev, specialtyId, doctorId: '', startTime: '' }))
    clearAvailability()
  }

  const handleDoctorChange = (doctorId) => {
    setForm((prev) => ({ ...prev, doctorId, startTime: '' }))
    clearAvailability()
  }

  const handleInsuranceChange = (insuranceId) => {
    setForm((prev) => ({ ...prev, insuranceId }))
  }

  const handleDateChange = (date) => {
    setForm((prev) => ({ ...prev, date, startTime: '' }))
  }

  const handleSlotSelect = (startTime) => {
    setForm((prev) => ({ ...prev, startTime }))
  }

  return {
    filteredDoctors,
    handleSpecialtyChange,
    handleDoctorChange,
    handleInsuranceChange,
    handleDateChange,
    handleSlotSelect
  }
}
