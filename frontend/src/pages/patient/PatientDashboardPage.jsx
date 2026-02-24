import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { appointmentsService, paymentsService } from '../../api/services'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ActionResultModal } from '../../components/ui/ActionResultModal'

export function PatientDashboardPage () {
  const [appointments, setAppointments] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [chatDraft, setChatDraft] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })

  const load = async () => {
    const result = await appointmentsService.listMy({ pageSize: 50 })
    setAppointments(result.items)
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

  useEffect(() => {
    if (!selectedAppointmentId) {
      setMessages([])
      return
    }
    appointmentsService.listMessages(selectedAppointmentId)
      .then((result) => setMessages(result))
      .catch((apiError) => setError(apiError.message))
  }, [selectedAppointmentId])

  const describeAppointment = (item) => {
    if (!item) return 'seleccionado'
    return `${item.date} a las ${item.startTime.slice(0, 5)}`
  }

  const cancel = async (appointmentId) => {
    setError('')
    setMessage('')
    const selected = appointments.find((item) => item.id === appointmentId)
    try {
      await appointmentsService.cancel(appointmentId, 'cancelled_by_patient')
      await load()
      setMessage(`Tu turno ${describeAppointment(selected)} fue cancelado correctamente.`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const confirmPendingPayment = async (appointmentId) => {
    setError('')
    setMessage('')
    const selected = appointments.find((item) => item.id === appointmentId)
    try {
      await paymentsService.confirmMock(appointmentId)
      await load()
      setMessage(`Pago acreditado. Tu turno ${describeAppointment(selected)} quedo confirmado.`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!selectedAppointmentId || !chatDraft.trim()) return
    try {
      const created = await appointmentsService.sendMessage(selectedAppointmentId, chatDraft)
      setMessages((prev) => [...prev, created])
      setChatDraft('')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  return (
    <div className='space-y-6'>
      <Card className='space-y-2'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Panel Paciente</h1>
        <p className='text-sm text-emerald-900/80'>Mis turnos, comprobantes, cancelaciones y chat con el medico.</p>
        <Link to='/reservar'><Button>Solicitar nuevo turno</Button></Link>
      </Card>

      <div className='grid gap-6 xl:grid-cols-[1.2fr_1fr]'>
        <Card className='space-y-3'>
          <h2 className='text-lg font-semibold text-emerald-950'>Mis turnos</h2>
          <div className='space-y-2'>
            {appointments.map((appointment) => (
              <div key={appointment.id} className='rounded-xl bg-white/70 p-3 text-sm'>
                <p className='font-semibold text-emerald-950'>
                  {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.doctor?.fullName}
                </p>
                <p className='text-xs text-emerald-900/75'>
                  Estado: {appointment.status} | Pago: {appointment.payment?.status}
                </p>
                <div className='mt-2 flex flex-wrap gap-2'>
                  <Button variant='secondary' className='px-3 py-1.5 text-xs' onClick={() => setSelectedAppointmentId(appointment.id)}>
                    Ver chat
                  </Button>
                  <Button variant='danger' className='px-3 py-1.5 text-xs' onClick={() => cancel(appointment.id)}>
                    Cancelar
                  </Button>
                  {appointment.payment?.status === 'pending' ? (
                    <Button className='px-3 py-1.5 text-xs' onClick={() => confirmPendingPayment(appointment.id)}>
                      Pagar (mock)
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {appointments.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay turnos registrados.</p> : null}
          </div>
        </Card>

        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Mensajeria por turno</h2>
          <label className='block space-y-1'>
            <span className='text-xs text-emerald-900/75'>Turno</span>
            <select
              className='glass-input'
              value={selectedAppointmentId}
              onChange={(event) => setSelectedAppointmentId(event.target.value)}
            >
              <option value=''>Seleccionar</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.doctor?.fullName}
                </option>
              ))}
            </select>
          </label>
          <div className='max-h-56 space-y-1 overflow-auto rounded-xl border border-emerald-200 bg-white/70 p-3 text-xs'>
            {messages.map((item) => (
              <p key={item.id}>
                <span className='font-semibold'>{item.senderRole}:</span> {item.body}
              </p>
            ))}
            {messages.length === 0 ? <p className='text-emerald-900/70'>Sin mensajes.</p> : null}
          </div>
          <form className='space-y-2' onSubmit={sendMessage}>
            <Input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder='Escribe tu consulta...' />
            <Button type='submit'>Enviar mensaje</Button>
          </form>
        </Card>
      </div>

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
