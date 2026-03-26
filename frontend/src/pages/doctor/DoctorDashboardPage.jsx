import { ActionResultModal } from '../../components/ui/ActionResultModal'
import { DangerConfirmModal } from '../../components/ui/DangerConfirmModal'
import { DoctorAgendaSection } from './DoctorDashboardPage/components/DoctorAgendaSection'
import { DoctorDashboardHeader } from './DoctorDashboardPage/components/DoctorDashboardHeader'
import { DoctorIncomingAlert } from './DoctorDashboardPage/components/DoctorIncomingAlert'
import { DoctorManagementPanel } from './DoctorDashboardPage/components/DoctorManagementPanel'
import { useDoctorDashboardState } from './DoctorDashboardPage/hooks/useDoctorDashboardState'

export function DoctorDashboardPage () {
  const doctor = useDoctorDashboardState()

  return (
    <div className='space-y-6'>
      <DoctorDashboardHeader
        doctorId={doctor.activeDoctorId}
        isSecretary={doctor.isSecretary}
        activeDoctorId={doctor.activeDoctorId}
        doctorScopes={doctor.doctorScopes}
        onDoctorContextChange={doctor.setActiveDoctor}
        onOpenPatientRecords={doctor.openPatientRecords}
        onOpenReserveWithPrefill={doctor.openReserveWithPrefill}
      />

      <DoctorIncomingAlert
        incomingAlert={doctor.incomingAlert}
        onOpenChat={doctor.handleOpenIncomingAlert}
        onClose={() => doctor.setIncomingAlert(null)}
      />

      <div className='grid gap-6 xl:grid-cols-[1.2fr_1fr]'>
        <DoctorAgendaSection
          canOpenConsultRecord={!doctor.isSecretary}
          selectedPrintDate={doctor.selectedPrintDate}
          setSelectedPrintDate={doctor.setSelectedPrintDate}
          printableDates={doctor.printableDates}
          openPrintDayView={doctor.openPrintDayView}
          appointments={doctor.appointments}
          unreadAppointmentIds={doctor.unreadAppointmentIds}
          handleSelectAppointment={doctor.handleSelectAppointment}
          openConsultRecord={doctor.openConsultRecord}
          updateStatus={doctor.updateStatus}
          markPaymentAsPaid={doctor.markPaymentAsPaid}
          appointmentStatusLabels={doctor.appointmentStatusLabels}
          paymentStatusLabels={doctor.paymentStatusLabels}
        />

        <DoctorManagementPanel
          canEditDoctorNotes={!doctor.isSecretary}
          selectedAppointmentId={doctor.selectedAppointmentId}
          appointments={doctor.appointments}
          unreadAppointmentIds={doctor.unreadAppointmentIds}
          handleSelectAppointment={doctor.handleSelectAppointment}
          selectedAppointment={doctor.selectedAppointment}
          managementForm={doctor.managementForm}
          setManagementForm={doctor.setManagementForm}
          appointmentStatusOptions={doctor.appointmentStatusOptions}
          paymentStatusOptions={doctor.paymentStatusOptions}
          saveManagement={doctor.saveManagement}
          savingManagement={doctor.savingManagement}
          openDeleteModal={doctor.openDeleteModal}
          deletingAppointment={doctor.deletingAppointment}
          messages={doctor.messages}
          chatDraft={doctor.chatDraft}
          setChatDraft={doctor.setChatDraft}
          sendMessage={doctor.sendMessage}
        />
      </div>

      <ActionResultModal
        open={doctor.feedbackModal.open}
        type={doctor.feedbackModal.type}
        title={doctor.feedbackModal.title}
        description={doctor.feedbackModal.description}
        onClose={doctor.closeFeedbackModal}
      />

      <DangerConfirmModal
        open={doctor.deleteModal.open}
        title='Eliminar turno definitivamente'
        description={`Se eliminara en forma permanente el turno ${doctor.deleteModal.appointmentLabel}. Esta accion no se puede deshacer.`}
        confirmLabel='Eliminar turno'
        loading={doctor.deletingAppointment}
        onClose={doctor.closeDeleteModal}
        onConfirm={doctor.confirmDeleteAppointment}
      />
    </div>
  )
}
