import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ActionResultModal } from '../../components/ui/ActionResultModal'
import { doctorsService, insurancesService, secretariesService, specialtiesService } from '../../api/services'

const dayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

export function AdminDashboardPage () {
  const [specialties, setSpecialties] = useState([])
  const [insurances, setInsurances] = useState([])
  const [doctors, setDoctors] = useState([])
  const [secretaries, setSecretaries] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })

  const [specialtyForm, setSpecialtyForm] = useState({
    name: '',
    description: '',
    fee: 15000
  })
  const [editingSpecialtyId, setEditingSpecialtyId] = useState('')
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
  const [editingDoctorId, setEditingDoctorId] = useState('')
  const [secretaryForm, setSecretaryForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    dni: '',
    doctorId: ''
  })
  const [editingSecretaryId, setEditingSecretaryId] = useState('')

  const [availabilityDoctorId, setAvailabilityDoctorId] = useState('')
  const [availabilityDraft, setAvailabilityDraft] = useState([])
  const [availabilityForm, setAvailabilityForm] = useState({
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '13:00',
    slotMinutes: '30'
  })

  const load = async () => {
    const [specialtyResult, insurancesResult, doctorsResult, secretariesResult] = await Promise.all([
      specialtiesService.list({ pageSize: 100, isActive: 'true' }),
      insurancesService.list({ pageSize: 100 }),
      doctorsService.list({ pageSize: 100 }),
      secretariesService.list({ pageSize: 100 })
    ])
    setSpecialties(specialtyResult.items)
    setInsurances(insurancesResult.items)
    setDoctors(doctorsResult.items)
    setSecretaries(secretariesResult.items)
  }

  useEffect(() => {
    load().catch((apiError) => setError(apiError.message))
  }, [])

  useEffect(() => {
    if (!message) return
    setFeedbackModal({
      open: true,
      type: 'success',
      title: 'Operacion completada',
      description: message
    })
  }, [message])

  useEffect(() => {
    if (!error) return
    setFeedbackModal({
      open: true,
      type: 'error',
      title: 'No se pudo completar la operacion',
      description: error
    })
  }, [error])

  const closeFeedbackModal = () => {
    setFeedbackModal((prev) => ({ ...prev, open: false }))
    setMessage('')
    setError('')
  }

  const resetSpecialtyForm = () => {
    setSpecialtyForm({ name: '', description: '', fee: 15000 })
    setEditingSpecialtyId('')
  }

  const handleSubmitSpecialty = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const specialtyName = specialtyForm.name.trim()
    const specialtyFee = Number(specialtyForm.fee)
    const payload = {
      name: specialtyName,
      description: specialtyForm.description.trim(),
      fee: specialtyFee
    }

    try {
      if (editingSpecialtyId) {
        await specialtiesService.update(editingSpecialtyId, payload)
        setMessage(`Se actualizo la especialidad "${specialtyName}" con arancel $${specialtyFee}.`)
      } else {
        await specialtiesService.create(payload)
        setMessage(`Se creo la especialidad "${specialtyName}" con arancel $${specialtyFee}.`)
      }
      resetSpecialtyForm()
      await load()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const resetDoctorForm = () => {
    setDoctorForm({ fullName: '', email: '', phone: '', dni: '', consultorio: '', specialtyId: '' })
    setEditingDoctorId('')
  }

  const resetSecretaryForm = () => {
    setSecretaryForm({ fullName: '', email: '', phone: '', dni: '', doctorId: '' })
    setEditingSecretaryId('')
  }

  const handleSubmitDoctor = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const doctorName = doctorForm.fullName.trim()
    const doctorEmail = doctorForm.email.trim()
    const payload = {
      fullName: doctorName,
      email: doctorEmail,
      phone: doctorForm.phone.trim(),
      specialtyId: doctorForm.specialtyId,
      consultorio: Number(doctorForm.consultorio)
    }
    if (doctorForm.dni) {
      payload.dni = doctorForm.dni.replace(/\D/g, '')
    }

    try {
      if (editingDoctorId) {
        await doctorsService.update(editingDoctorId, payload)
        setMessage(`Se actualizo el medico ${doctorName}.`)
      } else {
        await doctorsService.create(payload)
        setMessage(`Se creo el medico ${doctorName}. Credenciales iniciales: ${doctorEmail} + DNI.`)
      }
      resetDoctorForm()
      await load()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleSubmitSecretary = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const secretaryName = secretaryForm.fullName.trim()
    const secretaryEmail = secretaryForm.email.trim()
    const payload = {
      fullName: secretaryName,
      email: secretaryEmail,
      phone: secretaryForm.phone.trim(),
      doctorId: secretaryForm.doctorId
    }
    if (secretaryForm.dni) {
      payload.dni = secretaryForm.dni.replace(/\D/g, '')
    }

    try {
      if (editingSecretaryId) {
        await secretariesService.update(editingSecretaryId, payload)
        setMessage(`Se actualizo la secretaria ${secretaryName}.`)
      } else {
        await secretariesService.create(payload)
        setMessage(`Se creo la secretaria ${secretaryName}. Credenciales iniciales: ${secretaryEmail} + DNI.`)
      }
      resetSecretaryForm()
      await load()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleCreateInsurance = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const insuranceName = insuranceForm.name.trim()
    const discountPercent = Number(insuranceForm.discountPercent)
    try {
      await insurancesService.create({
        name: insuranceName,
        discountPercent
      })
      setInsuranceForm({ name: '', discountPercent: 0 })
      await load()
      setMessage(`Obra social "${insuranceName}" guardada con descuento ${discountPercent}%.`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleDeleteSpecialty = async (id) => {
    setError('')
    setMessage('')
    const specialtyName = specialties.find((item) => item.id === id)?.name
    try {
      await specialtiesService.remove(id)
      if (editingSpecialtyId === id) {
        resetSpecialtyForm()
      }
      await load()
      setMessage(`Se elimino la especialidad "${specialtyName || 'seleccionada'}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleEditSpecialty = (specialty) => {
    setEditingSpecialtyId(specialty.id)
    setSpecialtyForm({
      name: specialty.name || '',
      description: specialty.description || '',
      fee: Number(specialty.fee || 0)
    })
  }

  const handleDeleteDoctor = async (id) => {
    setError('')
    setMessage('')
    const doctorName = doctors.find((item) => item.id === id)?.fullName
    try {
      await doctorsService.remove(id)
      if (editingDoctorId === id) {
        resetDoctorForm()
      }
      await load()
      setMessage(`Se elimino el medico "${doctorName || 'seleccionado'}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleEditDoctor = (doctor) => {
    setEditingDoctorId(doctor.id)
    setDoctorForm({
      fullName: doctor.fullName || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      dni: doctor.dni || '',
      consultorio: String(doctor.consultorio || ''),
      specialtyId: doctor.specialtyId || ''
    })
  }

  const handleDeleteSecretary = async (id) => {
    setError('')
    setMessage('')
    const secretaryName = secretaries.find((item) => item.id === id)?.fullName || secretaries.find((item) => item.id === id)?.email
    try {
      await secretariesService.remove(id)
      if (editingSecretaryId === id) {
        resetSecretaryForm()
      }
      await load()
      setMessage(`Se elimino la secretaria "${secretaryName || 'seleccionada'}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const handleEditSecretary = (secretary) => {
    setEditingSecretaryId(secretary.id)
    setSecretaryForm({
      fullName: secretary.fullName || '',
      email: secretary.email || '',
      phone: secretary.phone || '',
      dni: secretary.dni || '',
      doctorId: secretary.doctorId || ''
    })
  }

  const handleDeleteInsurance = async (id) => {
    setError('')
    setMessage('')
    const insuranceName = insurances.find((item) => item.id === id)?.name
    try {
      await insurancesService.remove(id)
      await load()
      setMessage(`Se elimino la obra social "${insuranceName || 'seleccionada'}".`)
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
    setMessage('')
    const doctorName = doctors.find((item) => item.id === availabilityDoctorId)?.fullName
    try {
      await doctorsService.updateAvailability(availabilityDoctorId, availabilityDraft)
      setMessage(`Disponibilidad actualizada para ${doctorName || 'el medico seleccionado'}.`)
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
              <div className='flex gap-2'>
                <Button variant='secondary' className='px-3 py-1.5 text-xs' onClick={() => handleEditSpecialty(specialty)}>
                  Modificar
                </Button>
                <Button variant='danger' className='px-3 py-1.5 text-xs' onClick={() => handleDeleteSpecialty(specialty.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className='grid gap-6 xl:grid-cols-2'>
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
              <div key={doctor.id} className='space-y-3 rounded-xl bg-white/70 p-3 text-sm'>
                <div>
                  <p className='font-semibold text-emerald-950'>{doctor.fullName}</p>
                  <p className='text-xs text-emerald-900/70'>{doctor.email}</p>
                  <p className='text-xs text-emerald-900/70'>DNI: {doctor.dni || '-'}</p>
                  <p className='text-xs text-emerald-900/70'>Consultorio: {doctor.consultorio}</p>
                </div>
                <div className='flex gap-2'>
                  <Button variant='secondary' className='px-3 py-1.5 text-xs' onClick={() => handleEditDoctor(doctor)}>
                    Modificar
                  </Button>
                  <Button variant='danger' className='px-3 py-1.5 text-xs' onClick={() => handleDeleteDoctor(doctor.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
            {doctors.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay medicos cargados.</p> : null}
          </div>
        </Card>

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
              <div key={secretary.id} className='space-y-3 rounded-xl bg-white/70 p-3 text-sm'>
                <div>
                  <p className='font-semibold text-emerald-950'>{secretary.fullName || secretary.email}</p>
                  <p className='text-xs text-emerald-900/70'>{secretary.email}</p>
                  <p className='text-xs text-emerald-900/70'>Telefono: {secretary.phone || '-'}</p>
                  <p className='text-xs text-emerald-900/70'>DNI: {secretary.dni || '-'}</p>
                  <p className='text-xs text-emerald-900/70'>Medico: {secretary.doctor?.fullName || '-'}</p>
                </div>
                <div className='flex gap-2'>
                  <Button variant='secondary' className='px-3 py-1.5 text-xs' onClick={() => handleEditSecretary(secretary)}>
                    Modificar
                  </Button>
                  <Button variant='danger' className='px-3 py-1.5 text-xs' onClick={() => handleDeleteSecretary(secretary.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
            {secretaries.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay secretarias cargadas.</p> : null}
          </div>
        </Card>
      </div>

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

      <ActionResultModal
        open={feedbackModal.open}
        type={feedbackModal.type}
        title={feedbackModal.title}
        description={feedbackModal.description}
        onClose={closeFeedbackModal}
      />
    </div>
  )
}
