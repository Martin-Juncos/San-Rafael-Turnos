import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { doctorsService, insurancesService, specialtiesService } from '../../api/services'

const dayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

export function AdminDashboardPage () {
  const [specialties, setSpecialties] = useState([])
  const [insurances, setInsurances] = useState([])
  const [doctors, setDoctors] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [specialtyForm, setSpecialtyForm] = useState({
    name: '',
    description: '',
    fee: 15000
  })
  const [insuranceForm, setInsuranceForm] = useState({
    name: '',
    discountPercent: 0
  })
  const [doctorForm, setDoctorForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    dni: '',
    consultorio: '',
    specialtyId: ''
  })

  const [availabilityDoctorId, setAvailabilityDoctorId] = useState('')
  const [availabilityDraft, setAvailabilityDraft] = useState([])
  const [availabilityForm, setAvailabilityForm] = useState({
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '13:00',
    slotMinutes: '30'
  })

  const load = async () => {
    const [specialtyResult, insurancesResult, doctorsResult] = await Promise.all([
      specialtiesService.list({ pageSize: 100, isActive: 'true' }),
      insurancesService.list({ pageSize: 100 }),
      doctorsService.list({ pageSize: 100 })
    ])
    setSpecialties(specialtyResult.items)
    setInsurances(insurancesResult.items)
    setDoctors(doctorsResult.items)
  }

  useEffect(() => {
    load().catch((apiError) => setError(apiError.message))
  }, [])

  const handleCreateSpecialty = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      await specialtiesService.create({
        ...specialtyForm,
        fee: Number(specialtyForm.fee)
      })
      setSpecialtyForm({ name: '', description: '', fee: 15000 })
      await load()
      setMessage('Especialidad creada')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleCreateDoctor = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      await doctorsService.create({
        ...doctorForm,
        consultorio: Number(doctorForm.consultorio)
      })
      setDoctorForm({ fullName: '', email: '', phone: '', dni: '', consultorio: '', specialtyId: '' })
      await load()
      setMessage('Medico creado. Credenciales iniciales: email + DNI.')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleCreateInsurance = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      await insurancesService.create({
        name: insuranceForm.name,
        discountPercent: Number(insuranceForm.discountPercent)
      })
      setInsuranceForm({ name: '', discountPercent: 0 })
      await load()
      setMessage('Obra social creada')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleDeleteSpecialty = async (id) => {
    setError('')
    try {
      await specialtiesService.remove(id)
      await load()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleDeleteDoctor = async (id) => {
    setError('')
    try {
      await doctorsService.remove(id)
      await load()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleDeleteInsurance = async (id) => {
    setError('')
    try {
      await insurancesService.remove(id)
      await load()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleLoadAvailability = async (doctorId) => {
    setAvailabilityDoctorId(doctorId)
    if (!doctorId) {
      setAvailabilityDraft([])
      return
    }
    try {
      const data = await doctorsService.getAvailability(doctorId)
      setAvailabilityDraft(data.availability.map((item) => ({
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime.slice(0, 5),
        endTime: item.endTime.slice(0, 5),
        slotMinutes: item.slotMinutes,
        isActive: item.isActive
      })))
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const addAvailabilityRow = () => {
    setAvailabilityDraft((prev) => [
      ...prev,
      {
        dayOfWeek: Number(availabilityForm.dayOfWeek),
        startTime: availabilityForm.startTime,
        endTime: availabilityForm.endTime,
        slotMinutes: Number(availabilityForm.slotMinutes),
        isActive: true
      }
    ])
  }

  const saveAvailability = async () => {
    if (!availabilityDoctorId || availabilityDraft.length === 0) return
    setError('')
    try {
      await doctorsService.updateAvailability(availabilityDoctorId, availabilityDraft)
      setMessage('Disponibilidad actualizada')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  return (
    <div className='space-y-6'>
      <Card className='space-y-1'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Panel Admin</h1>
        <p className='text-sm text-emerald-900/80'>CRUD de especialidades, medicos, disponibilidades y trazabilidad operativa.</p>
      </Card>

      <div className='grid gap-6 xl:grid-cols-2'>
        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Especialidades</h2>
          <form className='grid gap-2 sm:grid-cols-2' onSubmit={handleCreateSpecialty}>
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
            <Button type='submit' className='sm:col-span-2'>Crear especialidad</Button>
          </form>

          <div className='space-y-2'>
            {specialties.map((specialty) => (
              <div key={specialty.id} className='flex items-center justify-between rounded-xl bg-white/70 p-3 text-sm'>
                <div>
                  <p className='font-semibold text-emerald-950'>{specialty.name}</p>
                  <p className='text-xs text-emerald-900/70'>${specialty.fee}</p>
                </div>
                <Button variant='danger' className='px-3 py-1.5 text-xs' onClick={() => handleDeleteSpecialty(specialty.id)}>
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Medicos</h2>
          <form className='grid gap-2 sm:grid-cols-2' onSubmit={handleCreateDoctor}>
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
            <Button type='submit' className='sm:col-span-2'>Crear medico</Button>
          </form>

          <div className='space-y-2'>
            {doctors.map((doctor) => (
              <div key={doctor.id} className='flex items-center justify-between rounded-xl bg-white/70 p-3 text-sm'>
                <div>
                  <p className='font-semibold text-emerald-950'>{doctor.fullName}</p>
                  <p className='text-xs text-emerald-900/70'>{doctor.email}</p>
                  <p className='text-xs text-emerald-900/70'>DNI: {doctor.dni || '-'}</p>
                  <p className='text-xs text-emerald-900/70'>Consultorio: {doctor.consultorio}</p>
                </div>
                <Button variant='danger' className='px-3 py-1.5 text-xs' onClick={() => handleDeleteDoctor(doctor.id)}>
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-emerald-950'>Obras sociales</h2>
        <form className='grid gap-2 sm:grid-cols-3' onSubmit={handleCreateInsurance}>
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
          <Button type='submit' className='self-end'>Crear obra social</Button>
        </form>

        <div className='space-y-2'>
          {insurances.map((insurance) => (
            <div key={insurance.id} className='flex items-center justify-between rounded-xl bg-white/70 p-3 text-sm'>
              <div>
                <p className='font-semibold text-emerald-950'>{insurance.name}</p>
                <p className='text-xs text-emerald-900/70'>Descuento: {insurance.discountPercent}%</p>
                <p className='text-xs text-emerald-900/70'>Estado: {insurance.isActive ? 'Activa' : 'Inactiva'}</p>
              </div>
              <Button variant='danger' className='px-3 py-1.5 text-xs' onClick={() => handleDeleteInsurance(insurance.id)}>
                Eliminar
              </Button>
            </div>
          ))}
          {insurances.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay obras sociales cargadas.</p> : null}
        </div>
      </Card>

      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-emerald-950'>Disponibilidad por medico</h2>
        <label className='space-y-1'>
          <span className='text-xs text-emerald-900/75'>Medico</span>
          <select className='glass-input' value={availabilityDoctorId} onChange={(event) => handleLoadAvailability(event.target.value)}>
            <option value=''>Seleccionar</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
            ))}
          </select>
        </label>
        <div className='grid gap-2 sm:grid-cols-4'>
          <label className='space-y-1'>
            <span className='text-xs text-emerald-900/75'>Dia</span>
            <select
              className='glass-input'
              value={availabilityForm.dayOfWeek}
              onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, dayOfWeek: event.target.value }))}
            >
              {dayLabels.map((label, index) => (
                <option key={label} value={index}>{label}</option>
              ))}
            </select>
          </label>
          <Input label='Inicio' type='time' value={availabilityForm.startTime} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, startTime: event.target.value }))} />
          <Input label='Fin' type='time' value={availabilityForm.endTime} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, endTime: event.target.value }))} />
          <Input label='Slot (min)' type='number' value={availabilityForm.slotMinutes} onChange={(event) => setAvailabilityForm((prev) => ({ ...prev, slotMinutes: event.target.value }))} />
        </div>
        <div className='flex gap-2'>
          <Button variant='secondary' onClick={addAvailabilityRow}>Agregar rango</Button>
          <Button onClick={saveAvailability}>Guardar disponibilidad</Button>
        </div>
        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {availabilityDraft.map((item, index) => (
            <div key={`${item.dayOfWeek}-${item.startTime}-${index}`} className='rounded-xl bg-white/70 p-3 text-xs text-emerald-900/80'>
              {dayLabels[item.dayOfWeek]} {item.startTime} - {item.endTime} ({item.slotMinutes} min)
            </div>
          ))}
        </div>
      </Card>

      {message ? <p className='text-sm text-emerald-700'>{message}</p> : null}
      {error ? <p className='text-sm text-red-600'>{error}</p> : null}
    </div>
  )
}
