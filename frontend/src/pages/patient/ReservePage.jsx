import { ActionResultModal } from '../../components/ui/ActionResultModal'
import { Card } from '../../components/ui/Card'
import { DateAndSlotsPicker } from './ReservePage/components/DateAndSlotsPicker'
import { DoctorPicker } from './ReservePage/components/DoctorPicker'
import { PatientInfoForm } from './ReservePage/components/PatientInfoForm'
import { ReserveActions } from './ReservePage/components/ReserveActions'
import { ReserveHeader } from './ReservePage/components/ReserveHeader'
import { ReserveSummary } from './ReservePage/components/ReserveSummary'
import { SpecialtyPicker } from './ReservePage/components/SpecialtyPicker'
import { useReservePageState } from './ReservePage/hooks/useReservePageState'

export function ReservePage () {
  const reserve = useReservePageState()

  return (
    <div className='space-y-6'>
      <ReserveHeader />

      <div className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
        <Card className='space-y-3'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <SpecialtyPicker
              specialtyId={reserve.form.specialtyId}
              specialties={reserve.specialties}
              onChange={reserve.handleSpecialtyChange}
            />

            <DoctorPicker
              doctorId={reserve.form.doctorId}
              filteredDoctors={reserve.filteredDoctors}
              onChange={reserve.handleDoctorChange}
            />

            <label className='space-y-1 text-sm sm:col-span-2'>
              <span className='text-xs text-emerald-900/75'>Obra social (opcional)</span>
              <select
                className='glass-input'
                value={reserve.form.insuranceId}
                onChange={(event) => reserve.handleInsuranceChange(event.target.value)}
              >
                <option value=''>Particular (sin descuento)</option>
                {reserve.insurances.map((insurance) => (
                  <option key={insurance.id} value={insurance.id}>
                    {insurance.name} - {insurance.discountPercent}% desc.
                  </option>
                ))}
              </select>
            </label>
          </div>

          <DateAndSlotsPicker
            doctorId={reserve.form.doctorId}
            availableDates={reserve.availableDates}
            loadingDates={reserve.loadingDates}
            date={reserve.form.date}
            today={reserve.today}
            loadingSlots={reserve.loadingSlots}
            slots={reserve.slots}
            startTime={reserve.form.startTime}
            onSelectAvailableDate={reserve.handleDateChange}
            onDateChange={reserve.handleDateChange}
            onSearchSlots={reserve.searchSlots}
            onSelectSlot={reserve.handleSlotSelect}
            formatDateLabel={reserve.formatDateLabel}
          />

          <PatientInfoForm
            isStaffBooking={reserve.isStaffBooking}
            form={reserve.form}
            patientLookupLoading={reserve.patientLookupLoading}
            patientLookupDone={reserve.patientLookupDone}
            patientLookupMessage={reserve.patientLookupMessage}
            onPatientDniChange={reserve.handlePatientDniChange}
            onLookupPatientByDni={reserve.lookupPatientByDni}
            updateFormField={reserve.updateFormField}
          />

          <ReserveActions
            startTime={reserve.form.startTime}
            isPatientRole={reserve.isPatientRole}
            holdResult={reserve.holdResult}
            mercadoPagoLoading={reserve.mercadoPagoLoading}
            checkingMercadoPago={reserve.checkingMercadoPago}
            authToken={reserve.auth.token}
            onCreateHold={reserve.createHold}
            onStartMercadoPagoCheckout={reserve.startMercadoPagoCheckout}
          />
        </Card>

        <ReserveSummary
          summaryRef={reserve.summaryRef}
          currentReservation={reserve.currentReservation}
          appointmentsForList={reserve.appointmentsForList}
          formatDateLongLabel={reserve.formatDateLongLabel}
          formatMoney={reserve.formatMoney}
        />
      </div>

      <ActionResultModal
        open={reserve.feedbackModal.open}
        type={reserve.feedbackModal.type}
        title={reserve.feedbackModal.title}
        description={reserve.feedbackModal.description}
        onClose={reserve.closeFeedbackModal}
      />
    </div>
  )
}
