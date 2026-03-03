export function SpecialtyPicker ({
  specialtyId,
  specialties,
  onChange
}) {
  return (
    <label className='space-y-1 text-sm'>
      <span className='text-xs text-emerald-900/75'>Especialidad</span>
      <select
        className='glass-input'
        value={specialtyId}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value=''>Seleccionar</option>
        {specialties.map((specialty) => (
          <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
        ))}
      </select>
    </label>
  )
}
