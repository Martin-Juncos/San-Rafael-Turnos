export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'San Rafael Turnos API',
    version: '0.1.0',
    description: 'API MVP para gestion de turnos, pagos y mensajeria de Clinica San Rafael Arcangel'
  },
  servers: [
    {
      url: 'http://localhost:4000/api',
      description: 'Local'
    }
  ],
  tags: [
    { name: 'Auth' },
    { name: 'PatientAuth' },
    { name: 'Specialties' },
    { name: 'Insurances' },
    { name: 'Doctors' },
    { name: 'Slots' },
    { name: 'Appointments' },
    { name: 'Payments' },
    { name: 'Messages' },
    { name: 'Notifications' },
    { name: 'Audit' },
    { name: 'News' },
    { name: 'Secretaries' }
  ],
  paths: {
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login staff' } },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Refresh token con rotacion' } },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Logout staff' } },
    '/patient/auth/prefill': { get: { tags: ['PatientAuth'], summary: 'Buscar paciente por DNI para autocompletar ingreso' } },
    '/patient/auth/login': { post: { tags: ['PatientAuth'], summary: 'Login/registro rapido de paciente' } },
    '/specialties': {
      get: { tags: ['Specialties'], summary: 'Listar especialidades' },
      post: { tags: ['Specialties'], summary: 'Crear especialidad (admin)' }
    },
    '/specialties/{id}': {
      patch: { tags: ['Specialties'], summary: 'Actualizar especialidad (admin)' },
      delete: { tags: ['Specialties'], summary: 'Eliminar especialidad (admin)' }
    },
    '/insurances': {
      get: { tags: ['Insurances'], summary: 'Listar obras sociales' },
      post: { tags: ['Insurances'], summary: 'Crear obra social (admin)' }
    },
    '/insurances/{id}': {
      patch: { tags: ['Insurances'], summary: 'Actualizar obra social (admin)' },
      delete: { tags: ['Insurances'], summary: 'Eliminar obra social (admin)' }
    },
    '/doctors': {
      get: { tags: ['Doctors'], summary: 'Listar medicos' },
      post: { tags: ['Doctors'], summary: 'Crear medico (admin)' }
    },
    '/doctors/{id}': {
      get: { tags: ['Doctors'], summary: 'Detalle de medico' },
      patch: { tags: ['Doctors'], summary: 'Actualizar medico (admin)' },
      delete: { tags: ['Doctors'], summary: 'Eliminar medico (admin)' }
    },
    '/doctors/{id}/availability': {
      get: { tags: ['Doctors'], summary: 'Ver disponibilidad/bloqueos de medico' },
      put: { tags: ['Doctors'], summary: 'Reemplazar disponibilidad (admin)' }
    },
    '/doctors/{id}/blocks': {
      post: { tags: ['Doctors'], summary: 'Crear bloqueo administrativo (clinic/admin)' }
    },
    '/doctors/{id}/blocks/{blockId}': {
      delete: { tags: ['Doctors'], summary: 'Eliminar bloqueo administrativo (clinic/admin)' }
    },
    '/slots': {
      get: { tags: ['Slots'], summary: 'Listar slots disponibles por doctor y fecha' }
    },
    '/appointments': {
      post: { tags: ['Appointments'], summary: 'Crear turno en HOLD' },
      get: { tags: ['Appointments'], summary: 'Listar turnos (clinic/admin)' }
    },
    '/appointments/my': {
      get: { tags: ['Appointments'], summary: 'Listar turnos propios de paciente' }
    },
    '/appointments/{id}': {
      get: { tags: ['Appointments'], summary: 'Obtener turno por id' },
      patch: { tags: ['Appointments'], summary: 'Actualizar turno por permisos' },
      delete: { tags: ['Appointments'], summary: 'Eliminar turno definitivamente (staff autorizado)' }
    },
    '/appointments/{id}/cancel': {
      post: { tags: ['Appointments'], summary: 'Cancelar turno' }
    },
    '/appointments/{id}/reschedule': {
      post: { tags: ['Appointments'], summary: 'Reprogramar turno (clinic/admin)' }
    },
    '/appointments/{id}/consult-note': {
      get: { tags: ['Appointments'], summary: 'Obtener registro de consulta del turno (doctor/clinic/admin)' },
      post: { tags: ['Appointments'], summary: 'Crear registro de consulta (1 por turno confirmado)' },
      patch: { tags: ['Appointments'], summary: 'Editar registro de consulta (doctor 24h, clinic/admin sin limite)' }
    },
    '/appointments/{id}/messages': {
      get: { tags: ['Messages'], summary: 'Listar mensajes del turno' },
      post: { tags: ['Messages'], summary: 'Enviar mensaje en turno confirmado' }
    },
    '/payments/confirm': {
      post: { tags: ['Payments'], summary: 'Confirmar pago y confirmar turno del paciente' }
    },
    '/payments/{appointmentId}': {
      get: { tags: ['Payments'], summary: 'Ver pago por turno' }
    },
    '/payments/{appointmentId}/status': {
      patch: { tags: ['Payments'], summary: 'Actualizar estado de pago por turno (admin/clinic/doctor)' }
    },
    '/notifications/whatsapp/send': {
      post: { tags: ['Notifications'], summary: 'Enviar WhatsApp mock interno' }
    },
    '/audit-logs': {
      get: { tags: ['Audit'], summary: 'Listar auditoria (admin)' }
    },
    '/news': {
      get: { tags: ['News'], summary: 'Listar noticias de salud (fuente externa cacheada)' }
    },
    '/news/{id}': {
      get: { tags: ['News'], summary: 'Obtener detalle completo de noticia por id' }
    },
    '/secretaries': {
      get: { tags: ['Secretaries'], summary: 'Listar secretarias (admin)' },
      post: { tags: ['Secretaries'], summary: 'Crear secretaria vinculada a medico (admin)' }
    },
    '/secretaries/{id}': {
      patch: { tags: ['Secretaries'], summary: 'Actualizar secretaria (admin)' },
      delete: { tags: ['Secretaries'], summary: 'Eliminar secretaria (admin)' }
    }
  }
}
