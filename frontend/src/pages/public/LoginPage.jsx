import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { authService, patientAuthService } from '../../api/services'
import { useAppDispatch } from '../../app/hooks'
import {
  setError,
  setLoading,
  setPatientSession,
  setStaffSession
} from '../../features/auth/authSlice'

const rolePath = {
  admin: '/dashboard/admin',
  clinic: '/dashboard/clinica',
  doctor: '/dashboard/medico',
  patient: '/dashboard/paciente'
}

export function LoginPage () {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [tab, setTab] = useState('staff')
  const [error, setLocalError] = useState('')

  const [staffForm, setStaffForm] = useState({ email: 'admin@mail.com', password: 'admin' })
  const [patientForm, setPatientForm] = useState({ fullName: '', dni: '', phone: '' })

  const submitStaff = async (event) => {
    event.preventDefault()
    setLocalError('')
    dispatch(setLoading())
    try {
      const data = await authService.login(staffForm)
      dispatch(setStaffSession(data))
      navigate(rolePath[data.user.role] || '/')
    } catch (apiError) {
      const message = apiError.message || 'No se pudo iniciar sesion'
      dispatch(setError(message))
      setLocalError(message)
    }
  }

  const submitPatient = async (event) => {
    event.preventDefault()
    setLocalError('')
    try {
      const data = await patientAuthService.login(patientForm)
      dispatch(setPatientSession(data))
      navigate('/reservar')
    } catch (apiError) {
      setLocalError(apiError.message || 'No se pudo ingresar como paciente')
    }
  }

  return (
    <div className='mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.1fr_1fr]'>
      <Card className='space-y-4'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Ingresar</h1>
        <p className='text-sm text-emerald-900/75'>
          Acceso para Administracion, Clinica, Medicos y Pacientes.
        </p>
        <div className='flex gap-2 rounded-xl bg-white/70 p-1'>
          <button
            type='button'
            onClick={() => setTab('staff')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'staff' ? 'bg-brand-600 text-white' : 'text-emerald-900/80'}`}
          >
            Staff
          </button>
          <button
            type='button'
            onClick={() => setTab('patient')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'patient' ? 'bg-brand-600 text-white' : 'text-emerald-900/80'}`}
          >
            Paciente
          </button>
        </div>

        {tab === 'staff' && (
          <form className='space-y-3' onSubmit={submitStaff}>
            <Input
              label='Correo'
              type='email'
              value={staffForm.email}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <Input
              label='Clave'
              type='password'
              value={staffForm.password}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            <Button type='submit' className='w-full'>Ingresar</Button>
          </form>
        )}

        {tab === 'patient' && (
          <form className='space-y-3' onSubmit={submitPatient}>
            <Input
              label='Nombre completo'
              value={patientForm.fullName}
              onChange={(event) => setPatientForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
            <Input
              label='DNI'
              value={patientForm.dni}
              onChange={(event) => setPatientForm((prev) => ({ ...prev, dni: event.target.value.replace(/\D/g, '') }))}
            />
            <Input
              label='Telefono'
              value={patientForm.phone}
              onChange={(event) => setPatientForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <Button type='submit' className='w-full'>Ingresar como paciente</Button>
          </form>
        )}

        {error ? <p className='text-sm text-red-600'>{error}</p> : null}
      </Card>

      <Card className='space-y-3'>
        <h2 className='text-lg font-semibold text-emerald-950'>Credenciales demo MVP</h2>
        <ul className='space-y-2 text-sm text-emerald-900/80'>
          <li>Admin: admin@mail.com / admin</li>
          <li>Clinica: clinica@mail.com / clinica</li>
          <li>Medico: medico@mail.com / 30111222 (DNI)</li>
        </ul>
        <p className='text-xs text-emerald-900/80'>
          Pacientes: ingreso directo con nombre, DNI y telefono (sin OTP).
        </p>
      </Card>
    </div>
  )
}
