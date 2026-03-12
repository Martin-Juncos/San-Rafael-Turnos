import test from 'node:test'
import assert from 'node:assert/strict'
import { AppError } from '../src/utils/errors.js'
import {
  mapMercadoPagoStatusToLocal,
  assertMercadoPagoPaymentMatchesAppointment
} from '../src/services/mercadoPagoReconciliationService.js'

test('mapMercadoPagoStatusToLocal traduce estados de Mercado Pago', () => {
  assert.equal(mapMercadoPagoStatusToLocal('approved'), 'paid')
  assert.equal(mapMercadoPagoStatusToLocal('authorized'), 'paid')
  assert.equal(mapMercadoPagoStatusToLocal('rejected'), 'failed')
  assert.equal(mapMercadoPagoStatusToLocal('cancelled'), 'failed')
  assert.equal(mapMercadoPagoStatusToLocal('refunded'), 'refunded')
  assert.equal(mapMercadoPagoStatusToLocal('charged_back'), 'refunded')
  assert.equal(mapMercadoPagoStatusToLocal('pending'), 'pending')
  assert.equal(mapMercadoPagoStatusToLocal('in_process'), 'pending')
})

test('assertMercadoPagoPaymentMatchesAppointment acepta pagos correlacionados', () => {
  const appointment = {
    id: 'appointment-1',
    payment: {
      id: 'payment-1'
    }
  }

  assert.doesNotThrow(() => {
    assertMercadoPagoPaymentMatchesAppointment({
      appointment,
      mpPayment: {
        external_reference: 'appointment-1',
        metadata: {
          appointmentId: 'appointment-1',
          localPaymentId: 'payment-1'
        }
      }
    })
  })
})

test('assertMercadoPagoPaymentMatchesAppointment rechaza pagos de otro turno', () => {
  const appointment = {
    id: 'appointment-1',
    payment: {
      id: 'payment-1'
    }
  }

  assert.throws(
    () => {
      assertMercadoPagoPaymentMatchesAppointment({
        appointment,
        mpPayment: {
          external_reference: 'appointment-2'
        }
      })
    },
    (error) => error instanceof AppError && error.code === 'mercadopago_payment_mismatch'
  )
})
