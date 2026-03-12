import { useEffect, useMemo, useState } from 'react'
import { patientAuthService } from '../../../../api/services'
import { normalizeDni, toLocalIsoDate } from '../reserveUtils'

export function useReserveForm ({
  auth,
  isPatientRole,
  setError,
  setSuccess,
  setPaymentError
}) {
  const today = useMemo(() => toLocalIsoDate(), [])

  const [form, setForm] = useState({
    specialtyId: '',
    doctorId: '',
    insuranceId: '',
    date: today,
    startTime: '',
    fullName: auth.patient?.fullName || '',
    dni: auth.patient?.dni || '',
    phone: auth.patient?.phone || '',
    email: auth.patient?.email || '',
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
        email: auth.patient?.email || prev.email,
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
      email: '',
      streetAndNumber: '',
      city: ''
    }))
  }, [
    isPatientRole,
    auth.patient?.fullName,
    auth.patient?.dni,
    auth.patient?.phone,
    auth.patient?.email,
    auth.patient?.streetAndNumber,
    auth.patient?.city
  ])

  const handlePatientDniChange = (value) => {
    const dni = normalizeDni(value)
    setForm((prev) => ({
      ...prev,
      dni,
      fullName: '',
      phone: '',
      email: '',
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
        email: exists ? (result.patient.email || '') : '',
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

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return {
    today,
    form,
    setForm,
    updateFormField,
    patientLookupLoading,
    patientLookupDone,
    patientExists,
    patientLookupMessage,
    handlePatientDniChange,
    lookupPatientByDni
  }
}
