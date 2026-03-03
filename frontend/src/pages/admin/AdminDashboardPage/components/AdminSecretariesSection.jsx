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
  return (
    <Card className='space-y-4'>
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold text-emerald-950'>Secretaria</h2>
        <p className='text-xs text-emerald-900/70'>
          {editingSecretaryId ? 'Editando secretaria seleccionada.' : 'Asigna secretarias por medico.'}
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
        <label className='space-y-1 sm:col-span-2'>
          <span className='text-xs text-emerald-900/75'>Medico vinculado</span>
          <select
            className='glass-input'
            value={secretaryForm.doctorId}
            onChange={(event) => setSecretaryForm((prev) => ({ ...prev, doctorId: event.target.value }))}
          >
            <option value=''>Seleccionar</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
            ))}
          </select>
        </label>
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
              <p className='text-xs text-emerald-900/70'>Medico: {secretary.doctor?.fullName || '-'}</p>
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

