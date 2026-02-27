import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentsService, doctorsService, paymentsService } from '../../api/services'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ActionResultModal } from '../../components/ui/ActionResultModal'
import { useAppSelector } from '../../app/hooks'
import { selectAuth } from '../../features/auth/authSlice'

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

const APPOINTMENT_STATUS_LABELS = {
  requested: 'Solicitado',
  hold: 'Pendiente de pago',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  rescheduled: 'Reprogramado',
  attended: 'Atendido',
  no_show: 'Ausente'
}

const PAYMENT_STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  refunded: 'Reintegrado'
}

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
  const navigate = useNavigate()
  const auth = useAppSelector(selectAuth)
  const [appointments, setAppointments] = useState([])
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [selectedPrintDate, setSelectedPrintDate] = useState('')
  const [doctorSpecialtyId, setDoctorSpecialtyId] = useState('')
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

  const printableDates = useMemo(() => {
    const values = appointments
      .map((item) => item.date)
      .filter(Boolean)
    return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
  }, [appointments])

  useEffect(() => {
    setManagementForm(buildManagementForm(selectedAppointment))
  }, [selectedAppointment])

  useEffect(() => {
    setSelectedPrintDate((previous) => {
      if (previous && printableDates.includes(previous)) {
        return previous
      }
      return printableDates[0] || ''
    })
  }, [printableDates])

  useEffect(() => {
    if (auth.role !== 'doctor' || !auth.user?.doctorId) {
      setDoctorSpecialtyId('')
      return
    }

    let isCancelled = false

    const loadDoctorProfile = async () => {
      try {
        const doctor = await doctorsService.getById(auth.user.doctorId)
        if (isCancelled) return
        setDoctorSpecialtyId(doctor.specialtyId || '')
      } catch (_apiError) {
        if (!isCancelled) setDoctorSpecialtyId('')
      }
    }

    loadDoctorProfile().catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [auth.role, auth.user?.doctorId])

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
    if (selectedAppointmentId && !appointments.some((item) => item.id === selectedAppointmentId)) {
      setSelectedAppointmentId('')
      setMessages([])
    }
  }, [appointments, selectedAppointmentId])

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
    const currentAppointment = appointments.find((item) => item.id === appointmentId)
    const label = APPOINTMENT_STATUS_LABELS[status] || status

    if (currentAppointment?.status === status) {
      setMessage(`El turno ya esta marcado como "${label}".`)
      return
    }

    try {
      await appointmentsService.update(appointmentId, { status })
      await loadAppointments()
      setMessage(`El turno fue actualizado a estado "${label}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const markPaymentAsPaid = async (appointmentId) => {
    setError('')
    setMessage('')
    const currentAppointment = appointments.find((item) => item.id === appointmentId)
    const currentStatus = currentAppointment?.payment?.status || 'pending'

    if (currentStatus === 'paid') {
      setMessage('El pago de este turno ya esta marcado como "Pagado".')
      return
    }

    try {
      await paymentsService.updateStatus(appointmentId, 'paid')
      await loadAppointments()
      setMessage('El pago del turno fue actualizado a "Pagado".')
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

  const openPrintDayView = () => {
    if (!selectedPrintDate) return
    const url = `/dashboard/medico/imprimir?date=${encodeURIComponent(selectedPrintDate)}`
    navigate(url)
  }

  const openReserveWithPrefill = () => {
    const doctorId = auth.user?.doctorId
    if (!doctorId) return

    const params = new URLSearchParams()
    params.set('doctorId', doctorId)
    if (doctorSpecialtyId) {
      params.set('specialtyId', doctorSpecialtyId)
    }

    navigate(`/reservar?${params.toString()}`)
  }

  const openConsultRecord = (appointment) => {
    if (!appointment?.id) return

    if (appointment.status === 'cancelled') {
      const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status
      setError(`No se puede abrir el registro de consulta porque el turno esta en estado "${statusLabel}".`)
      return
    }

    navigate(`/dashboard/medico/consulta/${appointment.id}`)
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
        <div className='grid gap-4 md:grid-cols-[1fr_auto] md:items-center'>
          <div className='space-y-1'>
            <h1 className='text-2xl font-semibold text-emerald-950'>Panel Medico</h1>
            <p className='text-sm text-emerald-900/80'>
              Agenda diaria/semanal, estado de atencion y mensajeria por turno confirmado.
            </p>
          </div>
          <div className='flex justify-start md:justify-end'>
            <Button
              onClick={openReserveWithPrefill}
              disabled={!auth.user?.doctorId}
              className='px-6 py-3 text-base'
            >
              Cargar turno para este medico
            </Button>
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
          <div className='flex flex-wrap items-end justify-between gap-3 rounded-xl border border-emerald-200 bg-white/70 p-3'>
            <label className='space-y-1 text-sm'>
              <span className='text-xs text-emerald-900/75'>Fecha para imprimir</span>
              <select
                className='glass-input min-w-[220px]'
                value={selectedPrintDate}
                onChange={(event) => setSelectedPrintDate(event.target.value)}
              >
                {printableDates.length === 0
                  ? <option value=''>Sin fechas con turnos</option>
                  : printableDates.map((date) => (
                      <option key={date} value={date}>{date}</option>
                    ))}
              </select>
            </label>
            <Button
              variant='secondary'
              onClick={openPrintDayView}
              disabled={!selectedPrintDate}
            >
              Imprimir pacientes del dia
            </Button>
          </div>
          <div className='space-y-2'>
            {appointments.map((appointment) => (
              <div key={appointment.id} className='rounded-xl bg-white/70 p-3 text-sm'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <p className='font-semibold text-emerald-950'>
                      {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                    </p>
                    <p className='text-xs text-emerald-900/75'>
                      Estado: {APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status}
                      {' '}|{' '}
                      Pago: {PAYMENT_STATUS_LABELS[appointment.payment?.status] || appointment.payment?.status || 'Pendiente'}
                    </p>
                    {unreadAppointmentIds.includes(appointment.id)
                      ? <p className='text-xs font-semibold text-amber-800'>Nuevo mensaje</p>
                      : null}
                  </div>
                  <div className='flex flex-wrap justify-end gap-1.5'>
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
                    <button
                      type='button'
                      className='rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs'
                      onClick={() => openConsultRecord(appointment)}
                    >
                      Registro de consulta
                    </button>
                  </div>
                </div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  <Button
                    variant='secondary'
                    className={`px-3 py-1.5 text-xs ${
                      appointment.status === 'attended'
                        ? '!border-brand-700 !bg-brand-700 !text-white hover:!bg-brand-800'
                        : '!border-emerald-200 !bg-emerald-100 !text-emerald-900 hover:!bg-emerald-200'
                    }`}
                    onClick={() => updateStatus(appointment.id, 'attended')}
                    aria-pressed={appointment.status === 'attended'}
                  >
                    Atendido
                  </Button>
                  <Button
                    variant='secondary'
                    className={`px-3 py-1.5 text-xs ${
                      appointment.status === 'no_show'
                        ? '!border-brand-700 !bg-brand-700 !text-white hover:!bg-brand-800'
                        : '!border-emerald-200 !bg-emerald-100 !text-emerald-900 hover:!bg-emerald-200'
                    }`}
                    onClick={() => updateStatus(appointment.id, 'no_show')}
                    aria-pressed={appointment.status === 'no_show'}
                  >
                    Ausente
                  </Button>
                  <Button
                    variant='secondary'
                    className={`px-3 py-1.5 text-xs ${
                      appointment.payment?.status === 'paid'
                        ? '!border-brand-700 !bg-brand-700 !text-white hover:!bg-brand-800'
                        : '!border-emerald-200 !bg-emerald-100 !text-emerald-900 hover:!bg-emerald-200'
                    }`}
                    onClick={() => markPaymentAsPaid(appointment.id)}
                    aria-pressed={appointment.payment?.status === 'paid'}
                  >
                    {appointment.payment?.status === 'paid' ? 'Pagado' : 'Pagar'}
                  </Button>
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
