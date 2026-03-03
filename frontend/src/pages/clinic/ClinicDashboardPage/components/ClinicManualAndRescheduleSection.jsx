import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Input } from '../../../../components/ui/Input'

export function ClinicManualAndRescheduleSection ({
  doctors,
  appointments,
  today,
  manualAppointment,
  setManualAppointment,
  manualAvailabilityLoading,
  manualDaysWithAvailability,
  formatDateLabel,
  manualSlotsLoading,
  manualOpenSlots,
  manualPatientLookupMessage,
  manualPatientLookupDone,
  manualPatientLookupLoading,
  handleManualPatientDniChange,
  lookupManualPatientByDni,
  createManualAppointment,
  rescheduleDoctorId,
  setRescheduleDoctorId,
  rescheduleDraft,
  setRescheduleDraft,
  rescheduleAppointments,
  rescheduleAvailabilityLoading,
  rescheduleDaysWithAvailability,
  rescheduleSlotsLoading,
  rescheduleOpenSlots,
  rescheduleAppointment
}) {
  return (
    <div className='grid gap-6 xl:grid-cols-2'>
      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-emerald-950'>Crear turno manual</h2>
        <form className='space-y-3' onSubmit={createManualAppointment}>
          <label className='block space-y-1'>
            <span className='text-xs text-emerald-900/75'>Medico</span>
            <select
              className='glass-input'
              value={manualAppointment.doctorId}
              onChange={(event) => {
                const doctor = doctors.find((item) => item.id === event.target.value)
                setManualAppointment((prev) => ({
                  ...prev,
                  doctorId: event.target.value,
                  specialtyId: doctor?.specialtyId || '',
                  date: today,
                  startTime: ''
                }))
              }}
            >
              <option value=''>Seleccionar</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
              ))}
            </select>
          </label>

          {manualAppointment.doctorId && (
            <div className='space-y-2 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
                Proximos dias con agenda disponible
              </p>
              {manualAvailabilityLoading
                ? <p className='text-xs text-emerald-900/70'>Buscando disponibilidad...</p>
                : (
                    <div className='flex flex-wrap gap-2'>
                      {manualDaysWithAvailability.length === 0
                        ? <span className='text-xs text-emerald-900/70'>Este medico no tiene agenda cargada en los proximos 21 dias.</span>
                        : manualDaysWithAvailability.map((item) => (
                            <button
                              key={item.date}
                              type='button'
                              onClick={() => setManualAppointment((prev) => ({ ...prev, date: item.date, startTime: '' }))}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                manualAppointment.date === item.date
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

          <div className='grid gap-2 sm:grid-cols-2'>
            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Dia seleccionado</span>
              <div className='glass-input flex h-11 items-center'>
                {manualAppointment.date ? formatDateLabel(manualAppointment.date) : 'Seleccionar un dia'}
              </div>
            </label>
            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Horario disponible</span>
              <select
                className='glass-input'
                value={manualAppointment.startTime}
                onChange={(event) => setManualAppointment((prev) => ({ ...prev, startTime: event.target.value }))}
              >
                <option value=''>
                  {manualSlotsLoading ? 'Buscando horarios...' : 'Seleccionar'}
                </option>
                {manualOpenSlots.map((slot) => (
                  <option key={slot.startTime} value={slot.startTime}>{slot.startTime.slice(0, 5)}</option>
                ))}
              </select>
            </label>
          </div>
          {!manualSlotsLoading && manualAppointment.doctorId && manualOpenSlots.length === 0
            ? <p className='text-xs text-amber-700'>No hay horarios disponibles para la fecha elegida.</p>
            : null}
          <div className='space-y-3 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
            <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
              Datos del paciente
            </p>

            <div className='grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end'>
              <Input
                label='DNI'
                value={manualAppointment.dni}
                onChange={(event) => handleManualPatientDniChange(event.target.value)}
                placeholder='Solo numeros'
              />
              <Button
                type='button'
                variant='secondary'
                onClick={lookupManualPatientByDni}
                disabled={manualPatientLookupLoading}
              >
                {manualPatientLookupLoading ? 'Verificando...' : 'Verificar DNI'}
              </Button>
              <Button
                type='button'
                variant='secondary'
                onClick={() => handleManualPatientDniChange('')}
                disabled={!manualAppointment.dni && !manualPatientLookupDone}
              >
                Cambiar DNI
              </Button>
            </div>

            {manualPatientLookupMessage
              ? (
                <p className='rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900/80'>
                  {manualPatientLookupMessage}
                </p>
                )
              : null}

            {!manualPatientLookupDone
              ? (
                <p className='text-xs text-amber-700'>
                  Verifica el DNI para autocompletar datos o cargar un paciente nuevo.
                </p>
                )
              : (
                <div className='grid gap-2 sm:grid-cols-2'>
                  <Input
                    label='Paciente'
                    value={manualAppointment.fullName}
                    onChange={(event) => setManualAppointment((prev) => ({ ...prev, fullName: event.target.value }))}
                  />
                  <Input
                    label='Telefono'
                    value={manualAppointment.phone}
                    onChange={(event) => setManualAppointment((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                  <Input
                    label='Calle y numero'
                    value={manualAppointment.streetAndNumber}
                    onChange={(event) => setManualAppointment((prev) => ({ ...prev, streetAndNumber: event.target.value }))}
                  />
                  <Input
                    label='Ciudad'
                    value={manualAppointment.city}
                    onChange={(event) => setManualAppointment((prev) => ({ ...prev, city: event.target.value }))}
                  />
                  <div className='sm:col-span-2'>
                    <Input
                      label='Sintomas / motivo'
                      value={manualAppointment.symptoms}
                      onChange={(event) => setManualAppointment((prev) => ({ ...prev, symptoms: event.target.value }))}
                    />
                  </div>
                </div>
                )}
          </div>
          <Button type='submit' disabled={!manualAppointment.doctorId || !manualAppointment.startTime || manualOpenSlots.length === 0}>
            Crear turno
          </Button>
        </form>
      </Card>

      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-emerald-950'>Reprogramar turno</h2>
        <form className='space-y-3' onSubmit={rescheduleAppointment}>
          <label className='block space-y-1'>
            <span className='text-xs text-emerald-900/75'>Medico</span>
            <select
              className='glass-input'
              value={rescheduleDoctorId}
              onChange={(event) => {
                setRescheduleDoctorId(event.target.value)
                setRescheduleDraft((prev) => ({
                  ...prev,
                  appointmentId: '',
                  date: today,
                  startTime: ''
                }))
              }}
            >
              <option value=''>Seleccionar</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
              ))}
            </select>
          </label>

          <label className='block space-y-1'>
            <span className='text-xs text-emerald-900/75'>Turno</span>
            <select
              className='glass-input'
              value={rescheduleDraft.appointmentId}
              onChange={(event) => {
                const appointmentId = event.target.value
                const appointment = appointments.find((item) => item.id === appointmentId)
                setRescheduleDraft((prev) => ({
                  ...prev,
                  appointmentId,
                  date: appointment?.date || prev.date,
                  startTime: ''
                }))
              }}
              disabled={!rescheduleDoctorId}
            >
              <option value=''>{rescheduleDoctorId ? 'Seleccionar' : 'Primero seleccionar medico'}</option>
              {rescheduleAppointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                </option>
              ))}
            </select>
          </label>

          {rescheduleDoctorId && (
            <div className='space-y-2 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
                Proximos dias con agenda disponible
              </p>
              {rescheduleAvailabilityLoading
                ? <p className='text-xs text-emerald-900/70'>Buscando disponibilidad...</p>
                : (
                    <div className='flex flex-wrap gap-2'>
                      {rescheduleDaysWithAvailability.length === 0
                        ? <span className='text-xs text-emerald-900/70'>Este medico no tiene agenda cargada en los proximos 21 dias.</span>
                        : rescheduleDaysWithAvailability.map((item) => (
                            <button
                              key={item.date}
                              type='button'
                              onClick={() => setRescheduleDraft((prev) => ({ ...prev, date: item.date, startTime: '' }))}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                rescheduleDraft.date === item.date
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

          <div className='grid gap-2 sm:grid-cols-2'>
            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Nuevo dia seleccionado</span>
              <div className='glass-input flex h-11 items-center'>
                {rescheduleDraft.date ? formatDateLabel(rescheduleDraft.date) : 'Seleccionar un dia'}
              </div>
            </label>
            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Nuevo horario disponible</span>
              <select
                className='glass-input'
                value={rescheduleDraft.startTime}
                onChange={(event) => setRescheduleDraft((prev) => ({ ...prev, startTime: event.target.value }))}
              >
                <option value=''>
                  {rescheduleSlotsLoading ? 'Buscando horarios...' : 'Seleccionar'}
                </option>
                {rescheduleOpenSlots.map((slot) => (
                  <option key={slot.startTime} value={slot.startTime}>{slot.startTime.slice(0, 5)}</option>
                ))}
              </select>
            </label>
          </div>
          {!rescheduleSlotsLoading && rescheduleDoctorId && rescheduleOpenSlots.length === 0
            ? <p className='text-xs text-amber-700'>No hay horarios disponibles para la fecha elegida.</p>
            : null}
          <Button
            type='submit'
            disabled={!rescheduleDraft.appointmentId || !rescheduleDraft.startTime || rescheduleOpenSlots.length === 0}
          >
            Reprogramar
          </Button>
        </form>
      </Card>
    </div>
  )
}

