import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import {
  APPOINTMENT_STATUS_LABELS,
  formatAppointmentDateTime,
  formatConsultNoteStatus,
  formatDateTime,
  formatFollowUp,
  loadDoctorConsultRecords,
  sortByAppointmentDesc
} from './consultRecordsUtils'

const ReadRow = ({ label, value }) => (
  <p className='text-sm text-emerald-900/85'>
    <span className='font-medium text-emerald-900'>{label}: </span>
    <span className='text-emerald-950'>{value || '-'}</span>
  </p>
)

export function DoctorPatientRecordsDetailPage () {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')

  const loadRecords = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError('')
    try {
      const allRecords = await loadDoctorConsultRecords()
      const filtered = allRecords
        .filter((item) => (item.appointment?.patientId || item.appointment?.patient?.id) === patientId)
        .sort((left, right) => sortByAppointmentDesc(left.appointment, right.appointment))
      setRecords(filtered)
    } catch (apiError) {
      setError(apiError.message || 'No se pudo cargar el detalle de registros del paciente.')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    loadRecords().catch(() => {})
  }, [loadRecords])

  const patient = useMemo(() => records[0]?.appointment?.patient || null, [records])

  return (
    <div className='space-y-6'>
      <Card className='space-y-2'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-semibold text-emerald-950'>Registros completos del paciente</h1>
            <p className='text-sm text-emerald-900/80'>
              Consulta detallada de evoluciones clinicas y conducta medica por turno.
            </p>
          </div>
          <Button variant='secondary' onClick={() => navigate('/dashboard/medico/registros-pacientes')}>
            Volver al listado
          </Button>
        </div>
      </Card>

      {loading ? <Card className='text-sm text-emerald-900/75'>Cargando historial clinico...</Card> : null}
      {!loading && error ? <Card className='text-sm text-red-700'>{error}</Card> : null}

      {!loading && !error
        ? (
          <>
            {patient
              ? (
                <Card className='space-y-1'>
                  <h2 className='text-lg font-semibold text-emerald-950'>{patient.fullName || 'Paciente sin nombre'}</h2>
                  <ReadRow label='DNI' value={patient.dni} />
                  <ReadRow label='Telefono' value={patient.phone} />
                  <ReadRow label='Direccion' value={patient.streetAndNumber || '-'} />
                  <ReadRow label='Ciudad' value={patient.city || '-'} />
                </Card>
                )
              : null}

            <div className='space-y-4'>
              {records.map(({ appointment, consultNote }) => (
                <Card key={consultNote.id} className='space-y-3'>
                  <div className='space-y-1 border-b border-emerald-200/70 pb-2'>
                    <p className='text-lg font-semibold text-emerald-950'>
                      {formatAppointmentDateTime(appointment)}
                    </p>
                    <p className='text-sm text-emerald-900/80'>
                      Especialidad: <span className='font-medium text-emerald-950'>{appointment.specialty?.name || '-'}</span>
                      {' '}|{' '}
                      Profesional: <span className='font-medium text-emerald-950'>{appointment.doctor?.fullName || '-'}</span>
                    </p>
                    <p className='text-sm text-emerald-900/80'>
                      Estado turno: {APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status || '-'}
                      {' '}|{' '}
                      Estado final consulta: {formatConsultNoteStatus(consultNote.statusFinal)}
                    </p>
                  </div>

                  <div className='grid gap-3 lg:grid-cols-2'>
                    <div className='space-y-2'>
                      <ReadRow label='Motivo / sintomas' value={appointment.symptoms || 'Sin motivo registrado'} />
                      <ReadRow label='Evolucion profesional' value={consultNote.subjective} />
                      <ReadRow label='Hallazgos objetivos' value={consultNote.objective || '-'} />
                      <ReadRow label='Impresion diagnostica' value={consultNote.assessment || '-'} />
                    </div>
                    <div className='space-y-2'>
                      <ReadRow label='Conducta / indicaciones' value={consultNote.plan} />
                      <ReadRow label='Derivacion' value={consultNote.referred ? `Si${consultNote.referralTo ? ` - ${consultNote.referralTo}` : ''}` : 'No'} />
                      <ReadRow label='Seguimiento sugerido' value={formatFollowUp(consultNote)} />
                      <ReadRow label='Resumen de seguimiento' value={consultNote.followUp || '-'} />
                    </div>
                  </div>

                  <ReadRow label='Notas internas' value={consultNote.internalNotes || '-'} />
                  <ReadRow label='Creado' value={formatDateTime(consultNote.createdAt)} />
                  <ReadRow label='Ultima actualizacion' value={formatDateTime(consultNote.updatedAt)} />
                </Card>
              ))}
              {records.length === 0
                ? <Card className='text-sm text-emerald-900/75'>Este paciente aun no tiene registros de consulta cargados.</Card>
                : null}
            </div>
          </>
          )
        : null}
    </div>
  )
}
