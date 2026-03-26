/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DangerConfirmModal } from './DangerConfirmModal'

describe('DangerConfirmModal', () => {
  it('mantiene la confirmacion deshabilitada hasta escribir ELIMINAR', () => {
    render(
      <DangerConfirmModal
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    const confirmButton = screen.getByRole('button', {
      name: /Eliminar definitivamente/i
    })
    const input = screen.getByLabelText(/Confirmacion/i)

    expect(confirmButton).toBeDisabled()

    fireEvent.change(input, {
      target: { value: 'ELIMI' }
    })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(input, {
      target: { value: 'ELIMINAR' }
    })
    expect(confirmButton).toBeEnabled()
  })
})
