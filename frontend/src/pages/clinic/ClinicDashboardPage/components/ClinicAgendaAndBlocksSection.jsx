import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Input } from '../../../../components/ui/Input'

export function ClinicAgendaAndBlocksSection ({
  specialties,
  doctors,
  doctorFilters,
  setDoctorFilters,
  appointmentFilters,
  setAppointmentFilters,
  selectedSpecialtyName,
  selectedAgendaDoctor,
  agendaAvailabilityLoading,
  agendaDaysWithAvailability,
  formatDateLabel,
  slots,
  agendaLoading,
  agendaConfirmedAppointments,
  blockDraft,
  setBlockDraft,
  today,
  blockAvailabilityLoading,
  blockAvailableDates,
  blockStartOptions,
  blockEndOptions,
  createBlock
}) {
  return (
    <div className='grid gap-6 xl:grid-cols-[1.2fr_1fr]'>
      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-emerald-950'>Medicos y filtros</h2>
        <div className='grid gap-3 sm:grid-cols-3'>
          <label className='space-y-1'>
            <span className='text-xs text-emerald-900/75'>Especialidad</span>
            <select
              className='glass-input'
              value={doctorFilters.specialtyId}
              onChange={(event) => setDoctorFilters((prev) => ({ ...prev, specialtyId: event.target.value }))}
            >
              <option value=''>Todas</option>
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
              ))}
            </select>
          </label>
          <label className='space-y-1'>
            <span className='text-xs text-emerald-900/75'>Buscar medico</span>
            <select
              className='glass-input'
              value={doctorFilters.search}
              onChange={(event) => setDoctorFilters((prev) => ({ ...prev, search: event.target.value }))}
            >
              <option value=''>Todos</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.fullName}>{doctor.fullName}</option>
              ))}
            </select>
          </label>
          <Input
            label='Fecha agenda'
            type='date'
            value={doctorFilters.date}
            onChange={(event) => setDoctorFilters((prev) => ({ ...prev, date: event.target.value }))}
          />
        </div>
        <p className='text-xs text-emerald-900/70'>Mostrando especialidad: {selectedSpecialtyName}</p>

        <div className='grid gap-2'>
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className={`rounded-xl bg-white/70 p-3 ${
                appointmentFilters.doctorId === doctor.id ? 'border border-brand-300/70' : ''
              }`}
            >
              <div className='grid gap-3 lg:grid-cols-[220px_1fr] lg:items-start'>
                <div className='space-y-2'>
                  <p className='text-sm font-semibold text-emerald-950'>{doctor.fullName}</p>
                  <p className='text-xs text-emerald-900/70'>{doctor.specialty?.name || 'Sin especialidad'}</p>
                  <button
                    type='button'
                    className='rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs'
                    onClick={() => {
                      setAppointmentFilters((prev) => ({
                        ...prev,
                        doctorId: prev.doctorId === doctor.id ? '' : doctor.id
                      }))
                    }}
                  >
                    {appointmentFilters.doctorId === doctor.id ? 'Ocultar agenda' : 'Ver agenda'}
                  </button>
                </div>

                {appointmentFilters.doctorId === doctor.id
                  ? (
                    <div className='space-y-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3'>
                      <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
                        Dias de atencion (proximos 21 dias)
                      </p>

                      {agendaAvailabilityLoading
                        ? <p className='text-xs text-emerald-900/75'>Buscando dias y horarios...</p>
                        : (
                            <div className='flex flex-wrap gap-2'>
                              {agendaDaysWithAvailability.length === 0
                                ? <span className='text-xs text-emerald-900/75'>Este medico no tiene agenda cargada en los proximos 21 dias.</span>
                                : agendaDaysWithAvailability.map((item) => (
                                    <button
                                      key={item.date}
                                      type='button'
                                      onClick={() => {
                                        setDoctorFilters((prev) => ({ ...prev, date: item.date }))
                                      }}
                                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                        doctorFilters.date === item.date
                                          ? 'border-brand-500 bg-brand-100 text-brand-800'
                                          : 'border-emerald-200 bg-white/80 text-emerald-900/80 hover:bg-emerald-100'
                                      }`}
                                    >
                                      {formatDateLabel(item.date)} ({item.count})
                                    </button>
                                  ))}
                            </div>
                          )}

                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='text-xs text-emerald-900/75'>
                          Dia seleccionado: {doctorFilters.date ? formatDateLabel(doctorFilters.date) : 'Sin dia'}
                        </p>
                      </div>

                      <div className='flex flex-wrap gap-2'>
                        {slots.map((slot) => (
                          <span key={slot.startTime} className='rounded-lg bg-white/80 px-3 py-1 text-xs text-emerald-900/85'>
                            {slot.startTime.slice(0, 5)}
                          </span>
                        ))}
                      </div>
                      {!agendaLoading && slots.length === 0
                        ? <p className='text-xs text-amber-700'>No hay horarios disponibles para el dia seleccionado.</p>
                        : null}

                      <div className='space-y-2'>
                        <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
                          Turnos confirmados del dia
                        </p>
                        <div className='flex flex-wrap gap-2'>
                          {agendaConfirmedAppointments.map((appointment) => (
                            <span
                              key={appointment.id}
                              className='rounded-lg bg-brand-700 px-3 py-1 text-xs font-semibold text-white'
                            >
                              {appointment.startTime.slice(0, 5)} {appointment.patient?.fullName ? `- ${appointment.patient.fullName}` : ''}
                            </span>
                          ))}
                        </div>
                        {!agendaLoading && agendaConfirmedAppointments.length === 0
                          ? <p className='text-xs text-emerald-900/70'>No hay turnos confirmados para el dia seleccionado.</p>
                          : null}
                      </div>
                    </div>
                    )
                  : null}
              </div>
            </div>
          ))}
        </div>
        {doctors.length === 0 ? <p className='text-xs text-emerald-900/70'>No hay medicos para los filtros aplicados.</p> : null}
        {selectedAgendaDoctor
          ? <p className='text-xs text-emerald-900/70'>Agenda seleccionada: {selectedAgendaDoctor.fullName}.</p>
          : <p className='text-xs text-emerald-900/70'>Selecciona Ver agenda en un medico.</p>}
      </Card>

      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-emerald-950'>Bloqueos</h2>
        <form className='space-y-3' onSubmit={createBlock}>
          <label className='space-y-1 block'>
            <span className='text-xs text-emerald-900/75'>Medico</span>
            <select
              className='glass-input'
              value={blockDraft.doctorId}
              onChange={(event) => setBlockDraft((prev) => ({
                ...prev,
                doctorId: event.target.value,
                date: today,
                startTime: '',
                endTime: ''
              }))}
            >
              <option value=''>Seleccionar</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
              ))}
            </select>
          </label>

          {blockDraft.doctorId && (
            <div className='space-y-2 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
              <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
                Proximos dias con agenda disponible
              </p>
              {blockAvailabilityLoading
                ? <p className='text-xs text-emerald-900/70'>Buscando disponibilidad...</p>
                : (
                    <div className='flex flex-wrap gap-2'>
                      {blockAvailableDates.length === 0
                        ? <span className='text-xs text-emerald-900/70'>Este medico no tiene agenda cargada en los proximos 21 dias.</span>
                        : blockAvailableDates.map((item) => (
                            <button
                              key={item.date}
                              type='button'
                              onClick={() => setBlockDraft((prev) => ({ ...prev, date: item.date, startTime: '', endTime: '' }))}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                blockDraft.date === item.date
                                  ? 'border-brand-500 bg-brand-100 text-brand-800'
                                  : 'border-emerald-200 bg-white/70 text-emerald-900/75 hover:bg-emerald-100'
                              }`}
                            >
                              {formatDateLabel(item.date)}
                            </button>
                          ))}
                    </div>
                  )}
            </div>
          )}

          <label className='block space-y-1'>
            <span className='text-xs text-emerald-900/75'>Dia seleccionado</span>
            <div className='glass-input flex h-11 items-center'>
              {blockDraft.date ? formatDateLabel(blockDraft.date) : 'Seleccionar un dia'}
            </div>
          </label>

          <div className='grid gap-2 sm:grid-cols-2'>
            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Inicio del bloqueo</span>
              <select
                className='glass-input'
                value={blockDraft.startTime}
                onChange={(event) => setBlockDraft((prev) => ({ ...prev, startTime: event.target.value, endTime: '' }))}
                disabled={!blockDraft.doctorId || blockStartOptions.length === 0}
              >
                <option value=''>Seleccionar</option>
                {blockStartOptions.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </label>
            <label className='block space-y-1'>
              <span className='text-xs text-emerald-900/75'>Fin del bloqueo</span>
              <select
                className='glass-input'
                value={blockDraft.endTime}
                onChange={(event) => setBlockDraft((prev) => ({ ...prev, endTime: event.target.value }))}
                disabled={!blockDraft.startTime || blockEndOptions.length === 0}
              >
                <option value=''>Seleccionar</option>
                {blockEndOptions.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </label>
          </div>
          {!blockAvailabilityLoading && blockDraft.doctorId && blockAvailableDates.length === 0
            ? <p className='text-xs text-amber-700'>No hay dias disponibles para bloquear en los proximos 21 dias.</p>
            : null}
          {!blockAvailabilityLoading && blockDraft.doctorId && blockAvailableDates.length > 0 && blockStartOptions.length === 0
            ? <p className='text-xs text-amber-700'>No hay horarios libres para bloquear en el dia seleccionado.</p>
            : null}
          <Input label='Motivo' value={blockDraft.reason} onChange={(event) => setBlockDraft((prev) => ({ ...prev, reason: event.target.value }))} />
          <Button
            type='submit'
            disabled={!blockDraft.doctorId || !blockDraft.startTime || !blockDraft.endTime}
          >
            Guardar bloqueo
          </Button>
        </form>
      </Card>
    </div>
  )
}

