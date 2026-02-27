import { appointmentsService } from '../../api/services'

export const APPOINTMENT_STATUS_LABELS = {
  requested: 'Solicitado',
  hold: 'Pendiente de pago',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  rescheduled: 'Reprogramado',
  attended: 'Atendido',
  no_show: 'Ausente'
}

export const CONSULT_NOTE_STATUS_LABELS = {
  attended: 'Atendido',
  no_show: 'Ausente',
  requires_reschedule: 'Requiere reprogramacion'
}

const FOLLOW_UP_TYPE_LABELS = {
  date: 'Fecha sugerida',
  as_needed: 'Cuando corresponda'
}

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

const parseDateOnly = (value) => {
  if (!value) return null
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const parseAppointmentDateTime = (appointment) => {
  if (!appointment?.date) return null
  const safeTime = String(appointment.startTime || '00:00').slice(0, 5)
  const parsed = new Date(`${appointment.date}T${safeTime}:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export const sortByAppointmentDesc = (left, right) => {
  const leftDate = parseAppointmentDateTime(left)
  const rightDate = parseAppointmentDateTime(right)
  const leftValue = leftDate ? leftDate.getTime() : 0
  const rightValue = rightDate ? rightDate.getTime() : 0
  return rightValue - leftValue
}

export const formatDate = (value) => {
  const parsed = parseDateOnly(value)
  return parsed ? dateFormatter.format(parsed) : (value || '-')
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return dateTimeFormatter.format(parsed)
}

export const formatAppointmentDateTime = (appointment) => {
  const parsed = parseAppointmentDateTime(appointment)
  if (!parsed) {
    const dateText = appointment?.date || '-'
    const timeText = String(appointment?.startTime || '-').slice(0, 5)
    return `${dateText} ${timeText}`.trim()
  }
  return dateTimeFormatter.format(parsed)
}

export const formatConsultNoteStatus = (statusFinal) => {
  return CONSULT_NOTE_STATUS_LABELS[statusFinal] || statusFinal || '-'
}

export const formatFollowUp = (note) => {
  if (!note) return '-'
  if (note.nextSuggestedType === 'date' && note.nextSuggestedDate) {
    return `${FOLLOW_UP_TYPE_LABELS.date}: ${formatDate(note.nextSuggestedDate)}`
  }
  if (note.nextSuggestedType === 'as_needed') {
    return FOLLOW_UP_TYPE_LABELS.as_needed
  }
  return 'Sin seguimiento sugerido'
}

const fetchAllDoctorAppointments = async () => {
  const pageSize = 100
  let page = 1
  let totalPages = 1
  const allItems = []

  while (page <= totalPages && page <= 25) {
    const result = await appointmentsService.list({ page, pageSize })
    allItems.push(...(result.items || []))
    totalPages = Number(result.pagination?.totalPages || 1)
    page += 1
  }

  return allItems
}

export const loadDoctorConsultRecords = async () => {
  const appointments = await fetchAllDoctorAppointments()
  const records = []
  const batchSize = 10

  for (let index = 0; index < appointments.length; index += batchSize) {
    const batch = appointments.slice(index, index + batchSize)
    const batchRecords = await Promise.all(
      batch.map(async (appointment) => {
        try {
          const response = await appointmentsService.getConsultNote(appointment.id)
          if (!response?.consultNote) return null
          return {
            appointment: response.appointment || appointment,
            consultNote: response.consultNote
          }
        } catch (_apiError) {
          return null
        }
      })
    )
    records.push(...batchRecords.filter(Boolean))
  }

  return records.sort((left, right) => sortByAppointmentDesc(left.appointment, right.appointment))
}
