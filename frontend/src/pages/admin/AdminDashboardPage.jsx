import { ActionResultModal } from '../../components/ui/ActionResultModal'
import { AdminAvailabilitySection } from './AdminDashboardPage/components/AdminAvailabilitySection'
import { AdminDashboardHeader } from './AdminDashboardPage/components/AdminDashboardHeader'
import { AdminDoctorsSection } from './AdminDashboardPage/components/AdminDoctorsSection'
import { AdminInsurancesSection } from './AdminDashboardPage/components/AdminInsurancesSection'
import { AdminSecretariesSection } from './AdminDashboardPage/components/AdminSecretariesSection'
import { AdminSpecialtiesSection } from './AdminDashboardPage/components/AdminSpecialtiesSection'
import { useAdminDashboardState } from './AdminDashboardPage/hooks/useAdminDashboardState'

export function AdminDashboardPage () {
  const admin = useAdminDashboardState()

  return (
    <div className='space-y-6'>
      <AdminDashboardHeader />

      <AdminSpecialtiesSection
        specialties={admin.specialties}
        specialtyForm={admin.specialtyForm}
        setSpecialtyForm={admin.setSpecialtyForm}
        editingSpecialtyId={admin.editingSpecialtyId}
        handleSubmitSpecialty={admin.handleSubmitSpecialty}
        resetSpecialtyForm={admin.resetSpecialtyForm}
        handleEditSpecialty={admin.handleEditSpecialty}
        handleDeleteSpecialty={admin.handleDeleteSpecialty}
      />

      <div className='grid gap-6 xl:grid-cols-2'>
        <AdminDoctorsSection
          doctors={admin.doctors}
          specialties={admin.specialties}
          doctorForm={admin.doctorForm}
          setDoctorForm={admin.setDoctorForm}
          editingDoctorId={admin.editingDoctorId}
          handleSubmitDoctor={admin.handleSubmitDoctor}
          resetDoctorForm={admin.resetDoctorForm}
          handleEditDoctor={admin.handleEditDoctor}
          handleDeleteDoctor={admin.handleDeleteDoctor}
        />

        <AdminSecretariesSection
          secretaries={admin.secretaries}
          doctors={admin.doctors}
          secretaryForm={admin.secretaryForm}
          setSecretaryForm={admin.setSecretaryForm}
          editingSecretaryId={admin.editingSecretaryId}
          handleSubmitSecretary={admin.handleSubmitSecretary}
          resetSecretaryForm={admin.resetSecretaryForm}
          handleEditSecretary={admin.handleEditSecretary}
          handleDeleteSecretary={admin.handleDeleteSecretary}
        />
      </div>

      <AdminAvailabilitySection
        doctors={admin.doctors}
        availabilityDoctorId={admin.availabilityDoctorId}
        handleLoadAvailability={admin.handleLoadAvailability}
        availabilityForm={admin.availabilityForm}
        setAvailabilityForm={admin.setAvailabilityForm}
        editingAvailabilityIndex={admin.editingAvailabilityIndex}
        setEditingAvailabilityIndex={admin.setEditingAvailabilityIndex}
        availabilityDraft={admin.availabilityDraft}
        addAvailabilityRow={admin.addAvailabilityRow}
        resetAvailabilityForm={admin.resetAvailabilityForm}
        saveAvailability={admin.saveAvailability}
        availabilityForSelectedDay={admin.availabilityForSelectedDay}
        handleEditAvailability={admin.handleEditAvailability}
        handleDeleteAvailability={admin.handleDeleteAvailability}
      />

      <AdminInsurancesSection
        insurances={admin.insurances}
        insuranceForm={admin.insuranceForm}
        setInsuranceForm={admin.setInsuranceForm}
        editingInsuranceId={admin.editingInsuranceId}
        handleSubmitInsurance={admin.handleSubmitInsurance}
        resetInsuranceForm={admin.resetInsuranceForm}
        handleToggleInsuranceStatus={admin.handleToggleInsuranceStatus}
        handleEditInsurance={admin.handleEditInsurance}
        handleDeleteInsurance={admin.handleDeleteInsurance}
      />

      <ActionResultModal
        open={admin.feedbackModal.open}
        type={admin.feedbackModal.type}
        title={admin.feedbackModal.title}
        description={admin.feedbackModal.description}
        onClose={admin.closeFeedbackModal}
      />
    </div>
  )
}

