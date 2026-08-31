(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.EES18ReservasRules = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SLOTS = Object.freeze({
    MANANA: Object.freeze([
      Object.freeze({ id: 'M1', start: '07:30', end: '08:30', shift: 'Mañana' }),
      Object.freeze({ id: 'M2', start: '08:30', end: '09:30', shift: 'Mañana' }),
      Object.freeze({ id: 'M3', start: '09:50', end: '10:50', shift: 'Mañana' }),
      Object.freeze({ id: 'M4', start: '10:50', end: '11:50', shift: 'Mañana' }),
      Object.freeze({ id: 'M5', start: '11:50', end: '12:50', shift: 'Mañana' })
    ]),
    TARDE: Object.freeze([
      Object.freeze({ id: 'T1', start: '13:00', end: '14:00', shift: 'Tarde' }),
      Object.freeze({ id: 'T2', start: '14:00', end: '15:00', shift: 'Tarde' }),
      Object.freeze({ id: 'T3', start: '15:20', end: '16:20', shift: 'Tarde' }),
      Object.freeze({ id: 'T4', start: '16:20', end: '17:20', shift: 'Tarde' }),
      Object.freeze({ id: 'T5', start: '17:20', end: '18:20', shift: 'Tarde' })
    ])
  });

  const ALL_SLOTS = [...SLOTS.MANANA, ...SLOTS.TARDE];

  function getSlotById(slotId) {
    return ALL_SLOTS.find((slot) => slot.id === slotId) || null;
  }

  function buildContinuousRange(slotIds) {
    if (!Array.isArray(slotIds) || slotIds.length === 0) {
      throw new Error('EMPTY_SELECTION');
    }

    const uniqueIds = [...new Set(slotIds)];
    if (uniqueIds.length !== slotIds.length) {
      throw new Error('DUPLICATE_SLOT_SELECTION');
    }

    const selected = uniqueIds.map((slotId) => {
      const slot = getSlotById(slotId);
      if (!slot) throw new Error('UNKNOWN_SLOT');
      return slot;
    });

    const firstShift = selected[0].shift;
    if (selected.some((slot) => slot.shift !== firstShift)) {
      throw new Error('MIXED_SHIFT_SELECTION');
    }

    const shiftSlots = firstShift === 'Mañana' ? SLOTS.MANANA : SLOTS.TARDE;
    const indexes = selected
      .map((slot) => shiftSlots.findIndex((candidate) => candidate.id === slot.id))
      .sort((a, b) => a - b);

    for (let index = 1; index < indexes.length; index += 1) {
      if (indexes[index] !== indexes[index - 1] + 1) {
        throw new Error('NON_CONTIGUOUS_SELECTION');
      }
    }

    const first = shiftSlots[indexes[0]];
    const last = shiftSlots[indexes[indexes.length - 1]];

    return {
      start: first.start,
      end: last.end,
      shift: first.shift,
      count: indexes.length
    };
  }

  function isInstitutionalEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    return /^[^\s@]+@abc\.gob\.ar$/.test(normalized);
  }

  function isValidEmail(email) {
    const normalized = String(email || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  }

  function parseIsoDate(isoDate) {
    const value = String(isoDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error('INVALID_DATE');
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error('INVALID_DATE');
    }

    return date;
  }

  function formatIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function buildWeeklyDates(startIso, endIso) {
    const start = parseIsoDate(startIso);
    const end = parseIsoDate(endIso);

    if (end.getTime() < start.getTime()) {
      throw new Error('INVALID_REPEAT_RANGE');
    }

    const maxWindowMs = 60 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > maxWindowMs) {
      throw new Error('REPEAT_WINDOW_EXCEEDED');
    }

    const dates = [];
    const cursor = new Date(start.getTime());

    while (cursor.getTime() <= end.getTime()) {
      dates.push(formatIsoDate(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    return dates;
  }

  return Object.freeze({
    SLOTS,
    buildContinuousRange,
    isInstitutionalEmail,
    isValidEmail,
    buildWeeklyDates
  });
});
