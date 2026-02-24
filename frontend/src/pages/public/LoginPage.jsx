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
  const [otpSent, setOtpSent] = useState(null)

  const [staffForm, setStaffForm] = useState({ email: 'admin@mail.com', password: 'admin' })
  const [patientRequest, setPatientRequest] = useState({ dni: '', phone: '' })
  const [patientVerify, setPatientVerify] = useState({ dni: '', code: '' })

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

  const submitPatientRequest = async (event) => {
    event.preventDefault()
    setLocalError('')
    try {
      const data = await patientAuthService.requestOtp(patientRequest)
      setOtpSent(data)
      setPatientVerify((prev) => ({ ...prev, dni: patientRequest.dni }))
    } catch (apiError) {
      setLocalError(apiError.message || 'No se pudo enviar OTP')
    }
  }

  const submitPatientVerify = async (event) => {
    event.preventDefault()
    setLocalError('')
    try {
      const data = await patientAuthService.verifyOtp(patientVerify)
      dispatch(setPatientSession(data))
      navigate('/dashboard/paciente')
    } catch (apiError) {
      setLocalError(apiError.message || 'OTP invalido')
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
            Paciente (OTP)
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
          <div className='space-y-4'>
            <form className='space-y-3' onSubmit={submitPatientRequest}>
              <Input
                label='DNI'
                value={patientRequest.dni}
                onChange={(event) => setPatientRequest((prev) => ({ ...prev, dni: event.target.value }))}
              />
              <Input
                label='Telefono'
                value={patientRequest.phone}
                onChange={(event) => setPatientRequest((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <Button type='submit' className='w-full'>Enviar codigo</Button>
            </form>
            <form className='space-y-3' onSubmit={submitPatientVerify}>
              <Input
                label='DNI'
                value={patientVerify.dni}
                onChange={(event) => setPatientVerify((prev) => ({ ...prev, dni: event.target.value }))}
              />
              <Input
                label='Codigo OTP'
                value={patientVerify.code}
                onChange={(event) => setPatientVerify((prev) => ({ ...prev, code: event.target.value }))}
              />
              <Button type='submit' className='w-full'>Verificar e ingresar</Button>
            </form>
          </div>
        )}

        {error ? <p className='text-sm text-red-600'>{error}</p> : null}
      </Card>

      <Card className='space-y-3'>
        <h2 className='text-lg font-semibold text-emerald-950'>Credenciales demo MVP</h2>
        <ul className='space-y-2 text-sm text-emerald-900/80'>
          <li>Admin: admin@mail.com / admin</li>
          <li>Clinica: clinica@mail.com / clinica</li>
          <li>Medico: medico@mail.com / medico</li>
        </ul>
        {otpSent
          ? (
            <div className='rounded-xl border border-emerald-200 bg-white/70 p-3 text-xs text-emerald-900/80'>
              OTP enviado a {otpSent.phone}. Vence: {new Date(otpSent.expiresAt).toLocaleTimeString('es-AR')}.
              {otpSent.debugCode ? ` Codigo debug: ${otpSent.debugCode}` : ''}
            </div>
            )
          : null}
      </Card>
    </div>
  )
}
