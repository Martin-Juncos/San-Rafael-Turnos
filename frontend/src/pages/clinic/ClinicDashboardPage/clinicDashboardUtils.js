export const toLocalIsoDate = (date = new Date()) => {
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return local.toISOString().slice(0, 10)
}

export const buildUpcomingDates = (days) => {
  const base = new Date()
  return Array.from({ length: days }, (_item, index) => {
    const next = new Date(base)
    next.setDate(base.getDate() + index)
    return toLocalIsoDate(next)
  })
}

export const parseTimeToMinutes = (value) => {
  const [hours, minutes] = String(value || '').split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN
  return (hours * 60) + minutes
}

export const formatMinutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export const normalizeTimeValue = (value) => {
  const [hours = '00', minutes = '00'] = String(value || '').split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}

export const normalizeDni = (value) => String(value || '').replace(/\D/g, '')

export const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  const a1 = parseTimeToMinutes(aStart)
  const a2 = parseTimeToMinutes(aEnd)
  const b1 = parseTimeToMinutes(bStart)
  const b2 = parseTimeToMinutes(bEnd)
  return a1 < b2 && b1 < a2
}

export const formatDateLabel = (value) => {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  })
}

