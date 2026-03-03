import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Input } from '../../../../components/ui/Input'

export function AdminDoctorsSection ({
  doctors,
  specialties,
  doctorForm,
  setDoctorForm,
  editingDoctorId,
  handleSubmitDoctor,
  resetDoctorForm,
  handleEditDoctor,
  handleDeleteDoctor
}) {
  return (
    <Card className='space-y-4'>
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold text-emerald-950'>Medicos</h2>
        <p className='text-xs text-emerald-900/70'>
          {editingDoctorId ? 'Editando medico seleccionado.' : 'Carga y administra profesionales.'}
        </p>
      </div>
      <form className='grid gap-2 sm:grid-cols-2' onSubmit={handleSubmitDoctor}>
        <Input
          label='Nombre'
          value={doctorForm.fullName}
          onChange={(event) => setDoctorForm((prev) => ({ ...prev, fullName: event.target.value }))}
        />
        <Input
          label='Correo'
          type='email'
          value={doctorForm.email}
          onChange={(event) => setDoctorForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <Input
          label='Telefono'
          value={doctorForm.phone}
          onChange={(event) => setDoctorForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
        <Input
          label='DNI (clave inicial)'
          value={doctorForm.dni}
          onChange={(event) => setDoctorForm((prev) => ({ ...prev, dni: event.target.value.replace(/\D/g, '') }))}
        />
        <Input
          label='Consultorio'
          type='number'
          min='1'
          value={doctorForm.consultorio}
          onChange={(event) => setDoctorForm((prev) => ({ ...prev, consultorio: event.target.value }))}
        />
        <label className='space-y-1'>
          <span className='text-xs text-emerald-900/75'>Especialidad</span>
          <select
            className='glass-input'
            value={doctorForm.specialtyId}
            onChange={(event) => setDoctorForm((prev) => ({ ...prev, specialtyId: event.target.value }))}
          >
            <option value=''>Seleccionar</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
            ))}
          </select>
        </label>
        <div className='sm:col-span-2 flex flex-wrap gap-2'>
          <Button type='submit'>
            {editingDoctorId ? 'Guardar cambios' : 'Crear medico'}
          </Button>
          {editingDoctorId
            ? (
              <Button type='button' variant='secondary' onClick={resetDoctorForm}>
                Cancelar edicion
              </Button>
              )
            : null}
        </div>
      </form>

      <div className='grid gap-2 sm:grid-cols-2'>
        {doctors.map((doctor) => (
          <div key={doctor.id} className='flex items-center justify-between gap-2 rounded-xl bg-white/70 p-3 text-sm'>
            <div className='min-w-0'>
              <p className='font-semibold text-emerald-950'>{doctor.fullName}</p>
              <p className='text-xs text-emerald-900/70'>{doctor.email}</p>
              <p className='text-xs text-emerald-900/70'>DNI: {doctor.dni || '-'}</p>
              <p className='text-xs text-emerald-900/70'>Consultorio: {doctor.consultorio}</p>
            </div>
            <div className='flex items-center gap-1.5'>
              <Button
                variant='secondary'
                className='!h-8 !w-8 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleEditDoctor(doctor)}
                aria-label='Modificar medico'
                title='Modificar medico'
              >
                <FiEdit2 size={13} />
              </Button>
              <Button
                variant='danger'
                className='!h-8 !w-8 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleDeleteDoctor(doctor.id)}
                aria-label='Eliminar medico'
                title='Eliminar medico'
              >
                <FiTrash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
        {doctors.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay medicos cargados.</p> : null}
      </div>
    </Card>
  )
}

