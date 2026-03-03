export const dayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

export const parseTimeToMinutes = (value) => {
  const [hours = '0', minutes = '0'] = String(value).split(':')
  return Number(hours) * 60 + Number(minutes)
}

export const formatMinutesToTime = (totalMinutes) => {
  const safeMinutes = Math.max(0, totalMinutes)
  const hours = String(Math.floor(safeMinutes / 60)).padStart(2, '0')
  const minutes = String(safeMinutes % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}

export const buildAvailabilitySlots = ({ dayOfWeek, startTime, endTime, slotMinutes, isActive = true }) => {
  const step = Number(slotMinutes)
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (!Number.isFinite(step) || step <= 0 || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return []
  }

  const rows = []
  for (let cursor = start; cursor + step <= end; cursor += step) {
    rows.push({
      dayOfWeek: Number(dayOfWeek),
      startTime: formatMinutesToTime(cursor),
      endTime: formatMinutesToTime(cursor + step),
      slotMinutes: step,
      isActive
    })
  }
  return rows
}

