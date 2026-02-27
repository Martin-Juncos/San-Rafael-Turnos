import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { formatAppointmentDateTime, loadDoctorConsultRecords, sortByAppointmentDesc } from './consultRecordsUtils'

const buildPatientSummary = (records) => {
  const grouped = new Map()

  records.forEach((record) => {
    const appointment = record.appointment
    const patient = appointment?.patient
    if (!patient?.id) return

    if (!grouped.has(patient.id)) {
      grouped.set(patient.id, {
        patient,
        lastAppointment: appointment,
        records: []
      })
    }

    const group = grouped.get(patient.id)
    group.records.push(record)

    if (sortByAppointmentDesc(appointment, group.lastAppointment) < 0) {
      group.lastAppointment = appointment
    }
  })

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      totalRecords: group.records.length
    }))
    .sort((left, right) => sortByAppointmentDesc(left.lastAppointment, right.lastAppointment))
}

export function DoctorPatientsRecordsPage () {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loadDoctorConsultRecords()
      setRecords(result)
    } catch (apiError) {
      setError(apiError.message || 'No se pudieron cargar los registros de pacientes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords().catch(() => {})
  }, [loadRecords])

  const patients = useMemo(() => buildPatientSummary(records), [records])

  const openPatientRecords = (patientId) => {
    navigate(`/dashboard/medico/registros-pacientes/${patientId}`)
  }

  return (
    <div className='space-y-6'>
      <Card className='space-y-2'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-semibold text-emerald-950'>Registros de pacientes</h1>
            <p className='text-sm text-emerald-900/80'>
              Historial de pacientes con consultas registradas para este medico.
            </p>
          </div>
          <Button variant='secondary' onClick={() => navigate('/dashboard/medico')}>
            Volver al panel medico
          </Button>
        </div>
      </Card>

      {loading ? <Card className='text-sm text-emerald-900/75'>Cargando registros...</Card> : null}
      {!loading && error ? <Card className='text-sm text-red-700'>{error}</Card> : null}

      {!loading && !error
        ? (
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {patients.map((item) => (
              <Card
                key={item.patient.id}
                role='button'
                tabIndex={0}
                className='cursor-pointer space-y-2 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-400'
                onClick={() => openPatientRecords(item.patient.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openPatientRecords(item.patient.id)
                  }
                }}
              >
                <p className='text-lg font-semibold text-emerald-950'>{item.patient.fullName || 'Paciente sin nombre'}</p>
                <p className='text-sm text-emerald-900/80'>DNI: {item.patient.dni || '-'}</p>
                <p className='text-sm text-emerald-900/80'>Telefono: {item.patient.phone || '-'}</p>
                <p className='text-sm text-emerald-900/80'>Registros clinicos: {item.totalRecords}</p>
                <p className='text-sm text-emerald-900/80'>
                  Ultima consulta: {formatAppointmentDateTime(item.lastAppointment)}
                </p>
                <p className='pt-1 text-xs font-semibold uppercase tracking-wide text-brand-700'>Click para ver registros completos</p>
              </Card>
            ))}
            {patients.length === 0
              ? <Card className='text-sm text-emerald-900/75 md:col-span-2 xl:col-span-3'>No hay pacientes con registros clinicos cargados.</Card>
              : null}
          </div>
          )
        : null}
    </div>
  )
}
