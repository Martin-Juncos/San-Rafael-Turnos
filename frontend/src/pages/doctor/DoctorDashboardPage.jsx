import { useEffect, useState } from 'react'
import { appointmentsService } from '../../api/services'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ActionResultModal } from '../../components/ui/ActionResultModal'

export function DoctorDashboardPage () {
  const [appointments, setAppointments] = useState([])
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [messages, setMessages] = useState([])
  const [noteDraft, setNoteDraft] = useState('')
  const [chatDraft, setChatDraft] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    type: 'success',
    title: '',
    description: ''
  })

  const loadAppointments = async () => {
    const data = await appointmentsService.list({ pageSize: 50 })
    setAppointments(data.items)
  }

  useEffect(() => {
    loadAppointments().catch((apiError) => setError(apiError.message))
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

  const updateStatus = async (appointmentId, status) => {
    setError('')
    setMessage('')
    try {
      await appointmentsService.update(appointmentId, { status })
      await loadAppointments()
      const labels = {
        attended: 'atendido',
        no_show: 'ausente',
        cancelled: 'cancelado'
      }
      setMessage(`El turno fue actualizado a estado "${labels[status] || status}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const saveNotes = async () => {
    if (!selectedAppointmentId) return
    setError('')
    setMessage('')
    try {
      await appointmentsService.update(selectedAppointmentId, {
        doctorNotes: noteDraft
      })
      await loadAppointments()
      setMessage('La nota interna del turno fue guardada correctamente.')
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
      <Card className='space-y-1'>
        <h1 className='text-2xl font-semibold text-emerald-950'>Panel Medico</h1>
        <p className='text-sm text-emerald-900/80'>Agenda diaria/semanal, estado de atencion y mensajeria por turno confirmado.</p>
      </Card>

      <div className='grid gap-6 xl:grid-cols-[1.2fr_1fr]'>
        <Card className='space-y-3'>
          <h2 className='text-lg font-semibold text-emerald-950'>Mis turnos</h2>
          <div className='space-y-2'>
            {appointments.map((appointment) => (
              <div key={appointment.id} className='rounded-xl bg-white/70 p-3 text-sm'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <p className='font-semibold text-emerald-950'>
                      {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                    </p>
                    <p className='text-xs text-emerald-900/75'>Estado: {appointment.status}</p>
                  </div>
                  <button
                    type='button'
                    className='rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs'
                    onClick={() => {
                      setSelectedAppointmentId(appointment.id)
                      setNoteDraft(appointment.doctorNotes || '')
                    }}
                  >
                    Gestionar
                  </button>
                </div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  <Button className='px-3 py-1.5 text-xs' onClick={() => updateStatus(appointment.id, 'attended')}>Atendido</Button>
                  <Button variant='secondary' className='px-3 py-1.5 text-xs' onClick={() => updateStatus(appointment.id, 'no_show')}>Ausente</Button>
                </div>
              </div>
            ))}
            {appointments.length === 0 ? <p className='text-sm text-emerald-900/75'>No hay turnos asignados.</p> : null}
          </div>
        </Card>

        <Card className='space-y-4'>
          <h2 className='text-lg font-semibold text-emerald-950'>Detalle y notas</h2>
          <label className='space-y-1 block'>
            <span className='text-xs text-emerald-900/75'>Turno seleccionado</span>
            <select
              className='glass-input'
              value={selectedAppointmentId}
              onChange={(event) => {
                const nextId = event.target.value
                setSelectedAppointmentId(nextId)
                const selected = appointments.find((item) => item.id === nextId)
                setNoteDraft(selected?.doctorNotes || '')
              }}
            >
              <option value=''>Seleccionar</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.date} {appointment.startTime.slice(0, 5)} - {appointment.patient?.fullName}
                </option>
              ))}
            </select>
          </label>
          <Input
            label='Nota interna'
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
          />
          <Button onClick={saveNotes}>Guardar nota</Button>

          <div className='space-y-2 rounded-xl border border-emerald-200 bg-white/70 p-3'>
            <h3 className='text-sm font-semibold text-emerald-950'>Mensajeria del turno</h3>
            <div className='max-h-56 space-y-1 overflow-auto text-xs'>
              {messages.map((item) => (
                <p key={item.id}>
                  <span className='font-semibold'>{item.senderRole}:</span> {item.body}
                </p>
              ))}
              {messages.length === 0 ? <p className='text-emerald-900/70'>Sin mensajes.</p> : null}
            </div>
            <form className='space-y-2' onSubmit={sendMessage}>
              <Input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder='Escribe un mensaje...' />
              <Button type='submit'>Enviar</Button>
            </form>
          </div>
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
