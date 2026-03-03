import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Input } from '../../../../components/ui/Input'
import { dayLabels } from '../adminDashboardUtils'

export function AdminAvailabilitySection ({
  doctors,
  availabilityDoctorId,
  handleLoadAvailability,
  availabilityForm,
  setAvailabilityForm,
  editingAvailabilityIndex,
  setEditingAvailabilityIndex,
  availabilityDraft,
  addAvailabilityRow,
  resetAvailabilityForm,
  saveAvailability,
  availabilityForSelectedDay,
  handleEditAvailability,
  handleDeleteAvailability
}) {
  return (
    <Card className='space-y-4'>
      <h2 className='text-lg font-semibold text-emerald-950'>Disponibilidad por medico</h2>
      <label className='space-y-1'>
        <span className='text-xs text-emerald-900/75'>Medico</span>
        <select className='glass-input' value={availabilityDoctorId} onChange={(event) => handleLoadAvailability(event.target.value)}>
          <option value=''>Seleccionar</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
          ))}
        </select>
      </label>
      <div className='grid gap-2 sm:grid-cols-4'>
        <label className='space-y-1'>
          <span className='text-xs text-emerald-900/75'>Dia</span>
          <select
            className='glass-input'
            value={availabilityForm.dayOfWeek}
            onChange={(event) => {
              const nextDay = event.target.value
              setAvailabilityForm((prev) => ({ ...prev, dayOfWeek: nextDay }))
              if (editingAvailabilityIndex >= 0 && String(availabilityDraft[editingAvailabilityIndex]?.dayOfWeek) !== nextDay) {
                setEditingAvailabilityIndex(-1)
              }
            }}
          >
            {dayLabels.map((label, index) => (
              <option key={label} value={index}>{label}</option>
            ))}
          </select>
        </label>
        <Input label='Inicio' type='time' value={availabilityForm.startTime} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, startTime: event.target.value }))} />
        <Input label='Fin' type='time' value={availabilityForm.endTime} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, endTime: event.target.value }))} />
        <Input label='Slot (min)' type='number' value={availabilityForm.slotMinutes} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, slotMinutes: event.target.value }))} />
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button variant='secondary' onClick={addAvailabilityRow}>
          {editingAvailabilityIndex >= 0 ? 'Guardar cambio de slot' : 'Agregar rango'}
        </Button>
        {editingAvailabilityIndex >= 0
          ? (
            <Button variant='secondary' onClick={resetAvailabilityForm}>
              Cancelar edicion de slot
            </Button>
            )
          : null}
        <Button onClick={saveAvailability}>Guardar disponibilidad</Button>
      </div>
      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        {availabilityForSelectedDay.map(({ item, index }) => (
          <div
            key={`${item.dayOfWeek}-${item.startTime}-${index}`}
            className={`flex items-center justify-between gap-2 rounded-xl bg-white/70 p-3 text-xs text-emerald-900/80 ${editingAvailabilityIndex === index ? 'ring-2 ring-emerald-500' : ''}`}
          >
            <p className='font-medium'>
              {item.startTime} - {item.endTime}
            </p>
            <div className='flex items-center gap-1.5'>
              <Button
                variant='secondary'
                className='!h-7 !w-7 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleEditAvailability(item, index)}
                aria-label='Modificar slot'
                title='Modificar slot'
              >
                <FiEdit2 size={12} />
              </Button>
              <Button
                variant='danger'
                className='!h-7 !w-7 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleDeleteAvailability(index)}
                aria-label='Eliminar slot'
                title='Eliminar slot'
              >
                <FiTrash2 size={12} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
