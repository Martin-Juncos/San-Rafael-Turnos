export const RATE_LIMIT_BACKOFF_MS = 30000

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'requested', label: 'Solicitado' },
  { value: 'hold', label: 'Pendiente de pago' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'rescheduled', label: 'Reprogramado' },
  { value: 'attended', label: 'Atendido' },
  { value: 'no_show', label: 'Ausente' }
]

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'failed', label: 'Fallido' },
  { value: 'refunded', label: 'Reintegrado' }
]

export const APPOINTMENT_STATUS_LABELS = {
  requested: 'Solicitado',
  hold: 'Pendiente de pago',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  rescheduled: 'Reprogramado',
  attended: 'Atendido',
  no_show: 'Ausente'
}

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  refunded: 'Reintegrado'
}

export const EMPTY_MANAGEMENT_FORM = {
  date: '',
  startTime: '',
  status: '',
  paymentStatus: '',
  doctorNotes: ''
}

export const sameArray = (left, right) => {
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

export const latestMessageKey = (list = []) => {
  const latest = list[list.length - 1]
  return latest ? `${latest.id}:${latest.createdAt}` : ''
}

export const buildManagementForm = (appointment) => {
  if (!appointment) return EMPTY_MANAGEMENT_FORM
  return {
    date: appointment.date || '',
    startTime: (appointment.startTime || '').slice(0, 5),
    status: appointment.status || '',
    paymentStatus: appointment.payment?.status || 'pending',
    doctorNotes: appointment.doctorNotes || ''
  }
}
