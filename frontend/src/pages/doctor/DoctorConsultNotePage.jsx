import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appointmentsService } from '../../api/services'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ActionResultModal } from '../../components/ui/ActionResultModal'

const FINAL_STATUS_OPTIONS = [
  { value: 'attended', label: 'Atendido' },
  { value: 'no_show', label: 'No-show (ausente)' },
  { value: 'requires_reschedule', label: 'Requiere reprogramacion' }
]

const APPOINTMENT_STATUS_LABELS = {
  requested: 'Solicitado',
  hold: 'Pendiente de pago',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  rescheduled: 'Reprogramado',
  attended: 'Atendido',
  no_show: 'Ausente'
}

const FOLLOW_UP_TYPE_OPTIONS = [
  { value: '', label: 'Sin definir' },
  { value: 'date', label: 'Fecha sugerida' },
  { value: 'as_needed', label: 'Cuando corresponda' }
]

const EMPTY_FORM = {
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  followUp: '',
  internalNotes: '',
  statusFinal: 'attended',
  referred: false,
  referralTo: '',
  nextSuggestedType: '',
  nextSuggestedDate: ''
}

const toInputTime = (value) => String(value || '').slice(0, 5)

const ReadOnlyItem = ({ label, value, className = '' }) => (
  <div className={className}>
    <p className='text-sm text-emerald-900/80 leading-relaxed'>
      <span className='font-medium'>{label}:</span>{' '}
      <span className='text-base font-semibold text-emerald-950 break-words whitespace-pre-wrap'>{value || '-'}</span>
    </p>
  </div>
)

const mapNoteToForm = (note, appointment) => {
  if (!note) {
    return {
      ...EMPTY_FORM,
      subjective: appointment?.symptoms || ''
    }
  }

  return {
    subjective: note.subjective || '',
    objective: note.objective || '',
    assessment: note.assessment || '',
    plan: note.plan || '',
    followUp: note.followUp || '',
    internalNotes: note.internalNotes || '',
    statusFinal: note.statusFinal || 'attended',
    referred: Boolean(note.referred),
    referralTo: note.referralTo || '',
    nextSuggestedType: note.nextSuggestedType || '',
    nextSuggestedDate: note.nextSuggestedDate || ''
  }
}

export function DoctorConsultNotePage () {
  const { appointmentId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [appointment, setAppointment] = useState(null)
  const [consultNote, setConsultNote] = useState(null)
  const [permissions, setPermissions] = useState({
    canCreate: false,
    canEdit: false,
    editWindowHours: 24
  })
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })

  const canSave = useMemo(() => {
    if (consultNote) {
      return permissions.canEdit
    }
    return permissions.canCreate
  }, [consultNote, permissions])

  const loadConsultData = useCallback(async () => {
    if (!appointmentId) return
    setLoading(true)
    setError('')
    try {
      const data = await appointmentsService.getConsultNote(appointmentId)
      setAppointment(data.appointment)
      setConsultNote(data.consultNote || null)
      setPermissions(data.permissions || { canCreate: false, canEdit: false, editWindowHours: 24 })
      setForm(mapNoteToForm(data.consultNote, data.appointment))
    } catch (apiError) {
      setError(apiError.message || 'No se pudo cargar el registro de consulta.')
    } finally {
      setLoading(false)
    }
  }, [appointmentId])

  useEffect(() => {
    loadConsultData().catch(() => {})
  }, [loadConsultData])

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
    setError('')
    setMessage('')
  }

  const handleFeedbackConfirm = () => {
    const shouldRedirectToDoctorDashboard = feedbackModal.type === 'success'
    closeFeedbackModal()
    if (shouldRedirectToDoctorDashboard) navigate('/dashboard/medico')
  }

  const handleSave = async () => {
    if (!appointmentId || !canSave) return
    setSaving(true)
    setError('')
    setMessage('')

    const payload = {
      subjective: form.subjective.trim(),
      objective: form.objective.trim() || null,
      assessment: form.assessment.trim() || null,
      plan: form.plan.trim(),
      followUp: form.followUp.trim() || null,
      internalNotes: form.internalNotes.trim() || null,
      statusFinal: form.statusFinal,
      referred: form.referred,
      referralTo: form.referred ? (form.referralTo.trim() || null) : null,
      nextSuggestedType: form.nextSuggestedType || null,
      nextSuggestedDate: form.nextSuggestedType === 'date' ? (form.nextSuggestedDate || null) : null
    }

    try {
      if (consultNote) {
        await appointmentsService.updateConsultNote(appointmentId, payload)
        setMessage('Registro de consulta actualizado correctamente.')
      } else {
        await appointmentsService.createConsultNote(appointmentId, payload)
        setMessage('Registro de consulta creado correctamente.')
      }
      await loadConsultData()
    } catch (apiError) {
      setError(apiError.message || 'No se pudo guardar el registro de consulta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card className='space-y-1'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Registro de consulta</h1>
        <p className='text-sm text-emerald-900/80'>
          Registro clinico breve por turno con trazabilidad de profesional, fecha y estado final.
        </p>
      </Card>

      {loading
        ? <Card className='p-4 text-sm text-emerald-900/75'>Cargando informacion del turno...</Card>
        : null}

      {!loading && appointment
        ? (
          <>
            <Card className='space-y-4'>
              <h2 className='text-lg font-semibold text-emerald-950'>Datos del turno (solo lectura)</h2>

              <div className='grid gap-3 sm:grid-cols-3'>
                <ReadOnlyItem label='Paciente' value={appointment.patient?.fullName || '-'} />
                <ReadOnlyItem label='DNI' value={appointment.patient?.dni || '-'} />
                <ReadOnlyItem label='Telefono' value={appointment.patient?.phone || '-'} />
              </div>

              <div className='grid gap-3 sm:grid-cols-4'>
                <ReadOnlyItem label='Fecha' value={appointment.date || '-'} />
                <ReadOnlyItem label='Hora' value={toInputTime(appointment.startTime) || '-'} />
                <ReadOnlyItem label='Especialidad' value={appointment.specialty?.name || '-'} />
                <ReadOnlyItem label='Medico' value={appointment.doctor?.fullName || '-'} />
              </div>
              <ReadOnlyItem
                label='Estado del turno'
                value={APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status || '-'}
              />

              <ReadOnlyItem
                label='Motivo / sintomas cargados por paciente'
                value={appointment.symptoms || 'Sin motivo registrado'}
                className='pt-1'
              />
            </Card>

            <Card className='space-y-4'>
              <h2 className='text-lg font-semibold text-emerald-950'>Registro clinico breve</h2>

              {consultNote && !canSave
                ? <p className='rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900'>Este registro solo se puede editar dentro de {permissions.editWindowHours} horas por el medico o con rol Clinica/Admin.</p>
                : null}

              <label className='block space-y-1'>
                <span className='text-xs font-medium text-emerald-900/80'>Evolucion / notas del profesional</span>
                <textarea
                  className='glass-input min-h-28 resize-y'
                  value={form.subjective}
                  onChange={(event) => setForm((prev) => ({ ...prev, subjective: event.target.value }))}
                  disabled={!canSave || saving}
                />
              </label>

              <label className='block space-y-1'>
                <span className='text-xs font-medium text-emerald-900/80'>Hallazgos objetivos (opcional)</span>
                <textarea
                  className='glass-input min-h-20 resize-y'
                  value={form.objective}
                  onChange={(event) => setForm((prev) => ({ ...prev, objective: event.target.value }))}
                  disabled={!canSave || saving}
                />
              </label>

              <Input
                label='Impresion diagnostica (opcional)'
                value={form.assessment}
                onChange={(event) => setForm((prev) => ({ ...prev, assessment: event.target.value }))}
                disabled={!canSave || saving}
              />

              <label className='block space-y-1'>
                <span className='text-xs font-medium text-emerald-900/80'>Conducta / indicaciones</span>
                <textarea
                  className='glass-input min-h-24 resize-y'
                  value={form.plan}
                  onChange={(event) => setForm((prev) => ({ ...prev, plan: event.target.value }))}
                  disabled={!canSave || saving}
                />
              </label>

              <div className='grid gap-3 sm:grid-cols-2'>
                <label className='block space-y-1'>
                  <span className='text-xs font-medium text-emerald-900/80'>Derivacion</span>
                  <select
                    className='glass-input'
                    value={form.referred ? 'yes' : 'no'}
                    onChange={(event) => setForm((prev) => ({ ...prev, referred: event.target.value === 'yes' }))}
                    disabled={!canSave || saving}
                  >
                    <option value='no'>No</option>
                    <option value='yes'>Si</option>
                  </select>
                </label>
                <Input
                  label='A donde deriva (opcional)'
                  value={form.referralTo}
                  onChange={(event) => setForm((prev) => ({ ...prev, referralTo: event.target.value }))}
                  disabled={!canSave || saving || !form.referred}
                />
              </div>

              <div className='grid gap-3 sm:grid-cols-3'>
                <label className='block space-y-1'>
                  <span className='text-xs font-medium text-emerald-900/80'>Control / proximo turno</span>
                  <select
                    className='glass-input'
                    value={form.nextSuggestedType}
                    onChange={(event) => setForm((prev) => ({ ...prev, nextSuggestedType: event.target.value }))}
                    disabled={!canSave || saving}
                  >
                    {FOLLOW_UP_TYPE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <Input
                  label='Fecha sugerida'
                  type='date'
                  value={form.nextSuggestedDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, nextSuggestedDate: event.target.value }))}
                  disabled={!canSave || saving || form.nextSuggestedType !== 'date'}
                />

                <label className='block space-y-1'>
                  <span className='text-xs font-medium text-emerald-900/80'>Estado final del turno</span>
                  <select
                    className='glass-input'
                    value={form.statusFinal}
                    onChange={(event) => setForm((prev) => ({ ...prev, statusFinal: event.target.value }))}
                    disabled={!canSave || saving}
                  >
                    {FINAL_STATUS_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className='block space-y-1'>
                <span className='text-xs font-medium text-emerald-900/80'>Notas internas (opcional)</span>
                <textarea
                  className='glass-input min-h-20 resize-y'
                  value={form.internalNotes}
                  onChange={(event) => setForm((prev) => ({ ...prev, internalNotes: event.target.value }))}
                  disabled={!canSave || saving}
                />
              </label>

              <label className='block space-y-1'>
                <span className='text-xs font-medium text-emerald-900/80'>Resumen de control / seguimiento (opcional)</span>
                <textarea
                  className='glass-input min-h-20 resize-y'
                  value={form.followUp}
                  onChange={(event) => setForm((prev) => ({ ...prev, followUp: event.target.value }))}
                  disabled={!canSave || saving}
                />
              </label>

              <div className='flex flex-wrap gap-2'>
                <Button onClick={handleSave} disabled={!canSave || saving}>
                  {saving ? 'Guardando...' : 'Guardar y marcar "Atendido"'}
                </Button>
                <Button variant='secondary' onClick={() => navigate('/dashboard/medico')}>
                  Cancelar
                </Button>
              </div>
            </Card>
          </>
          )
        : null}

      <ActionResultModal
        open={feedbackModal.open}
        type={feedbackModal.type}
        title={feedbackModal.title}
        description={feedbackModal.description}
        onClose={closeFeedbackModal}
        onConfirm={handleFeedbackConfirm}
      />
    </div>
  )
}
