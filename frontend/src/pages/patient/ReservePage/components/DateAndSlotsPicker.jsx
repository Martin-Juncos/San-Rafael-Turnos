import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'

export function DateAndSlotsPicker ({
  doctorId,
  availableDates,
  loadingDates,
  date,
  today,
  loadingSlots,
  slots,
  startTime,
  onSelectAvailableDate,
  onDateChange,
  onSearchSlots,
  onSelectSlot,
  formatDateLabel
}) {
  return (
    <>
      {doctorId && (
        <div className='space-y-2 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
          <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
            Proximos dias con turnos disponibles
          </p>
          {loadingDates
            ? <p className='text-xs text-emerald-900/70'>Buscando disponibilidad...</p>
            : (
                <div className='flex flex-wrap gap-2'>
                  {availableDates.length === 0
                    ? (
                      <span className='text-xs text-emerald-900/70'>
                        Este profesional no tiene agenda publicada en los proximos 21 dias. Solicita a la clinica cargar disponibilidad.
                      </span>
                      )
                    : availableDates.map((item) => (
                        <button
                          key={item.date}
                          type='button'
                          onClick={() => onSelectAvailableDate(item.date)}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            date === item.date
                              ? 'border-brand-500 bg-brand-100 text-brand-800'
                              : 'border-emerald-200 bg-white/70 text-emerald-900/75 hover:bg-emerald-100'
                          }`}
                        >
                          {formatDateLabel(item.date)} ({item.count})
                        </button>
                      ))}
                </div>
              )}
        </div>
      )}

      <div className='grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end'>
        <Input
          type='date'
          label='Fecha'
          min={today}
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
        />
        <Button onClick={onSearchSlots} disabled={loadingSlots || !doctorId}>
          {loadingSlots ? 'Buscando...' : 'Actualizar horarios'}
        </Button>
      </div>

      <div className='flex flex-wrap gap-2'>
        {slots.length === 0
          ? (
            <span className='text-xs text-emerald-900/70'>
              {!doctorId
                ? 'Selecciona un profesional para ver horarios.'
                : 'No hay horarios disponibles para la fecha seleccionada.'}
            </span>
            )
          : slots.map((slot) => (
              <button
                key={slot.startTime}
                type='button'
                onClick={() => onSelectSlot(slot.startTime)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  startTime === slot.startTime
                    ? 'border-brand-500 bg-brand-100 text-brand-800'
                    : 'border-emerald-200 bg-white/70 text-emerald-900/75 hover:bg-emerald-100'
                }`}
              >
                {slot.startTime.slice(0, 5)}
              </button>
            ))}
      </div>
    </>
  )
}
