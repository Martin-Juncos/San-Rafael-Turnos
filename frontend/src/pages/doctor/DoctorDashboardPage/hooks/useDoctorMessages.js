import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { appointmentsService } from '../../../../api/services'
import {
  latestMessageKey,
  RATE_LIMIT_BACKOFF_MS,
  sameArray
} from '../doctorDashboardUtils'

export function useDoctorMessages ({
  appointments,
  selectedAppointmentId,
  selectedAppointment,
  chatDraft,
  setChatDraft,
  setError
}) {
  const [messages, setMessages] = useState([])
  const [incomingAlert, setIncomingAlert] = useState(null)
  const [unreadAppointmentIds, setUnreadAppointmentIds] = useState([])

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

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

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
  }, [selectedAppointmentId, selectedAppointment, markConversationRead, enterRateLimitBackoff, setError])

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
          if (latest && latest.senderRole === 'patient') {
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

    if (latest && hasNewMessage && latest.senderRole === 'patient') {
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

  return {
    messages,
    clearMessages,
    incomingAlert,
    setIncomingAlert,
    unreadAppointmentIds,
    markConversationRead,
    chatEligibleAppointments,
    sendMessage
  }
}
