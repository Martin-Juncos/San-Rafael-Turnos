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
  secretary: '/dashboard/medico',
  patient: '/dashboard/paciente'
}

export function LoginPage () {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [tab, setTab] = useState('patient')
  const [error, setLocalError] = useState('')

  const [staffForm, setStaffForm] = useState({ email: 'admin@mail.com', password: 'admin' })
  const [patientForm, setPatientForm] = useState({
    fullName: '',
    dni: '',
    phone: '',
    streetAndNumber: '',
    city: ''
  })
  const [patientLookupLoading, setPatientLookupLoading] = useState(false)
  const [patientLookupDone, setPatientLookupDone] = useState(false)
  const [patientExists, setPatientExists] = useState(false)

  const normalizeDni = (value) => String(value || '').replace(/\D/g, '')

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

  const submitPatientLookup = async (event) => {
    event.preventDefault()
    setLocalError('')

    const dni = normalizeDni(patientForm.dni)
    if (dni.length < 6 || dni.length > 12) {
      setLocalError('Ingresa un DNI valido para continuar.')
      return
    }

    setPatientLookupLoading(true)
    try {
      const result = await patientAuthService.prefillByDni(dni)
      const exists = Boolean(result?.exists && result?.patient)
      setPatientLookupDone(true)
      setPatientExists(exists)
      setPatientForm((prev) => ({
        ...prev,
        dni,
        fullName: exists ? (result.patient.fullName || '') : '',
        phone: exists ? (result.patient.phone || '') : '',
        streetAndNumber: exists ? (result.patient.streetAndNumber || '') : '',
        city: exists ? (result.patient.city || '') : ''
      }))
    } catch (apiError) {
      setLocalError(apiError.message || 'No se pudo verificar el DNI')
    } finally {
      setPatientLookupLoading(false)
    }
  }

  const submitPatient = async (event) => {
    event.preventDefault()
    setLocalError('')

    const payload = {
      fullName: patientForm.fullName.trim(),
      dni: normalizeDni(patientForm.dni),
      phone: patientForm.phone.trim(),
      streetAndNumber: patientForm.streetAndNumber.trim(),
      city: patientForm.city.trim()
    }

    if (!payload.fullName || payload.fullName.length < 3) {
      setLocalError('Completa un nombre valido.')
      return
    }
    if (payload.dni.length < 6 || payload.dni.length > 12) {
      setLocalError('DNI invalido.')
      return
    }
    if (!payload.phone || payload.phone.length < 8) {
      setLocalError('Completa un telefono valido.')
      return
    }
    if (!patientExists && (!payload.streetAndNumber || payload.streetAndNumber.length < 3)) {
      setLocalError('Completa calle y numero para continuar.')
      return
    }
    if (!patientExists && (!payload.city || payload.city.length < 2)) {
      setLocalError('Completa la ciudad para continuar.')
      return
    }

    dispatch(setLoading())
    try {
      const data = await patientAuthService.login({
        fullName: payload.fullName,
        dni: payload.dni,
        phone: payload.phone,
        streetAndNumber: payload.streetAndNumber || undefined,
        city: payload.city || undefined
      })
      dispatch(setPatientSession(data))
      navigate('/dashboard/paciente')
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
            onClick={() => {
              setTab('patient')
              setLocalError('')
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'patient' ? 'bg-brand-600 text-white' : 'text-emerald-900/80'}`}
          >
            Paciente
          </button>
          <button
            type='button'
            onClick={() => {
              setTab('staff')
              setLocalError('')
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${tab === 'staff' ? 'bg-brand-600 text-white' : 'text-emerald-900/80'}`}
          >
            Staff
          </button>
        </div>

        {tab === 'patient' && (
          !patientLookupDone
            ? (
              <form className='space-y-3' onSubmit={submitPatientLookup}>
                <Input
                  label='DNI'
                  value={patientForm.dni}
                  onChange={(event) => {
                    const dni = normalizeDni(event.target.value)
                    setPatientForm({
                      fullName: '',
                      dni,
                      phone: '',
                      streetAndNumber: '',
                      city: ''
                    })
                    setPatientLookupDone(false)
                    setPatientExists(false)
                  }}
                  placeholder='Solo numeros'
                />
                <Button type='submit' className='w-full' disabled={patientLookupLoading}>
                  {patientLookupLoading ? 'Verificando...' : 'Continuar'}
                </Button>
              </form>
              )
            : (
              <form className='space-y-3' onSubmit={submitPatient}>
                <p className='rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 text-xs text-emerald-900/75'>
                  {patientExists
                    ? 'Encontramos tu paciente. Revisa tus datos y continua.'
                    : 'No encontramos ese DNI. Completa tus datos para ingresar por primera vez.'}
                </p>
                <Input
                  label='DNI'
                  value={patientForm.dni}
                  disabled
                />
                <Input
                  label='Nombre completo'
                  value={patientForm.fullName}
                  onChange={(event) => setPatientForm((prev) => ({ ...prev, fullName: event.target.value }))}
                />
                <Input
                  label='Telefono'
                  value={patientForm.phone}
                  onChange={(event) => setPatientForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
                <Input
                  label='Calle y numero'
                  value={patientForm.streetAndNumber}
                  onChange={(event) => setPatientForm((prev) => ({ ...prev, streetAndNumber: event.target.value }))}
                />
                <Input
                  label='Ciudad'
                  value={patientForm.city}
                  onChange={(event) => setPatientForm((prev) => ({ ...prev, city: event.target.value }))}
                />
                <div className='grid gap-2 sm:grid-cols-2'>
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={() => {
                      setPatientForm({
                        fullName: '',
                        dni: '',
                        phone: '',
                        streetAndNumber: '',
                        city: ''
                      })
                      setPatientLookupDone(false)
                      setPatientExists(false)
                      setLocalError('')
                    }}
                  >
                    Cambiar DNI
                  </Button>
                  <Button type='submit'>Ingresar como paciente</Button>
                </div>
              </form>
              )
        )}

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

        {error ? <p className='text-sm text-red-600' role='alert' aria-live='assertive'>{error}</p> : null}
      </Card>

      <Card className='space-y-3'>
        <h2 className='text-lg font-semibold text-emerald-950'>Credenciales demo MVP</h2>
        <ul className='space-y-2 text-sm text-emerald-900/80'>
          <li>Admin: admin@mail.com / admin</li>
          <li>Clinica: clinica@mail.com / clinica</li>
          <li>Medico: medico@mail.com / 30111222 (DNI)</li>
        </ul>
        <p className='text-xs text-emerald-900/80'>
          Pacientes: primero DNI, luego autocompleta si existe o solicita datos para primer ingreso.
        </p>
      </Card>
    </div>
  )
}
