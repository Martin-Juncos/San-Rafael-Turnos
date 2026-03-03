import { useCallback } from 'react'
import { doctorsService, insurancesService, secretariesService, specialtiesService } from '../../../../api/services'
import { buildAvailabilitySlots } from '../adminDashboardUtils'

export function useAdminActions ({
  specialties,
  doctors,
  insurances,
  secretaries,
  specialtyForm,
  setSpecialtyForm,
  editingSpecialtyId,
  setEditingSpecialtyId,
  resetSpecialtyForm,
  doctorForm,
  setDoctorForm,
  editingDoctorId,
  setEditingDoctorId,
  resetDoctorForm,
  secretaryForm,
  setSecretaryForm,
  editingSecretaryId,
  setEditingSecretaryId,
  resetSecretaryForm,
  insuranceForm,
  setInsuranceForm,
  editingInsuranceId,
  setEditingInsuranceId,
  resetInsuranceForm,
  availabilityDoctorId,
  setAvailabilityDoctorId,
  availabilityDraft,
  setAvailabilityDraft,
  availabilityForm,
  setAvailabilityForm,
  editingAvailabilityIndex,
  setEditingAvailabilityIndex,
  resetAvailabilityForm,
  setError,
  setMessage,
  loadAll
}) {
  const handleSubmitSpecialty = useCallback(async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const specialtyName = specialtyForm.name.trim()
    const specialtyFee = Number(specialtyForm.fee)
    const payload = {
      name: specialtyName,
      description: specialtyForm.description.trim(),
      fee: specialtyFee
    }

    try {
      if (editingSpecialtyId) {
        await specialtiesService.update(editingSpecialtyId, payload)
        setMessage(`Se actualizo la especialidad "${specialtyName}" con arancel $${specialtyFee}.`)
      } else {
        await specialtiesService.create(payload)
        setMessage(`Se creo la especialidad "${specialtyName}" con arancel $${specialtyFee}.`)
      }
      resetSpecialtyForm()
      await loadAll()
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, specialtyForm, editingSpecialtyId, resetSpecialtyForm, loadAll])

  const handleSubmitDoctor = useCallback(async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const doctorName = doctorForm.fullName.trim()
    const doctorEmail = doctorForm.email.trim()
    const payload = {
      fullName: doctorName,
      email: doctorEmail,
      phone: doctorForm.phone.trim(),
      specialtyId: doctorForm.specialtyId,
      consultorio: Number(doctorForm.consultorio)
    }
    if (doctorForm.dni) {
      payload.dni = doctorForm.dni.replace(/\D/g, '')
    }

    try {
      if (editingDoctorId) {
        await doctorsService.update(editingDoctorId, payload)
        setMessage(`Se actualizo el medico ${doctorName}.`)
      } else {
        await doctorsService.create(payload)
        setMessage(`Se creo el medico ${doctorName}. Credenciales iniciales: ${doctorEmail} + DNI.`)
      }
      resetDoctorForm()
      await loadAll()
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, doctorForm, editingDoctorId, resetDoctorForm, loadAll])

  const handleSubmitSecretary = useCallback(async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const secretaryName = secretaryForm.fullName.trim()
    const secretaryEmail = secretaryForm.email.trim()
    const payload = {
      fullName: secretaryName,
      email: secretaryEmail,
      phone: secretaryForm.phone.trim(),
      doctorId: secretaryForm.doctorId
    }
    if (secretaryForm.dni) {
      payload.dni = secretaryForm.dni.replace(/\D/g, '')
    }

    try {
      if (editingSecretaryId) {
        await secretariesService.update(editingSecretaryId, payload)
        setMessage(`Se actualizo la secretaria ${secretaryName}.`)
      } else {
        await secretariesService.create(payload)
        setMessage(`Se creo la secretaria ${secretaryName}. Credenciales iniciales: ${secretaryEmail} + DNI.`)
      }
      resetSecretaryForm()
      await loadAll()
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, secretaryForm, editingSecretaryId, resetSecretaryForm, loadAll])

  const handleSubmitInsurance = useCallback(async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const insuranceName = insuranceForm.name.trim()
    const discountPercent = Number(insuranceForm.discountPercent)
    try {
      if (editingInsuranceId) {
        await insurancesService.update(editingInsuranceId, {
          name: insuranceName,
          discountPercent
        })
        setMessage(`Obra social "${insuranceName}" actualizada con descuento ${discountPercent}%.`)
      } else {
        await insurancesService.create({
          name: insuranceName,
          discountPercent
        })
        setMessage(`Obra social "${insuranceName}" guardada con descuento ${discountPercent}%.`)
      }
      resetInsuranceForm()
      await loadAll()
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, insuranceForm, editingInsuranceId, resetInsuranceForm, loadAll])

  const handleDeleteSpecialty = useCallback(async (id) => {
    setError('')
    setMessage('')
    const specialtyName = specialties.find((item) => item.id === id)?.name
    try {
      await specialtiesService.remove(id)
      if (editingSpecialtyId === id) {
        resetSpecialtyForm()
      }
      await loadAll()
      setMessage(`Se elimino la especialidad "${specialtyName || 'seleccionada'}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, specialties, editingSpecialtyId, resetSpecialtyForm, loadAll])

  const handleEditSpecialty = useCallback((specialty) => {
    setEditingSpecialtyId(specialty.id)
    setSpecialtyForm({
      name: specialty.name || '',
      description: specialty.description || '',
      fee: Number(specialty.fee || 0)
    })
  }, [setEditingSpecialtyId, setSpecialtyForm])

  const handleDeleteDoctor = useCallback(async (id) => {
    setError('')
    setMessage('')
    const doctorName = doctors.find((item) => item.id === id)?.fullName
    try {
      await doctorsService.remove(id)
      if (editingDoctorId === id) {
        resetDoctorForm()
      }
      await loadAll()
      setMessage(`Se elimino el medico "${doctorName || 'seleccionado'}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, doctors, editingDoctorId, resetDoctorForm, loadAll])

  const handleEditDoctor = useCallback((doctor) => {
    setEditingDoctorId(doctor.id)
    setDoctorForm({
      fullName: doctor.fullName || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      dni: doctor.dni || '',
      consultorio: String(doctor.consultorio || ''),
      specialtyId: doctor.specialtyId || ''
    })
  }, [setEditingDoctorId, setDoctorForm])

  const handleDeleteSecretary = useCallback(async (id) => {
    setError('')
    setMessage('')
    const secretaryName = secretaries.find((item) => item.id === id)?.fullName || secretaries.find((item) => item.id === id)?.email
    try {
      await secretariesService.remove(id)
      if (editingSecretaryId === id) {
        resetSecretaryForm()
      }
      await loadAll()
      setMessage(`Se elimino la secretaria "${secretaryName || 'seleccionada'}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, secretaries, editingSecretaryId, resetSecretaryForm, loadAll])

  const handleEditSecretary = useCallback((secretary) => {
    setEditingSecretaryId(secretary.id)
    setSecretaryForm({
      fullName: secretary.fullName || '',
      email: secretary.email || '',
      phone: secretary.phone || '',
      dni: secretary.dni || '',
      doctorId: secretary.doctorId || ''
    })
  }, [setEditingSecretaryId, setSecretaryForm])

  const handleDeleteInsurance = useCallback(async (id) => {
    setError('')
    setMessage('')
    const insuranceName = insurances.find((item) => item.id === id)?.name
    try {
      await insurancesService.remove(id)
      if (editingInsuranceId === id) {
        resetInsuranceForm()
      }
      await loadAll()
      setMessage(`Se elimino la obra social "${insuranceName || 'seleccionada'}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, insurances, editingInsuranceId, resetInsuranceForm, loadAll])

  const handleEditInsurance = useCallback((insurance) => {
    setEditingInsuranceId(insurance.id)
    setInsuranceForm({
      name: insurance.name || '',
      discountPercent: Number(insurance.discountPercent || 0)
    })
  }, [setEditingInsuranceId, setInsuranceForm])

  const handleToggleInsuranceStatus = useCallback(async (insurance) => {
    setError('')
    setMessage('')
    const nextIsActive = !insurance.isActive
    try {
      await insurancesService.update(insurance.id, { isActive: nextIsActive })
      await loadAll()
      setMessage(`Obra social "${insurance.name}" ${nextIsActive ? 'activada' : 'desactivada'}.`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, loadAll])

  const handleLoadAvailability = useCallback(async (doctorId) => {
    setAvailabilityDoctorId(doctorId)
    setEditingAvailabilityIndex(-1)
    if (!doctorId) {
      setAvailabilityDraft([])
      return
    }
    try {
      const data = await doctorsService.getAvailability(doctorId)
      const slotRows = (data.availability || []).flatMap((item) => buildAvailabilitySlots({
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime.slice(0, 5),
        endTime: item.endTime.slice(0, 5),
        slotMinutes: Number(item.slotMinutes) || 30,
        isActive: item.isActive
      }))
      setAvailabilityDraft(slotRows)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setAvailabilityDoctorId, setEditingAvailabilityIndex, setAvailabilityDraft, setError])

  const addAvailabilityRow = useCallback(() => {
    const nextRow = {
      dayOfWeek: Number(availabilityForm.dayOfWeek),
      startTime: availabilityForm.startTime,
      endTime: availabilityForm.endTime,
      slotMinutes: Number(availabilityForm.slotMinutes),
      isActive: true
    }

    const nextRangeSlots = buildAvailabilitySlots(nextRow)
    if (editingAvailabilityIndex < 0 && nextRangeSlots.length === 0) {
      setError('Rango invalido. Verifica hora de inicio/fin y duracion de slot.')
      return
    }

    setAvailabilityDraft((prev) => {
      if (editingAvailabilityIndex >= 0) {
        return prev.map((item, index) => (index === editingAvailabilityIndex ? nextRow : item))
      }
      const merged = [...prev]
      const existingKeys = new Set(prev.map((item) => `${item.dayOfWeek}-${item.startTime}-${item.endTime}`))
      for (const slot of nextRangeSlots) {
        const key = `${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`
        if (!existingKeys.has(key)) {
          merged.push(slot)
          existingKeys.add(key)
        }
      }
      return merged
    })
    resetAvailabilityForm()
  }, [availabilityForm, editingAvailabilityIndex, setError, setAvailabilityDraft, resetAvailabilityForm])

  const handleEditAvailability = useCallback((item, index) => {
    setEditingAvailabilityIndex(index)
    setAvailabilityForm({
      dayOfWeek: String(item.dayOfWeek),
      startTime: item.startTime,
      endTime: item.endTime,
      slotMinutes: String(item.slotMinutes)
    })
  }, [setEditingAvailabilityIndex, setAvailabilityForm])

  const handleDeleteAvailability = useCallback((indexToDelete) => {
    setAvailabilityDraft((prev) => prev.filter((_, index) => index !== indexToDelete))
    if (editingAvailabilityIndex === indexToDelete) {
      resetAvailabilityForm()
      return
    }
    if (editingAvailabilityIndex > indexToDelete) {
      setEditingAvailabilityIndex((prev) => prev - 1)
    }
  }, [setAvailabilityDraft, editingAvailabilityIndex, resetAvailabilityForm, setEditingAvailabilityIndex])

  const saveAvailability = useCallback(async () => {
    if (!availabilityDoctorId || availabilityDraft.length === 0) return
    setError('')
    setMessage('')
    const doctorName = doctors.find((item) => item.id === availabilityDoctorId)?.fullName
    try {
      await doctorsService.updateAvailability(availabilityDoctorId, availabilityDraft)
      setMessage(`Disponibilidad actualizada para ${doctorName || 'el medico seleccionado'}.`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [availabilityDoctorId, availabilityDraft, setError, setMessage, doctors])

  return {
    handleSubmitSpecialty,
    handleSubmitDoctor,
    handleSubmitSecretary,
    handleSubmitInsurance,
    handleDeleteSpecialty,
    handleEditSpecialty,
    handleDeleteDoctor,
    handleEditDoctor,
    handleDeleteSecretary,
    handleEditSecretary,
    handleDeleteInsurance,
    handleEditInsurance,
    handleToggleInsuranceStatus,
    handleLoadAvailability,
    addAvailabilityRow,
    handleEditAvailability,
    handleDeleteAvailability,
    saveAvailability
  }
}

