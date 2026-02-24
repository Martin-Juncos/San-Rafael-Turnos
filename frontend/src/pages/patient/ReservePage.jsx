import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { appointmentsService, doctorsService, insurancesService, paymentsService, slotsService, specialtiesService } from '../../api/services'
import { useAppSelector } from '../../app/hooks'
import { selectAuth } from '../../features/auth/authSlice'

export function ReservePage () {
  const auth = useAppSelector(selectAuth)
  const [specialties, setSpecialties] = useState([])
  const [insurances, setInsurances] = useState([])
  const [doctors, setDoctors] = useState([])
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [holdResult, setHoldResult] = useState(null)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [form, setForm] = useState({
    specialtyId: '',
    doctorId: '',
    insuranceId: '',
    date: today,
    startTime: '',
    fullName: auth.patient?.fullName || '',
    dni: auth.patient?.dni || '',
    phone: auth.patient?.phone || '',
    symptoms: ''
  })

  useEffect(() => {
    const load = async () => {
      const [specResult, insuranceResult, doctorsResult] = await Promise.all([
        specialtiesService.list({ pageSize: 100 }),
        insurancesService.list({ pageSize: 100, isActive: 'true' }),
        doctorsService.list({ pageSize: 100 })
      ])
      setSpecialties(specResult.items)
      setInsurances(insuranceResult.items)
      setDoctors(doctorsResult.items)
    }
    load().catch((apiError) => setError(apiError.message))
  }, [])

  const filteredDoctors = useMemo(() => {
    if (!form.specialtyId) return doctors
    return doctors.filter((doctor) => doctor.specialtyId === form.specialtyId)
  }, [doctors, form.specialtyId])

  const searchSlots = async () => {
    if (!form.doctorId || !form.date) return
    setError('')
    setLoadingSlots(true)
    try {
      const data = await slotsService.list({ doctorId: form.doctorId, date: form.date })
      setSlots(data.slots)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setLoadingSlots(false)
    }
  }

  const createHold = async () => {
    setError('')
    setSuccess('')
    if (auth.role !== 'patient') {
      setError('Para reservar debes ingresar como paciente con OTP.')
      return
    }
    try {
      const payload = {
        ...form,
        insuranceId: form.insuranceId || undefined
      }
      const data = await appointmentsService.create(payload)
      setHoldResult(data)
      setSuccess('Turno en HOLD creado. Confirma pago para reservar definitivamente.')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const confirmPayment = async () => {
    if (!holdResult?.appointment?.id) return
    setError('')
    try {
      await paymentsService.confirmMock(holdResult.appointment.id)
      setSuccess('Pago confirmado. Turno confirmado y notificacion enviada.')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  return (
    <div className='space-y-6'>
      <Card className='space-y-4'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Reserva de turnos</h1>
        <p className='text-sm text-emerald-900/80'>
          Flujo: especialidad {'->'} medico {'->'} fecha {'->'} slot {'->'} hold {'->'} pago {'->'} confirmacion.
        </p>
      </Card>

      <div className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
        <Card className='space-y-3'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='space-y-1 text-sm'>
              <span className='text-xs text-emerald-900/75'>Especialidad</span>
              <select
                className='glass-input'
                value={form.specialtyId}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, specialtyId: event.target.value, doctorId: '', startTime: '' }))
                  setSlots([])
                }}
              >
                <option value=''>Seleccionar</option>
                {specialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                ))}
              </select>
            </label>

            <label className='space-y-1 text-sm'>
              <span className='text-xs text-emerald-900/75'>Medico</span>
              <select
                className='glass-input'
                value={form.doctorId}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, doctorId: event.target.value, startTime: '' }))
                  setSlots([])
                }}
              >
                <option value=''>Seleccionar</option>
                {filteredDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                ))}
              </select>
            </label>

            <label className='space-y-1 text-sm sm:col-span-2'>
              <span className='text-xs text-emerald-900/75'>Obra social (opcional)</span>
              <select
                className='glass-input'
                value={form.insuranceId}
                onChange={(event) => setForm((prev) => ({ ...prev, insuranceId: event.target.value }))}
              >
                <option value=''>Particular (sin descuento)</option>
                {insurances.map((insurance) => (
                  <option key={insurance.id} value={insurance.id}>
                    {insurance.name} - {insurance.discountPercent}% desc.
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className='grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end'>
            <Input
              type='date'
              label='Fecha'
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value, startTime: '' }))}
            />
            <Button onClick={searchSlots} disabled={loadingSlots || !form.doctorId}>
              {loadingSlots ? 'Buscando...' : 'Buscar slots'}
            </Button>
          </div>

          <div className='flex flex-wrap gap-2'>
            {slots.length === 0
              ? <span className='text-xs text-emerald-900/70'>Sin slots cargados para la seleccion actual.</span>
              : slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type='button'
                    onClick={() => setForm((prev) => ({ ...prev, startTime: slot.startTime }))}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      form.startTime === slot.startTime
                        ? 'border-brand-500 bg-brand-100 text-brand-800'
                        : 'border-emerald-200 bg-white/70 text-emerald-900/75 hover:bg-emerald-100'
                    }`}
                  >
                    {slot.startTime.slice(0, 5)}
                  </button>
                ))}
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <Input
              label='Nombre completo'
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
            <Input
              label='DNI'
              value={form.dni}
              onChange={(event) => setForm((prev) => ({ ...prev, dni: event.target.value }))}
            />
            <Input
              label='Telefono'
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <Input
              label='Motivo / sintomas'
              value={form.symptoms}
              onChange={(event) => setForm((prev) => ({ ...prev, symptoms: event.target.value }))}
            />
          </div>

          <Button onClick={createHold} disabled={!form.startTime}>Crear HOLD</Button>
          {holdResult?.appointment?.id ? (
            <Button variant='secondary' onClick={confirmPayment}>
              Confirmar pago mock y turno
            </Button>
          ) : null}

          {!auth.token && (
            <p className='text-xs text-amber-700'>
              Debes <Link to='/ingresar' className='underline'>iniciar sesion</Link> como paciente para confirmar la reserva.
            </p>
          )}
        </Card>

        <Card className='space-y-2'>
          <h2 className='text-lg font-semibold text-emerald-950'>Estado de reserva</h2>
          {holdResult
            ? (
              <div className='space-y-1 text-sm text-emerald-900/80'>
                <p>Turno: {holdResult.appointment.id}</p>
                <p>Estado: {holdResult.appointment.status}</p>
                <p>Pago: {holdResult.payment.status}</p>
                <p>Monto: ${holdResult.payment.amount}</p>
                {holdResult.pricing
                  ? (
                    <>
                      <p>Arancel base: ${holdResult.pricing.baseAmount}</p>
                      <p>Descuento aplicado: {holdResult.pricing.discountPercent}%</p>
                      <p>Monto final: ${holdResult.pricing.finalAmount}</p>
                    </>
                    )
                  : null}
              </div>
              )
            : <p className='text-sm text-emerald-900/70'>Aun no hay un turno en HOLD.</p>}
          {success ? <p className='text-sm text-emerald-700'>{success}</p> : null}
          {error ? <p className='text-sm text-red-600'>{error}</p> : null}
        </Card>
      </div>
    </div>
  )
}
