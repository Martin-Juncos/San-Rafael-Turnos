import { ActionResultModal } from '../../components/ui/ActionResultModal'
import { ClinicAgendaAndBlocksSection } from './ClinicDashboardPage/components/ClinicAgendaAndBlocksSection'
import { ClinicAppointmentsSection } from './ClinicDashboardPage/components/ClinicAppointmentsSection'
import { ClinicDashboardHeader } from './ClinicDashboardPage/components/ClinicDashboardHeader'
import { ClinicManualAndRescheduleSection } from './ClinicDashboardPage/components/ClinicManualAndRescheduleSection'
import { useClinicDashboardState } from './ClinicDashboardPage/hooks/useClinicDashboardState'

export function ClinicDashboardPage () {
  const dashboard = useClinicDashboardState()

  return (
    <div className='space-y-6'>
      <ClinicDashboardHeader />

      <ClinicAgendaAndBlocksSection
        specialties={dashboard.specialties}
        doctors={dashboard.doctors}
        doctorFilters={dashboard.doctorFilters}
        setDoctorFilters={dashboard.setDoctorFilters}
        appointmentFilters={dashboard.appointmentFilters}
        setAppointmentFilters={dashboard.setAppointmentFilters}
        selectedSpecialtyName={dashboard.selectedSpecialtyName}
        selectedAgendaDoctor={dashboard.selectedAgendaDoctor}
        agendaAvailabilityLoading={dashboard.agendaAvailabilityLoading}
        agendaDaysWithAvailability={dashboard.agendaDaysWithAvailability}
        formatDateLabel={dashboard.formatDateLabel}
        slots={dashboard.slots}
        agendaLoading={dashboard.agendaLoading}
        agendaConfirmedAppointments={dashboard.agendaConfirmedAppointments}
        blockDraft={dashboard.blockDraft}
        setBlockDraft={dashboard.setBlockDraft}
        today={dashboard.today}
        blockAvailabilityLoading={dashboard.blockAvailabilityLoading}
        blockAvailableDates={dashboard.blockAvailableDates}
        blockStartOptions={dashboard.blockStartOptions}
        blockEndOptions={dashboard.blockEndOptions}
        createBlock={dashboard.createBlock}
      />

      <ClinicManualAndRescheduleSection
        doctors={dashboard.doctors}
        appointments={dashboard.appointments}
        today={dashboard.today}
        manualAppointment={dashboard.manualAppointment}
        setManualAppointment={dashboard.setManualAppointment}
        manualAvailabilityLoading={dashboard.manualAvailabilityLoading}
        manualDaysWithAvailability={dashboard.manualDaysWithAvailability}
        formatDateLabel={dashboard.formatDateLabel}
        manualSlotsLoading={dashboard.manualSlotsLoading}
        manualOpenSlots={dashboard.manualOpenSlots}
        manualPatientLookupMessage={dashboard.manualPatientLookupMessage}
        manualPatientLookupDone={dashboard.manualPatientLookupDone}
        manualPatientLookupLoading={dashboard.manualPatientLookupLoading}
        handleManualPatientDniChange={dashboard.handleManualPatientDniChange}
        lookupManualPatientByDni={dashboard.lookupManualPatientByDni}
        createManualAppointment={dashboard.createManualAppointment}
        rescheduleDoctorId={dashboard.rescheduleDoctorId}
        setRescheduleDoctorId={dashboard.setRescheduleDoctorId}
        rescheduleDraft={dashboard.rescheduleDraft}
        setRescheduleDraft={dashboard.setRescheduleDraft}
        rescheduleAppointments={dashboard.rescheduleAppointments}
        rescheduleAvailabilityLoading={dashboard.rescheduleAvailabilityLoading}
        rescheduleDaysWithAvailability={dashboard.rescheduleDaysWithAvailability}
        rescheduleSlotsLoading={dashboard.rescheduleSlotsLoading}
        rescheduleOpenSlots={dashboard.rescheduleOpenSlots}
        rescheduleAppointment={dashboard.rescheduleAppointment}
      />

      <ClinicAppointmentsSection
        appointmentFilters={dashboard.appointmentFilters}
        setAppointmentFilters={dashboard.setAppointmentFilters}
        doctors={dashboard.doctors}
        appointments={dashboard.appointments}
        cancelAppointment={dashboard.cancelAppointment}
      />

      <ActionResultModal
        open={dashboard.feedbackModal.open}
        type={dashboard.feedbackModal.type}
        title={dashboard.feedbackModal.title}
        description={dashboard.feedbackModal.description}
        onClose={dashboard.closeFeedbackModal}
      />
    </div>
  )
}

