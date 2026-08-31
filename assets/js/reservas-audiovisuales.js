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

  function requiredText(value, errorCode) {
    const normalized = String(value || '').trim();
    if (!normalized) throw new Error(errorCode);
    return normalized;
  }

  function buildReservationPayload(data, bookingState) {
    const input = data || {};
    const state = bookingState || {};

    const teacher = requiredText(input.teacher, 'INVALID_TEACHER');
    const email = requiredText(input.email, 'INVALID_EMAIL');
    if (!isValidEmail(email)) throw new Error('INVALID_EMAIL');

    const course = requiredText(input.course, 'INVALID_COURSE');
    const subject = requiredText(input.subject, 'INVALID_SUBJECT');
    const date = requiredText(state.selectedDate, 'INVALID_DATE');
    parseIsoDate(date);

    const slotIds = Array.isArray(state.selectedSlotIds)
      ? [...state.selectedSlotIds]
      : [];
    const range = buildContinuousRange(slotIds);

    const mode = input.mode === 'weekly' ? 'weekly' : 'single';
    let repeatUntil = '';

    if (mode === 'weekly') {
      repeatUntil = requiredText(input.repeatUntil, 'INVALID_REPEAT_RANGE');
      buildWeeklyDates(date, repeatUntil);
    }

    return {
      mode,
      date,
      repeatUntil,
      slotIds,
      start: range.start,
      end: range.end,
      teacher,
      email,
      emailType: isInstitutionalEmail(email) ? 'institucional' : 'externo',
      course,
      subject,
      shift: range.shift,
      resources: {
        projector: Boolean(input.projector),
        speakers: Boolean(input.speakers),
        schoolNotebook: Boolean(input.schoolNotebook),
        internet: Boolean(input.internet)
      },
      observations: String(input.observations || '').trim().slice(0, 500)
    };
  }

  return Object.freeze({
    SLOTS,
    buildContinuousRange,
    isInstitutionalEmail,
    isValidEmail,
    buildWeeklyDates,
    buildReservationPayload
  });
});

(function initBookingUi() {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const rules = window.EES18ReservasRules;
  const calendar = document.getElementById('booking-calendar');
  if (!rules || !calendar) return;

  const monthLabel = document.getElementById('calendar-month-label');
  const prevButton = document.getElementById('calendar-prev');
  const nextButton = document.getElementById('calendar-next');
  const selectedDateTitle = document.getElementById('selected-date-title');
  const dayStatusBadge = document.getElementById('day-status-badge');
  const dayHelp = document.getElementById('day-help');
  const morningSlots = document.getElementById('morning-slots');
  const afternoonSlots = document.getElementById('afternoon-slots');
  const selectionSummary = document.getElementById('selection-summary');
  const bookingForm = document.getElementById('booking-form');
  const bookingFields = document.getElementById('booking-fields');
  const confirmationSummary = document.getElementById('confirmation-summary');
  const teacherEmail = document.getElementById('teacher-email');
  const emailKind = document.getElementById('email-kind');
  const repeatUntilWrap = document.getElementById('repeat-until-wrap');
  const repeatUntilInput = document.getElementById('repeat-until');
  const bookingSubmit = document.getElementById('booking-submit');
  const bookingResult = document.getElementById('booking-result');

  const today = startOfLocalDay(new Date());
  const maxDate = addDays(today, 60);
  const state = {
    visibleMonth: new Date(today.getFullYear(), today.getMonth(), 1),
    selectedDate: '',
    selectedSlotIds: [],
    occupiedSlotIds: []
  };

  function startOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, amount) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() + amount);
    return result;
  }

  function toIsoLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatLongDate(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(year, month - 1, day));
  }

  function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  function dateState(date) {
    if (date < today || date > maxDate || isWeekend(date)) return 'blocked';
    return 'available';
  }

  function renderCalendar() {
    calendar.replaceChildren();

    const year = state.visibleMonth.getFullYear();
    const month = state.visibleMonth.getMonth();
    monthLabel.textContent = new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric'
    }).format(state.visibleMonth);

    const firstDay = new Date(year, month, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    for (let index = 0; index < mondayOffset; index += 1) {
      const empty = document.createElement('span');
      empty.className = 'calendar-day is-empty';
      empty.setAttribute('aria-hidden', 'true');
      calendar.appendChild(empty);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const isoDate = toIsoLocal(date);
      const status = dateState(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `calendar-day is-${status}`;
      button.dataset.date = isoDate;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${formatLongDate(isoDate)} · ${status === 'blocked' ? 'No disponible' : 'Disponible'}`);

      const number = document.createElement('strong');
      number.textContent = String(day);
      const caption = document.createElement('small');
      caption.textContent = status === 'blocked' ? 'Bloqueado' : 'Disponible';
      button.append(number, caption);

      if (status === 'blocked') button.disabled = true;
      if (state.selectedDate === isoDate) button.classList.add('is-selected');
      button.addEventListener('click', () => selectDate(isoDate));
      calendar.appendChild(button);
    }

    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    prevButton.disabled = state.visibleMonth <= minMonth;
    nextButton.disabled = state.visibleMonth >= maxMonth;
  }

  function renderSlotList(container, slots) {
    container.replaceChildren();

    slots.forEach((slot) => {
      const occupied = state.occupiedSlotIds.includes(slot.id);
      const selected = state.selectedSlotIds.includes(slot.id);
      const label = document.createElement('label');
      label.className = `slot-option${occupied ? ' is-occupied' : ''}${selected ? ' is-selected' : ''}`;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = slot.id;
      input.checked = selected;
      input.disabled = occupied || !state.selectedDate;
      input.setAttribute('aria-label', `${slot.start} a ${slot.end}`);
      input.addEventListener('change', () => toggleSlot(slot.id, input.checked));

      const time = document.createElement('strong');
      time.textContent = `${slot.start}–${slot.end}`;
      const status = document.createElement('small');
      status.textContent = occupied ? 'Ocupado' : 'Disponible';
      label.append(input, time, status);
      container.appendChild(label);
    });
  }

  function renderSlots() {
    renderSlotList(morningSlots, rules.SLOTS.MANANA);
    renderSlotList(afternoonSlots, rules.SLOTS.TARDE);
  }

  function selectDate(isoDate) {
    state.selectedDate = isoDate;
    state.selectedSlotIds = [];
    state.occupiedSlotIds = [];
    selectedDateTitle.textContent = formatLongDate(isoDate);
    dayStatusBadge.textContent = 'Disponible';
    dayStatusBadge.dataset.state = 'available';
    dayHelp.textContent = 'Marcá uno o varios módulos consecutivos del mismo turno.';
    bookingFields.disabled = true;
    bookingResult.hidden = true;
    repeatUntilInput.min = isoDate;
    repeatUntilInput.max = toIsoLocal(maxDate);
    renderCalendar();
    renderSlots();
    renderSelectionSummary();
  }

  function toggleSlot(slotId, checked) {
    const previous = [...state.selectedSlotIds];
    if (checked) {
      state.selectedSlotIds = [...previous, slotId];
    } else {
      state.selectedSlotIds = previous.filter((id) => id !== slotId);
    }

    if (state.selectedSlotIds.length > 0) {
      try {
        rules.buildContinuousRange(state.selectedSlotIds);
      } catch (error) {
        state.selectedSlotIds = previous;
        selectionSummary.classList.add('is-error');
        selectionSummary.innerHTML = '<strong>Seleccioná módulos consecutivos del mismo turno.</strong><span>Si necesitás horarios separados, hacé reservas distintas.</span>';
        renderSlots();
        return;
      }
    }

    renderSlots();
    renderSelectionSummary();
  }

  function renderSelectionSummary() {
    selectionSummary.classList.remove('is-error');

    if (!state.selectedDate || state.selectedSlotIds.length === 0) {
      selectionSummary.innerHTML = '<strong>Todavía no seleccionaste horarios.</strong><span>Podés marcar uno o varios módulos consecutivos del mismo turno.</span>';
      bookingFields.disabled = true;
      confirmationSummary.innerHTML = '<strong>Revisá fecha y horario antes de confirmar.</strong>';
      return;
    }

    const range = rules.buildContinuousRange(state.selectedSlotIds);
    selectionSummary.innerHTML = `<strong>${range.start} a ${range.end} · ${range.count} ${range.count === 1 ? 'módulo' : 'módulos'}</strong><span>Turno ${range.shift.toLowerCase()} · ${formatLongDate(state.selectedDate)}</span>`;
    bookingFields.disabled = false;
    updateConfirmationSummary();
  }

  function updateEmailKind() {
    const email = teacherEmail.value.trim();
    emailKind.className = '';

    if (!email) {
      emailKind.textContent = '';
      return;
    }

    if (!rules.isValidEmail(email)) {
      emailKind.textContent = 'Revisá el correo.';
      emailKind.dataset.state = 'error';
      return;
    }

    if (rules.isInstitutionalEmail(email)) {
      emailKind.textContent = 'Correo institucional @abc.gob.ar';
      emailKind.dataset.state = 'institutional';
    } else {
      emailKind.textContent = 'Correo válido externo';
      emailKind.dataset.state = 'external';
    }
  }

  function selectedMode() {
    const checked = bookingForm.querySelector('input[name="mode"]:checked');
    return checked ? checked.value : 'single';
  }

  function updateModeUi() {
    const weekly = selectedMode() === 'weekly';
    repeatUntilWrap.hidden = !weekly;
    repeatUntilInput.required = weekly;
    if (!weekly) repeatUntilInput.value = '';
    updateConfirmationSummary();
  }

  function updateConfirmationSummary() {
    if (!state.selectedDate || state.selectedSlotIds.length === 0) {
      confirmationSummary.innerHTML = '<strong>Revisá fecha y horario antes de confirmar.</strong>';
      return;
    }

    const range = rules.buildContinuousRange(state.selectedSlotIds);
    const mode = selectedMode();
    let recurrence = 'Reserva para una fecha.';

    if (mode === 'weekly') {
      recurrence = repeatUntilInput.value
        ? `Repetición semanal hasta ${formatLongDate(repeatUntilInput.value)}.`
        : 'Elegí hasta qué fecha querés repetir semanalmente.';
    }

    confirmationSummary.innerHTML = `<strong>${formatLongDate(state.selectedDate)}</strong><br>${range.start} a ${range.end} · ${range.count} ${range.count === 1 ? 'módulo' : 'módulos'}<br><span>${recurrence}</span>`;
  }

  function readFormData() {
    const data = new FormData(bookingForm);
    return {
      teacher: data.get('teacher'),
      email: data.get('email'),
      course: data.get('course'),
      subject: data.get('subject'),
      mode: data.get('mode'),
      repeatUntil: data.get('repeatUntil'),
      projector: data.has('projector'),
      speakers: data.has('speakers'),
      schoolNotebook: data.has('schoolNotebook'),
      internet: data.has('internet'),
      observations: data.get('observations')
    };
  }

  function errorMessage(error) {
    const code = error && error.message;
    const messages = {
      INVALID_TEACHER: 'Ingresá apellido y nombre.',
      INVALID_EMAIL: 'Ingresá un correo válido.',
      INVALID_COURSE: 'Ingresá el curso.',
      INVALID_SUBJECT: 'Ingresá la materia o espacio curricular.',
      INVALID_DATE: 'Elegí una fecha válida.',
      EMPTY_SELECTION: 'Elegí al menos un módulo.',
      INVALID_REPEAT_RANGE: 'Elegí una fecha final válida para la repetición.',
      REPEAT_WINDOW_EXCEEDED: 'La repetición no puede superar los 60 días.'
    };
    return messages[code] || 'Revisá los datos de la reserva.';
  }

  prevButton.addEventListener('click', () => {
    state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  nextButton.addEventListener('click', () => {
    state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  teacherEmail.addEventListener('input', updateEmailKind);
  bookingForm.querySelectorAll('input[name="mode"]').forEach((input) => {
    input.addEventListener('change', updateModeUi);
  });
  repeatUntilInput.addEventListener('change', updateConfirmationSummary);

  bookingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    bookingResult.hidden = true;

    try {
      const payload = rules.buildReservationPayload(readFormData(), state);
      const dates = payload.mode === 'weekly'
        ? rules.buildWeeklyDates(payload.date, payload.repeatUntil)
        : [payload.date];

      bookingSubmit.disabled = true;
      bookingResult.hidden = false;
      bookingResult.dataset.state = 'pilot';
      bookingResult.innerHTML = `<strong>La selección está lista.</strong><br>Preparaste ${dates.length} ${dates.length === 1 ? 'fecha' : 'fechas'} de ${payload.start} a ${payload.end}. La confirmación automática se habilitará cuando conectemos el Web App de reservas; por ahora este prototipo no modifica la planilla ni Google Calendar.`;
    } catch (error) {
      bookingResult.hidden = false;
      bookingResult.dataset.state = 'error';
      bookingResult.innerHTML = `<strong>No pudimos preparar la reserva.</strong><br>${errorMessage(error)}`;
    } finally {
      bookingSubmit.disabled = false;
    }
  });

  renderCalendar();
  renderSlots();
  updateModeUi();
})();
