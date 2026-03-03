export function DoctorPicker ({
  doctorId,
  filteredDoctors,
  onChange
}) {
  return (
    <label className='space-y-1 text-sm'>
      <span className='text-xs text-emerald-900/75'>Profesional</span>
      <select
        className='glass-input'
        value={doctorId}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value=''>Seleccionar</option>
        {filteredDoctors.map((doctor) => (
          <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
        ))}
      </select>
      <span className='text-[11px] text-emerald-900/60'>
        Los dias y horarios los configura la clinica en Panel Admin {'->'} Disponibilidad por medico.
      </span>
    </label>
  )
}
