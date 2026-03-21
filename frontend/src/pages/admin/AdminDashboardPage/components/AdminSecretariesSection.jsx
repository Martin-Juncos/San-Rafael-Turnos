import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Input } from '../../../../components/ui/Input'

export function AdminSecretariesSection ({
  secretaries,
  doctors,
  secretaryForm,
  setSecretaryForm,
  editingSecretaryId,
  handleSubmitSecretary,
  resetSecretaryForm,
  handleEditSecretary,
  handleDeleteSecretary
}) {
  const toggleDoctor = (doctorId) => {
    setSecretaryForm((prev) => {
      const current = Array.isArray(prev.doctorIds) ? prev.doctorIds : []
      return {
        ...prev,
        doctorIds: current.includes(doctorId)
          ? current.filter((item) => item !== doctorId)
          : [...current, doctorId]
      }
    })
  }

  return (
    <Card className='space-y-4'>
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold text-emerald-950'>Secretaria</h2>
        <p className='text-xs text-emerald-900/70'>
          {editingSecretaryId ? 'Editando secretaria seleccionada.' : 'Asigna secretarias a uno o varios medicos.'}
        </p>
      </div>
      <form className='grid gap-2 sm:grid-cols-2' onSubmit={handleSubmitSecretary}>
        <Input
          label='Nombre'
          value={secretaryForm.fullName}
          onChange={(event) => setSecretaryForm((prev) => ({ ...prev, fullName: event.target.value }))}
        />
        <Input
          label='Correo'
          type='email'
          value={secretaryForm.email}
          onChange={(event) => setSecretaryForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <Input
          label='Telefono'
          value={secretaryForm.phone}
          onChange={(event) => setSecretaryForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
        <Input
          label='DNI (clave inicial)'
          value={secretaryForm.dni}
          onChange={(event) => setSecretaryForm((prev) => ({ ...prev, dni: event.target.value.replace(/\D/g, '') }))}
        />
        <div className='space-y-2 sm:col-span-2'>
          <span className='text-xs text-emerald-900/75'>Medicos vinculados</span>
          <div className='grid gap-2 rounded-xl border border-emerald-200/70 bg-white/70 p-3 sm:grid-cols-2'>
            {doctors.map((doctor) => {
              const checked = secretaryForm.doctorIds.includes(doctor.id)
              return (
                <label key={doctor.id} className='flex items-center gap-2 text-sm text-emerald-950'>
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={() => toggleDoctor(doctor.id)}
                  />
                  <span>{doctor.fullName}</span>
                </label>
              )
            })}
            {doctors.length === 0 ? <p className='text-sm text-emerald-900/70'>No hay medicos cargados.</p> : null}
          </div>
        </div>
        <div className='sm:col-span-2 flex flex-wrap gap-2'>
          <Button type='submit'>
            {editingSecretaryId ? 'Guardar cambios' : 'Crear secretaria'}
          </Button>
          {editingSecretaryId
            ? (
              <Button type='button' variant='secondary' onClick={resetSecretaryForm}>
                Cancelar edicion
              </Button>
              )
            : null}
        </div>
      </form>

      <div className='grid gap-2 sm:grid-cols-2'>
        {secretaries.map((secretary) => (
          <div key={secretary.id} className='flex items-center justify-between gap-2 rounded-xl bg-white/70 p-3 text-sm'>
            <div className='min-w-0'>
              <p className='font-semibold text-emerald-950'>{secretary.fullName || secretary.email}</p>
              <p className='text-xs text-emerald-900/70'>{secretary.email}</p>
              <p className='text-xs text-emerald-900/70'>Telefono: {secretary.phone || '-'}</p>
              <p className='text-xs text-emerald-900/70'>DNI: {secretary.dni || '-'}</p>
              <p className='text-xs text-emerald-900/70'>
                Medicos: {Array.isArray(secretary.linkedDoctors) && secretary.linkedDoctors.length > 0
                  ? secretary.linkedDoctors.map((doctor) => doctor.fullName).join(', ')
                  : '-'}
              </p>
            </div>
            <div className='flex items-center gap-1.5'>
              <Button
                variant='secondary'
                className='!h-8 !w-8 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleEditSecretary(secretary)}
                aria-label='Modificar secretaria'
                title='Modificar secretaria'
              >
                <FiEdit2 size={13} />
              </Button>
              <Button
                variant='danger'
                className='!h-8 !w-8 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleDeleteSecretary(secretary.id)}
                aria-label='Eliminar secretaria'
                title='Eliminar secretaria'
              >
                <FiTrash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
        {secretaries.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay secretarias cargadas.</p> : null}
      </div>
    </Card>
  )
}
