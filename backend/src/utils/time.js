export const parseTimeToMinutes = (value) => {
  const [hours, minutes] = String(value).split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return NaN
  }
  return hours * 60 + minutes
}

export const formatMinutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export const addMinutesToTime = (time, delta) => {
  const asMinutes = parseTimeToMinutes(time)
  return formatMinutesToTime(asMinutes + delta)
}

export const isSameOrAfterNow = (date, time) => {
  const candidate = new Date(`${date}T${time}:00`)
  return candidate.getTime() >= Date.now()
}

export const buildSlotsForRange = (startTime, endTime, slotMinutes) => {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start || slotMinutes <= 0) {
    return []
  }

  const slots = []
  for (let cursor = start; cursor + slotMinutes <= end; cursor += slotMinutes) {
    slots.push({
      startTime: formatMinutesToTime(cursor),
      endTime: formatMinutesToTime(cursor + slotMinutes)
    })
  }
  return slots
}
