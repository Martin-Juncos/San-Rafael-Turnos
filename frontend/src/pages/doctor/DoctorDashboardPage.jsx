import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { appointmentsService, paymentsService } from '../../api/services'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ActionResultModal } from '../../components/ui/ActionResultModal'

const sameArray = (left, right) => {
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

const latestMessageKey = (list = []) => {
  const latest = list[list.length - 1]
  return latest ? `${latest.id}:${latest.createdAt}` : ''
}

const RATE_LIMIT_BACKOFF_MS = 30000

const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'requested', label: 'Solicitado' },
  { value: 'hold', label: 'Pendiente de pago' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'rescheduled', label: 'Reprogramado' },
  { value: 'attended', label: 'Atendido' },
  { value: 'no_show', label: 'Ausente' }
]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'failed', label: 'Fallido' },
  { value: 'refunded', label: 'Reintegrado' }
]

const EMPTY_MANAGEMENT_FORM = {
  date: '',
  startTime: '',
  status: '',
  paymentStatus: '',
  doctorNotes: ''
}

const buildManagementForm = (appointment) => {
  if (!appointment) return EMPTY_MANAGEMENT_FORM
  return {
    date: appointment.date || '',
    startTime: (appointment.startTime || '').slice(0, 5),
    status: appointment.status || '',
    paymentStatus: appointment.payment?.status || 'pending',
    doctorNotes: appointment.doctorNotes || ''
  }
}

export function DoctorDashboardPage () {
  const [appointments, setAppointments] = useState([])
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [messages, setMessages] = useState([])
  const [managementForm, setManagementForm] = useState(EMPTY_MANAGEMENT_FORM)
  const [savingManagement, setSavingManagement] = useState(false)
  const [chatDraft, setChatDraft] = useState('')
  const [incomingAlert, setIncomingAlert] = useState(null)
  const [unreadAppointmentIds, setUnreadAppointmentIds] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })
  const messageSnapshotRef = useRef(new Map())
  const unreadSnapshotRef = useRef([])
  const pollCursorRef = useRef(0)
  const sessionStartedAtRef = useRef(Date.now())
  const rateLimitUntilRef = useRef(0)

  const chatEligibleAppointments = useMemo(
    () => appointments.filter((item) => item.status === 'confirmed'),
    [appointments]
  )

  const monitoredAppointments = useMemo(
    () => chatEligibleAppointments.slice(0, 10),
    [chatEligibleAppointments]
  )

  const selectedAppointment = useMemo(
    () => appointments.find((item) => item.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  )

  useEffect(() => {
    setManagementForm(buildManagementForm(selectedAppointment))
  }, [selectedAppointment])

  const markConversationRead = useCallback((appointmentId) => {
    setUnreadAppointmentIds((prev) => {
      const next = prev.filter((item) => item !== appointmentId)
      unreadSnapshotRef.current = next
      return next
    })
  }, [])

  const enterRateLimitBackoff = useCallback((apiError) => {
    if (apiError?.status !== 429) {
      return false
    }
    rateLimitUntilRef.current = Math.max(rateLimitUntilRef.current, Date.now() + RATE_LIMIT_BACKOFF_MS)
    return true
  }, [])

  const loadAppointments = async () => {
    const data = await appointmentsService.list({ pageSize: 50 })
    setAppointments(data.items)
  }

  useEffect(() => {
    loadAppointments().catch((apiError) => setError(apiError.message))
  }, [])

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

  useEffect(() => {
    if (selectedAppointmentId && !chatEligibleAppointments.some((item) => item.id === selectedAppointmentId)) {
      setSelectedAppointmentId('')
      setMessages([])
    }
  }, [chatEligibleAppointments, selectedAppointmentId])

  useEffect(() => {
    if (!selectedAppointmentId) {
      setMessages([])
      return
    }
    if (!selectedAppointment || selectedAppointment.status !== 'confirmed') {
      setMessages([])
      return
    }
    markConversationRead(selectedAppointmentId)
    appointmentsService.listMessages(selectedAppointmentId)
      .then((result) => setMessages(result))
      .catch((apiError) => {
        if (enterRateLimitBackoff(apiError)) return
        setError(apiError.message)
      })
  }, [selectedAppointmentId, selectedAppointment, markConversationRead, enterRateLimitBackoff])

  useEffect(() => {
    if (!selectedAppointmentId || !selectedAppointment || selectedAppointment.status !== 'confirmed') {
      return
    }

    let isCancelled = false

    const syncSelectedConversation = async () => {
      if (Date.now() < rateLimitUntilRef.current) {
        return
      }

      try {
        const result = await appointmentsService.listMessages(selectedAppointmentId)
        if (isCancelled) return

        const nextKey = latestMessageKey(result)
        const previousKey = messageSnapshotRef.current.get(selectedAppointmentId)
        messageSnapshotRef.current.set(selectedAppointmentId, nextKey)

        if (previousKey !== undefined && nextKey !== previousKey) {
          const latest = result[result.length - 1]
          if (latest && latest.senderRole !== 'doctor') {
            markConversationRead(selectedAppointmentId)
          }
        }

        setMessages((prev) => {
          const prevKey = latestMessageKey(prev)
          if (prev.length === result.length && prevKey === nextKey) {
            return prev
          }
          return result
        })
      } catch (apiError) {
        enterRateLimitBackoff(apiError)
        // Best effort: avoid breaking chat UI if transient request fails.
      }
    }

    syncSelectedConversation().catch(() => {})
    const intervalId = window.setInterval(() => {
      syncSelectedConversation().catch(() => {})
    }, 5000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [selectedAppointmentId, selectedAppointment, markConversationRead, enterRateLimitBackoff])

  const primeMessageSnapshots = useCallback(async () => {
    if (monitoredAppointments.length === 0) {
      messageSnapshotRef.current = new Map()
      pollCursorRef.current = 0
      return
    }

    const latestByAppointment = await Promise.all(
      monitoredAppointments.map(async (appointment) => {
        try {
          const list = await appointmentsService.listMessages(appointment.id)
          const latest = list[list.length - 1] || null
          return {
            appointmentId: appointment.id,
            latestKey: latest ? `${latest.id}:${latest.createdAt}` : ''
          }
        } catch (apiError) {
          enterRateLimitBackoff(apiError)
          return {
            appointmentId: appointment.id,
            latestKey: undefined
          }
        }
      })
    )

    const nextSnapshot = new Map()
    latestByAppointment.forEach(({ appointmentId, latestKey }) => {
      if (latestKey === undefined) return
      nextSnapshot.set(appointmentId, latestKey)
    })
    messageSnapshotRef.current = nextSnapshot
    pollCursorRef.current = 0
  }, [monitoredAppointments, enterRateLimitBackoff])

  useEffect(() => {
    primeMessageSnapshots().catch(() => {})
  }, [primeMessageSnapshots])

  const checkIncomingMessages = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return
    }
    if (Date.now() < rateLimitUntilRef.current) {
      return
    }

    if (monitoredAppointments.length === 0) {
      messageSnapshotRef.current = new Map()
      if (unreadSnapshotRef.current.length > 0) {
        unreadSnapshotRef.current = []
        setUnreadAppointmentIds([])
      }
      return
    }

    const pool = selectedAppointmentId
      ? monitoredAppointments.filter((item) => item.id !== selectedAppointmentId)
      : monitoredAppointments

    if (pool.length === 0) {
      return
    }

    const appointment = pool[pollCursorRef.current % pool.length]
    pollCursorRef.current += 1

    let latest = null
    try {
      const list = await appointmentsService.listMessages(appointment.id)
      latest = list[list.length - 1] || null
    } catch (apiError) {
      enterRateLimitBackoff(apiError)
      return
    }

    const nextSnapshot = new Map(messageSnapshotRef.current)
    const nextUnread = new Set(unreadSnapshotRef.current)
    let nextAlert = null

    const latestKey = latest ? `${latest.id}:${latest.createdAt}` : ''
    const previousKey = messageSnapshotRef.current.get(appointment.id)
    nextSnapshot.set(appointment.id, latestKey)
    const latestCreatedAtMs = latest ? Date.parse(latest.createdAt) : NaN
    const isFreshForSession = Number.isFinite(latestCreatedAtMs) && latestCreatedAtMs > sessionStartedAtRef.current
    const hasNewMessage = previousKey !== undefined ? latestKey !== previousKey : isFreshForSession

    if (latest && hasNewMessage && latest.senderRole !== 'doctor') {
      const senderLabel = latest.senderRole === 'patient' ? 'paciente' : 'clinica'
      nextUnread.add(appointment.id)
      nextAlert = {
        appointmentId: appointment.id,
        title: 'Nuevo mensaje recibido',
        description: `Recibiste un mensaje de ${senderLabel} para el turno del ${appointment.date} a las ${appointment.startTime.slice(0, 5)}.`
      }
    }

    messageSnapshotRef.current = nextSnapshot
    const nextUnreadIds = Array.from(nextUnread).sort()
    if (!sameArray(unreadSnapshotRef.current, nextUnreadIds)) {
      unreadSnapshotRef.current = nextUnreadIds
      setUnreadAppointmentIds(nextUnreadIds)
    }
    if (nextAlert) {
      setIncomingAlert(nextAlert)
    }
  }, [monitoredAppointments, selectedAppointmentId, enterRateLimitBackoff])

  useEffect(() => {
    checkIncomingMessages().catch(() => {})
    const intervalId = window.setInterval(() => {
      checkIncomingMessages().catch(() => {})
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [checkIncomingMessages])

  const updateStatus = async (appointmentId, status) => {
    setError('')
    setMessage('')
    try {
      await appointmentsService.update(appointmentId, { status })
      await loadAppointments()
      const labels = {
        attended: 'atendido',
        no_show: 'ausente',
        cancelled: 'cancelado'
      }
      setMessage(`El turno fue actualizado a estado "${labels[status] || status}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const saveManagement = async () => {
    if (!selectedAppointmentId || !selectedAppointment) return
    setError('')
    setMessage('')
    setSavingManagement(true)

    const appointmentPatch = {}
    const originalStartTime = (selectedAppointment.startTime || '').slice(0, 5)

    if (managementForm.date && managementForm.date !== selectedAppointment.date) {
      appointmentPatch.date = managementForm.date
    }
    if (managementForm.startTime && managementForm.startTime !== originalStartTime) {
      appointmentPatch.startTime = managementForm.startTime
    }
    if (managementForm.status && managementForm.status !== selectedAppointment.status) {
      appointmentPatch.status = managementForm.status
    }
    if (managementForm.doctorNotes !== (selectedAppointment.doctorNotes || '')) {
      appointmentPatch.doctorNotes = managementForm.doctorNotes
    }

    const currentPaymentStatus = selectedAppointment.payment?.status || 'pending'
    const paymentStatusChanged =
      managementForm.paymentStatus &&
      managementForm.paymentStatus !== currentPaymentStatus

    if (Object.keys(appointmentPatch).length === 0 && !paymentStatusChanged) {
      setMessage('No hay cambios para guardar en este turno.')
      setSavingManagement(false)
      return
    }

    try {
      if (Object.keys(appointmentPatch).length > 0) {
        await appointmentsService.update(selectedAppointmentId, appointmentPatch)
      }
      if (paymentStatusChanged) {
        await paymentsService.updateStatus(selectedAppointmentId, managementForm.paymentStatus)
      }

      await loadAppointments()
      setMessage('Los cambios del turno se guardaron correctamente.')
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSavingManagement(false)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!selectedAppointmentId || !chatDraft.trim()) return
    try {
      const created = await appointmentsService.sendMessage(selectedAppointmentId, chatDraft)
      setMessages((prev) => [...prev, created])
      setChatDraft('')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  return (
    <div className='space-y-6'>
      <Card className='space-y-1'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Panel Medico</h1>
        <p className='text-sm text-emerald-900/80'>Agenda diaria/semanal, estado de atencion y mensajeria por turno confirmado.</p>
      </Card>

      {incomingAlert
        ? (
          <Card className='space-y-2 border-amber-300/70 bg-amber-50/70'>
            <p className='text-sm font-semibold text-amber-900'>{incomingAlert.title}</p>
            <p className='text-sm text-amber-900/85'>{incomingAlert.description}</p>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='secondary'
                className='px-3 py-1.5 text-xs'
                onClick={() => {
                  setSelectedAppointmentId(incomingAlert.appointmentId)
                  markConversationRead(incomingAlert.appointmentId)
                  setIncomingAlert(null)
                }}
              >
                Abrir chat
              </Button>
              <Button className='px-3 py-1.5 text-xs' onClick={() => setIncomingAlert(null)}>
                Cerrar alerta
              </Button>
            </div>
          </Card>
          )
        : null}

      <div className='grid gap-6 xl:grid-cols-[1.2fr_1fr]'>
        <Card className='space-y-3'>
          <h2 className='text-lg font-semibold text-emerald-950'>Mis turnos</h2>
          <div className='space-y-2'>
            {appointments.map((appointment) => (
              <div key={appointment.id} className='rounded-xl bg-white/70 p-3 text-sm'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <p className='font-semibold text-emerald-950'>
                      {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                    </p>
                    <p className='text-xs text-emerald-900/75'>
                      Estado: {appointment.status} | Pago: {appointment.payment?.status || 'pending'}
                    </p>
                    {unreadAppointmentIds.includes(appointment.id)
                      ? <p className='text-xs font-semibold text-amber-800'>Nuevo mensaje</p>
                      : null}
                  </div>
                  <button
                    type='button'
                    className='rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs'
                    onClick={() => {
                      setSelectedAppointmentId(appointment.id)
                      markConversationRead(appointment.id)
                    }}
                  >
                    Gestionar
                  </button>
                </div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  <Button className='px-3 py-1.5 text-xs' onClick={() => updateStatus(appointment.id, 'attended')}>Atendido</Button>
                  <Button variant='secondary' className='px-3 py-1.5 text-xs' onClick={() => updateStatus(appointment.id, 'no_show')}>Ausente</Button>
                </div>
              </div>
            ))}
            {appointments.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay turnos asignados.</p> : null}
          </div>
        </Card>

        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Gestion del turno</h2>
          <label className='space-y-1 block'>
            <span className='text-xs text-emerald-900/75'>Turno seleccionado</span>
            <select
              className='glass-input'
              value={selectedAppointmentId}
              onChange={(event) => {
                const nextId = event.target.value
                setSelectedAppointmentId(nextId)
                markConversationRead(nextId)
              }}
            >
              <option value=''>Seleccionar</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                  {unreadAppointmentIds.includes(appointment.id) ? ' (Nuevo mensaje)' : ''}
                </option>
              ))}
            </select>
          </label>

          {selectedAppointment
            ? (
              <div className='space-y-3 rounded-xl border border-emerald-200 bg-white/70 p-3'>
                <div className='grid gap-3 sm:grid-cols-2'>
                  <Input
                    label='Fecha'
                    type='date'
                    value={managementForm.date}
                    onChange={(event) => setManagementForm((prev) => ({ ...prev, date: event.target.value }))}
                  />
                  <Input
                    label='Hora'
                    type='time'
                    value={managementForm.startTime}
                    onChange={(event) => setManagementForm((prev) => ({ ...prev, startTime: event.target.value }))}
                  />
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <label className='space-y-1 block'>
                    <span className='text-xs text-emerald-900/75'>Estado del turno</span>
                    <select
                      className='glass-input'
                      value={managementForm.status}
                      onChange={(event) => setManagementForm((prev) => ({ ...prev, status: event.target.value }))}
                    >
                      {APPOINTMENT_STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className='space-y-1 block'>
                    <span className='text-xs text-emerald-900/75'>Estado del pago</span>
                    <select
                      className='glass-input'
                      value={managementForm.paymentStatus}
                      onChange={(event) => setManagementForm((prev) => ({ ...prev, paymentStatus: event.target.value }))}
                    >
                      {PAYMENT_STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <Input
                  label='Nota interna'
                  value={managementForm.doctorNotes}
                  onChange={(event) => setManagementForm((prev) => ({ ...prev, doctorNotes: event.target.value }))}
                />

                <Button onClick={saveManagement} disabled={savingManagement}>
                  {savingManagement ? 'Guardando cambios...' : 'Guardar gestion'}
                </Button>
              </div>
              )
            : (
              <p className='text-sm text-emerald-900/75'>
                Selecciona un turno para editar fecha, hora, estado, pago y nota interna.
              </p>
              )}

          <div className='space-y-2 rounded-xl border border-emerald-200 bg-white/70 p-3'>
            <h3 className='text-sm font-semibold text-emerald-950'>Mensajeria del turno</h3>
            <div className='max-h-56 space-y-1 overflow-auto text-xs'>
              {messages.map((item) => (
                <p key={item.id}>
                  <span className='font-semibold'>{item.senderRole}:</span> {item.body}
                </p>
              ))}
              {messages.length === 0 ? <p className='text-emerald-900/70'>Sin mensajes.</p> : null}
            </div>
            <form className='space-y-2' onSubmit={sendMessage}>
              <Input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder='Escribe un mensaje...' />
              <Button type='submit'>Enviar</Button>
            </form>
          </div>
        </Card>
      </div>

      <ActionResultModal
        open={feedbackModal.open}
        type={feedbackModal.type}
        title={feedbackModal.title}
        description={feedbackModal.description}
        onClose={closeFeedbackModal}
      />
    </div>
  )
}
