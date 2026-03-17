import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'

export function PatientInfoForm ({
  isStaffBooking,
  form,
  patientLookupLoading,
  patientLookupDone,
  patientLookupMessage,
  onPatientDniChange,
  onLookupPatientByDni,
  updateFormField
}) {
  return (
    <div className='space-y-3 rounded-xl border border-emerald-200/70 bg-white/70 p-3'>
      <p className='text-xs font-semibold uppercase tracking-wide text-emerald-900/70'>
        Datos del paciente
      </p>

      {isStaffBooking
        ? (
          <div className='grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end'>
            <Input
              label='DNI'
              value={form.dni}
              onChange={(event) => onPatientDniChange(event.target.value)}
              placeholder='Solo numeros'
            />
            <Button
              type='button'
              variant='secondary'
              onClick={onLookupPatientByDni}
              disabled={patientLookupLoading}
            >
              {patientLookupLoading ? 'Verificando...' : 'Verificar DNI'}
            </Button>
            <Button
              type='button'
              variant='secondary'
              onClick={() => onPatientDniChange('')}
              disabled={!form.dni && !patientLookupDone}
            >
              Cambiar DNI
            </Button>
          </div>
          )
        : (
          <Input label='DNI' value={form.dni} disabled />
          )}

      {patientLookupMessage
        ? (
          <p className='rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900/80'>
            {patientLookupMessage}
          </p>
          )
        : null}

      {isStaffBooking && !patientLookupDone
        ? (
          <p className='text-xs text-amber-700'>
            Verifica el DNI para desplegar y completar los datos del paciente.
          </p>
          )
        : (
          <div className='grid gap-3 sm:grid-cols-2'>
            <Input
              label='Nombre completo'
              value={form.fullName}
              onChange={(event) => updateFormField('fullName', event.target.value)}
            />
            <Input
              label='Telefono'
              value={form.phone}
              onChange={(event) => updateFormField('phone', event.target.value)}
            />
            <Input
              label='Calle y numero'
              value={form.streetAndNumber}
              onChange={(event) => updateFormField('streetAndNumber', event.target.value)}
            />
            <Input
              label='Ciudad'
              value={form.city}
              onChange={(event) => updateFormField('city', event.target.value)}
            />
            <div className='sm:col-span-2'>
              <Input
                label='Motivo / sintomas'
                value={form.symptoms}
                onChange={(event) => updateFormField('symptoms', event.target.value)}
              />
            </div>
          </div>
          )}
    </div>
  )
}
