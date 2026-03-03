/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAdminFilters } from './useAdminFilters'

describe('useAdminFilters', () => {
  it('resets specialty form and editing id', () => {
    const { result } = renderHook(() => useAdminFilters())

    act(() => {
      result.current.setEditingSpecialtyId('spec-1')
      result.current.setSpecialtyForm({
        name: 'Cardiologia',
        description: 'Desc',
        fee: 20000
      })
    })

    act(() => {
      result.current.resetSpecialtyForm()
    })

    expect(result.current.editingSpecialtyId).toBe('')
    expect(result.current.specialtyForm).toEqual({
      name: '',
      description: '',
      fee: 15000
    })
  })
})

