import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalisePhone, validateFollowUpInput} from './input';

const DOCTOR_ID = '00000000-0000-4000-8000-000000000003';
const valid = {
  patientName: '  Sample Patient  ',
  patientPhone: '+91 (000) 000-1234',
  windowDays: 7,
  visitNote: ' Sprained ankle. ',
  doctorId: DOCTOR_ID,
};

const errorsFor = (changes: Record<string, unknown>) => {
  const result = validateFollowUpInput({...valid, ...changes});
  return result.ok ? {} : result.errors;
};

test('accepts valid input and returns trimmed, normalised values', () => {
  const result = validateFollowUpInput(valid);
  assert.deepEqual(result, {
    ok: true,
    values: {
      patientName: 'Sample Patient',
      patientPhone: '+910000001234',
      windowDays: 7,
      visitNote: 'Sprained ankle.',
      doctorId: DOCTOR_ID,
    },
  });
});

test('normalises phone numbers', () => {
  assert.equal(normalisePhone('000 000-1234'), '0000001234');
  assert.equal(normalisePhone('123456'), undefined); // 6 digits
  assert.equal(normalisePhone('1234567890123456'), undefined); // 16 digits
  assert.equal(normalisePhone('12345abc'), undefined);
  assert.equal(normalisePhone('12+345678'), undefined);
});

test('refuses each bad field', () => {
  assert.ok(errorsFor({patientName: '   '}).patientName);
  assert.ok(errorsFor({patientName: 'a'.repeat(81)}).patientName);
  assert.ok(errorsFor({patientPhone: ''}).patientPhone);
  assert.ok(errorsFor({patientPhone: '12345'}).patientPhone);
  assert.ok(errorsFor({windowDays: 5}).windowDays);
  assert.ok(errorsFor({windowDays: '7'}).windowDays);
  assert.ok(errorsFor({visitNote: ''}).visitNote);
  assert.ok(errorsFor({visitNote: 'a'.repeat(121)}).visitNote);
  assert.ok(errorsFor({visitNote: 'line one\nline two'}).visitNote);
  assert.ok(errorsFor({doctorId: 'not-an-id'}).doctorId);
});

test('accepts the limits exactly', () => {
  assert.deepEqual(errorsFor({patientName: 'a'.repeat(80), visitNote: 'a'.repeat(120)}), {});
});

test('refuses input that is not an object', () => {
  for (const input of [null, undefined, 'text', 42]) {
    assert.equal(validateFollowUpInput(input).ok, false);
  }
});
