import test from 'node:test'
import assert from 'node:assert/strict'
import { addMinutesToTime, buildSlotsForRange } from '../src/utils/time.js'

test('buildSlotsForRange creates contiguous slots', () => {
  const slots = buildSlotsForRange('09:00', '10:00', 30)
  assert.equal(slots.length, 2)
  assert.deepEqual(slots[0], { startTime: '09:00', endTime: '09:30' })
  assert.deepEqual(slots[1], { startTime: '09:30', endTime: '10:00' })
})

test('addMinutesToTime advances time correctly', () => {
  assert.equal(addMinutesToTime('10:15', 30), '10:45')
})
