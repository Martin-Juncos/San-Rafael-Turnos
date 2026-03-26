import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Card } from '../../../../components/ui/Card'

export function DoctorManagementPanel ({
  canEditDoctorNotes,
  selectedAppointmentId,
  appointments,
  unreadAppointmentIds,
  handleSelectAppointment,
  selectedAppointment,
  managementForm,
  setManagementForm,
  appointmentStatusOptions,
  paymentStatusOptions,
  saveManagement,
  savingManagement,
  openDeleteModal,
  deletingAppointment,
  messages,
  chatDraft,
  setChatDraft,
  sendMessage
}) {
  return (
    <Card className='space-y-4'>
      <h2 className='text-lg font-semibold text-emerald-950'>Gestion del turno</h2>
      <label className='space-y-1 block'>
        <span className='text-xs text-emerald-900/75'>Turno seleccionado</span>
        <select
          className='glass-input'
          value={selectedAppointmentId}
          onChange={(event) => {
            const nextId = event.target.value
            handleSelectAppointment(nextId)
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
                  {appointmentStatusOptions.map((item) => (
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
                  {paymentStatusOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {canEditDoctorNotes
              ? (
                <Input
                  label='Nota interna'
                  value={managementForm.doctorNotes}
                  onChange={(event) => setManagementForm((prev) => ({ ...prev, doctorNotes: event.target.value }))}
                />
                )
              : null}

            <div className='flex flex-wrap gap-2'>
              <Button onClick={saveManagement} disabled={savingManagement}>
                {savingManagement ? 'Guardando cambios...' : 'Guardar gestion'}
              </Button>
              <Button variant='danger' onClick={openDeleteModal} disabled={deletingAppointment}>
                {deletingAppointment ? 'Eliminando...' : 'Eliminar definitivamente'}
              </Button>
            </div>
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
  )
}
