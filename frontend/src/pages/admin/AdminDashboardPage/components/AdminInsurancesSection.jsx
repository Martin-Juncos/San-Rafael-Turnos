import { FiEdit2, FiPower, FiTrash2 } from 'react-icons/fi'
import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Input } from '../../../../components/ui/Input'

export function AdminInsurancesSection ({
  insurances,
  insuranceForm,
  setInsuranceForm,
  editingInsuranceId,
  handleSubmitInsurance,
  resetInsuranceForm,
  handleToggleInsuranceStatus,
  handleEditInsurance,
  handleDeleteInsurance
}) {
  return (
    <Card className='space-y-4'>
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold text-emerald-950'>Obras sociales</h2>
        <p className='text-xs text-emerald-900/70'>
          {editingInsuranceId ? 'Editando obra social seleccionada.' : 'Gestiona nombre y porcentaje de descuento.'}
        </p>
      </div>
      <form className='grid gap-2 sm:grid-cols-3' onSubmit={handleSubmitInsurance}>
        <Input
          label='Nombre'
          value={insuranceForm.name}
          onChange={(event) => setInsuranceForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <Input
          label='Descuento (%)'
          type='number'
          min='0'
          max='100'
          step='0.01'
          value={insuranceForm.discountPercent}
          onChange={(event) => setInsuranceForm((prev) => ({ ...prev, discountPercent: event.target.value }))}
        />
        <div className='self-end flex flex-wrap gap-2 sm:justify-end'>
          <Button type='submit'>
            {editingInsuranceId ? 'Guardar cambios' : 'Crear obra social'}
          </Button>
          {editingInsuranceId
            ? (
              <Button type='button' variant='secondary' onClick={resetInsuranceForm}>
                Cancelar
              </Button>
              )
            : null}
        </div>
      </form>

      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        {insurances.map((insurance) => (
          <div key={insurance.id} className='flex items-center justify-between gap-2 rounded-xl bg-white/70 p-3 text-sm'>
            <div>
              <p className={`font-semibold text-emerald-950 ${insurance.isActive ? '' : 'line-through opacity-70'}`}>{insurance.name}</p>
              <p className='text-xs text-emerald-900/70'>Descuento: {insurance.discountPercent}%</p>
              <p className='text-xs text-emerald-900/70'>Estado: {insurance.isActive ? 'Activa' : 'Inactiva'}</p>
            </div>
            <div className='flex items-center gap-1.5'>
              <Button
                variant='secondary'
                className='!h-8 !w-8 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleToggleInsuranceStatus(insurance)}
                aria-label={insurance.isActive ? 'Desactivar obra social' : 'Activar obra social'}
                title={insurance.isActive ? 'Desactivar obra social' : 'Activar obra social'}
              >
                <FiPower size={13} />
              </Button>
              <Button
                variant='secondary'
                className='!h-8 !w-8 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleEditInsurance(insurance)}
                aria-label='Modificar obra social'
                title='Modificar obra social'
              >
                <FiEdit2 size={13} />
              </Button>
              <Button
                variant='danger'
                className='!h-8 !w-8 !rounded-full !p-0 inline-flex items-center justify-center'
                onClick={() => handleDeleteInsurance(insurance.id)}
                aria-label='Eliminar obra social'
                title='Eliminar obra social'
              >
                <FiTrash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
        {insurances.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay obras sociales cargadas.</p> : null}
      </div>
    </Card>
  )
}

