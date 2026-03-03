import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Input } from '../../../../components/ui/Input'

export function AdminSpecialtiesSection ({
  specialties,
  specialtyForm,
  setSpecialtyForm,
  editingSpecialtyId,
  handleSubmitSpecialty,
  resetSpecialtyForm,
  handleEditSpecialty,
  handleDeleteSpecialty
}) {
  return (
    <Card className='space-y-4'>
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold text-emerald-950'>Especialidades</h2>
        <p className='text-xs text-emerald-900/70'>
          {editingSpecialtyId ? 'Editando especialidad seleccionada.' : 'Crea y administra especialidades y aranceles.'}
        </p>
      </div>
      <form className='grid gap-2 sm:grid-cols-2' onSubmit={handleSubmitSpecialty}>
        <Input
          label='Nombre'
          value={specialtyForm.name}
          onChange={(event) => setSpecialtyForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <Input
          label='Arancel'
          type='number'
          min='0'
          value={specialtyForm.fee}
          onChange={(event) => setSpecialtyForm((prev) => ({ ...prev, fee: event.target.value }))}
        />
        <div className='sm:col-span-2'>
          <Input
            label='Descripcion'
            value={specialtyForm.description}
            onChange={(event) => setSpecialtyForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>
        <div className='sm:col-span-2 flex flex-wrap gap-2'>
          <Button type='submit'>
            {editingSpecialtyId ? 'Guardar cambios' : 'Crear especialidad'}
          </Button>
          {editingSpecialtyId
            ? (
              <Button type='button' variant='secondary' onClick={resetSpecialtyForm}>
                Cancelar edicion
              </Button>
              )
            : null}
        </div>
      </form>

      <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
        {specialties.map((specialty) => (
          <div key={specialty.id} className='space-y-3 rounded-xl bg-white/70 p-3 text-sm'>
            <div>
              <p className='font-semibold text-emerald-950'>{specialty.name}</p>
              <p className='text-xs text-emerald-900/70'>${specialty.fee}</p>
              <p className='mt-1 text-xs text-emerald-900/75'>
                {specialty.description || 'Sin descripcion'}
              </p>
            </div>
            <div className='flex items-center gap-1.5'>
              <Button
                variant='secondary'
                className='!h-8 !w-8 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleEditSpecialty(specialty)}
                aria-label='Modificar especialidad'
                title='Modificar especialidad'
              >
                <FiEdit2 size={13} />
              </Button>
              <Button
                variant='danger'
                className='!h-8 !w-8 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleDeleteSpecialty(specialty.id)}
                aria-label='Eliminar especialidad'
                title='Eliminar especialidad'
              >
                <FiTrash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

