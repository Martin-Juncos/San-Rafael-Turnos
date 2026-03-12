import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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

export function PatientDashboardPage () {
  const [appointments, setAppointments] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
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

  const load = async () => {
    const result = await appointmentsService.listMy({ pageSize: 50 })
    setAppointments(result.items)
  }

  useEffect(() => {
    load().catch((apiError) => setError(apiError.message))
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
          if (latest && latest.senderRole !== 'patient') {
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

    if (latest && hasNewMessage && latest.senderRole !== 'patient') {
      const senderLabel = latest.senderRole === 'doctor' ? 'medico' : 'clinica'
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

  const describeAppointment = (item) => {
    if (!item) return 'seleccionado'
    return `${item.date} a las ${item.startTime.slice(0, 5)}`
  }

  const cancel = async (appointmentId) => {
    setError('')
    setMessage('')
    const selected = appointments.find((item) => item.id === appointmentId)
    try {
      await appointmentsService.cancel(appointmentId, 'cancelled_by_patient')
      await load()
      setMessage(`Tu turno ${describeAppointment(selected)} fue cancelado correctamente.`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const confirmPendingPayment = async (appointmentId) => {
    setError('')
    setMessage('')
    const selected = appointments.find((item) => item.id === appointmentId)
    try {
      await paymentsService.confirmMock(appointmentId)
      await load()
      setMessage(`Pago acreditado. Tu turno ${describeAppointment(selected)} quedo confirmado.`)
    } catch (apiError) {
      setError(apiError.message)
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
      <Card>
        <div className='grid gap-5 md:grid-cols-[1fr_auto] md:items-center'>
          <div className='space-y-2'>
            <h1 className='text-2xl font-semibold text-emerald-950 sm:text-3xl'>Panel Paciente</h1>
            <p className='text-sm text-emerald-900/80 sm:text-base'>
              Mis turnos, comprobantes, cancelaciones y chat con el medico.
            </p>
          </div>
          <div className='flex items-center justify-center md:justify-end'>
            <Link to='/reservar' className='w-full md:w-auto'>
              <Button className='w-full px-8 py-4 text-lg font-semibold sm:px-10 sm:py-5 sm:text-xl'>
                Solicitar nuevo turno
              </Button>
            </Link>
          </div>
        </div>
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
                <p className='font-semibold text-emerald-950'>
                  {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.doctor?.fullName}
                </p>
                <p className='text-xs text-emerald-900/75'>
                  Estado: {appointment.status} | Pago: {appointment.payment?.status}
                </p>
                {unreadAppointmentIds.includes(appointment.id)
                  ? <p className='text-xs font-semibold text-amber-800'>Nuevo mensaje</p>
                  : null}
                <div className='mt-2 flex flex-wrap gap-2'>
                  <Button
                    variant='secondary'
                    className='px-3 py-1.5 text-xs'
                    disabled={appointment.status !== 'confirmed'}
                    onClick={() => {
                      if (appointment.status !== 'confirmed') return
                      setSelectedAppointmentId(appointment.id)
                      markConversationRead(appointment.id)
                    }}
                  >
                    Ver chat
                  </Button>
                  <Button variant='danger' className='px-3 py-1.5 text-xs' onClick={() => cancel(appointment.id)}>
                    Cancelar
                  </Button>
                  {appointment.payment?.status === 'pending' && appointment.payment?.provider === 'mercadopago'
                    ? (
                      <Link to={`/reservar?appointmentId=${appointment.id}`} className='inline-flex'>
                        <Button className='px-3 py-1.5 text-xs'>
                          Continuar pago
                        </Button>
                      </Link>
                      )
                    : null}
                  {appointment.payment?.status === 'pending' && appointment.payment?.provider !== 'mercadopago'
                    ? (
                      <Button className='px-3 py-1.5 text-xs' onClick={() => confirmPendingPayment(appointment.id)}>
                        Pagar (mock)
                      </Button>
                      )
                    : null}
                </div>
              </div>
            ))}
            {appointments.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay turnos registrados.</p> : null}
          </div>
        </Card>

        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Mensajeria por turno</h2>
          <label className='block space-y-1'>
            <span className='text-xs text-emerald-900/75'>Turno</span>
            <select
              className='glass-input'
              value={selectedAppointmentId}
              onChange={(event) => {
                setSelectedAppointmentId(event.target.value)
                markConversationRead(event.target.value)
              }}
            >
              <option value=''>Seleccionar</option>
              {chatEligibleAppointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.doctor?.fullName}
                  {unreadAppointmentIds.includes(appointment.id) ? ' (Nuevo mensaje)' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className='max-h-56 space-y-1 overflow-auto rounded-xl border border-emerald-200 bg-white/70 p-3 text-xs'>
            {messages.map((item) => (
              <p key={item.id}>
                <span className='font-semibold'>{item.senderRole}:</span> {item.body}
              </p>
            ))}
            {messages.length === 0 ? <p className='text-emerald-900/70'>Sin mensajes.</p> : null}
          </div>
          <form className='space-y-2' onSubmit={sendMessage}>
            <Input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder='Escribe tu consulta...' />
            <Button type='submit'>Enviar mensaje</Button>
          </form>
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
