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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_DATE');

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
    if (end.getTime() < start.getTime()) throw new Error('INVALID_REPEAT_RANGE');

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

    const slotIds = Array.isArray(state.selectedSlotIds) ? [...state.selectedSlotIds] : [];
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

  const API_URL = String(window.EES18_RESERVAS_API_URL || '').trim();
  const apiReady = Boolean(API_URL);
  let requestCounter = 0;

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
    occupiedSlotIds: [],
    monthDays: {},
    monthLoading: false,
    dayLoading: false
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
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(year, month - 1, day));
  }

  function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  function localDateBlocked(date) {
    return date < today || date > maxDate || isWeekend(date);
  }

  function cleanupJsonp(script, callbackName, timer) {
    if (timer) window.clearTimeout(timer);
    if (script && script.parentNode) script.parentNode.removeChild(script);
    try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; }
  }

  function requestJsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
      if (!apiReady) {
        reject(new Error('SERVICE_NOT_CONFIGURED'));
        return;
      }

      requestCounter += 1;
      const callbackName = `ees18ReservasCallback_${Date.now()}_${requestCounter}`;
      const script = document.createElement('script');
      const query = new URLSearchParams({ action, callback: callbackName });
      Object.entries(params).forEach(([key, value]) => query.set(key, String(value)));
      let timer = null;

      window[callbackName] = (payload) => {
        cleanupJsonp(script, callbackName, timer);
        resolve(payload || {});
      };
      script.src = `${API_URL}${API_URL.includes('?') ? '&' : '?'}${query.toString()}`;
      script.async = true;
      script.onerror = () => {
        cleanupJsonp(script, callbackName, timer);
        reject(new Error('NETWORK_ERROR'));
      };
      timer = window.setTimeout(() => {
        cleanupJsonp(script, callbackName, timer);
        reject(new Error('TIMEOUT'));
      }, 15000);
      document.head.appendChild(script);
    });
  }

  function setResult(message, stateName = 'info') {
    bookingResult.hidden = false;
    bookingResult.dataset.state = stateName;
    bookingResult.innerHTML = message;
  }

  function dateState(date) {
    if (localDateBlocked(date)) return 'blocked';
    if (!apiReady || state.monthLoading) return 'blocked';
    const dayInfo = state.monthDays[toIsoLocal(date)];
    return dayInfo && ['available', 'partial', 'full', 'blocked'].includes(dayInfo.status)
      ? dayInfo.status
      : 'blocked';
  }

  function dateCaption(status) {
    if (!apiReady) return 'En preparación';
    if (status === 'available') return 'Disponible';
    if (status === 'partial') return 'Parcial';
    if (status === 'full') return 'Completo';
    return 'Bloqueado';
  }

  function renderCalendar() {
    calendar.replaceChildren();
    const year = state.visibleMonth.getFullYear();
    const month = state.visibleMonth.getMonth();
    monthLabel.textContent = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(state.visibleMonth);

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
      const captionText = dateCaption(status);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `calendar-day is-${status}`;
      button.dataset.date = isoDate;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${formatLongDate(isoDate)} · ${captionText}`);

      const number = document.createElement('strong');
      number.textContent = String(day);
      const caption = document.createElement('small');
      caption.textContent = captionText;
      button.append(number, caption);

      if (status === 'blocked' || status === 'full') button.disabled = true;
      if (state.selectedDate === isoDate) button.classList.add('is-selected');
      button.addEventListener('click', () => selectDate(isoDate));
      calendar.appendChild(button);
    }

    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    prevButton.disabled = state.visibleMonth <= minMonth || state.monthLoading;
    nextButton.disabled = state.visibleMonth >= maxMonth || state.monthLoading;
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
      input.disabled = occupied || !state.selectedDate || !apiReady || state.dayLoading;
      input.setAttribute('aria-label', `${slot.start} a ${slot.end}`);
      input.addEventListener('change', () => toggleSlot(slot.id, input.checked));

      const time = document.createElement('strong');
      time.textContent = `${slot.start}–${slot.end}`;
      const status = document.createElement('small');
      status.textContent = occupied ? 'Ocupado' : (apiReady ? 'Disponible' : 'En preparación');
      label.append(input, time, status);
      container.appendChild(label);
    });
  }

  function renderSlots() {
    renderSlotList(morningSlots, rules.SLOTS.MANANA);
    renderSlotList(afternoonSlots, rules.SLOTS.TARDE);
  }

  async function loadMonthAvailability() {
    if (!apiReady) {
      state.monthDays = {};
      state.monthLoading = false;
      renderCalendar();
      setResult('<strong>Sistema en preparación.</strong><span>El calendario visual ya está listo, pero todavía no está conectado al Web App. No se puede confirmar ninguna reserva desde esta versión.</span>', 'pilot');
      return;
    }

    state.monthLoading = true;
    renderCalendar();
    try {
      const response = await requestJsonp('month', {
        year: state.visibleMonth.getFullYear(),
        month: state.visibleMonth.getMonth() + 1
      });
      if (!response.ok || !response.days) throw new Error(response.code || 'INVALID_RESPONSE');
      state.monthDays = response.days;
    } catch (error) {
      state.monthDays = {};
      setResult('<strong>No pudimos cargar la disponibilidad.</strong><span>Intentá nuevamente en unos minutos. El sistema actual sigue disponible desde Docentes.</span>', 'error');
    } finally {
      state.monthLoading = false;
      renderCalendar();
    }
  }

  async function selectDate(isoDate) {
    if (!apiReady || state.dayLoading) return;
    state.selectedDate = isoDate;
    state.selectedSlotIds = [];
    state.occupiedSlotIds = [];
    state.dayLoading = true;
    selectedDateTitle.textContent = formatLongDate(isoDate);
    dayStatusBadge.textContent = 'Consultando…';
    dayHelp.textContent = 'Verificando disponibilidad actualizada.';
    bookingFields.disabled = true;
    bookingResult.hidden = true;
    repeatUntilInput.min = isoDate;
    repeatUntilInput.max = toIsoLocal(maxDate);
    renderCalendar();
    renderSlots();
    renderSelectionSummary();

    try {
      const response = await requestJsonp('availability', { date: isoDate });
      if (!response.ok || !Array.isArray(response.slots)) throw new Error(response.code || 'INVALID_RESPONSE');
      state.occupiedSlotIds = response.slots.filter((slot) => slot.available !== true).map((slot) => slot.id);
      dayStatusBadge.textContent = dateCaption(response.status);
      dayStatusBadge.dataset.state = response.status;
      dayHelp.textContent = response.status === 'blocked'
        ? (response.reason || 'Este día no admite reservas.')
        : 'Marcá uno o varios módulos consecutivos del mismo turno.';
      if (response.status === 'blocked' || response.status === 'full') {
        state.selectedDate = '';
      }
    } catch (error) {
      state.selectedDate = '';
      state.occupiedSlotIds = rules.SLOTS.MANANA.concat(rules.SLOTS.TARDE).map((slot) => slot.id);
      dayStatusBadge.textContent = 'Sin conexión';
      dayHelp.textContent = 'No pudimos verificar este día. No se habilitarán reservas sin una comprobación válida.';
    } finally {
      state.dayLoading = false;
      renderCalendar();
      renderSlots();
      renderSelectionSummary();
    }
  }

  function toggleSlot(slotId, checked) {
    const previous = [...state.selectedSlotIds];
    state.selectedSlotIds = checked
      ? [...previous, slotId]
      : previous.filter((id) => id !== slotId);

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
    updateConfirmationSummary();
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
    bookingFields.disabled = !apiReady;
  }

  function readFormData() {
    const data = new FormData(bookingForm);
    return {
      teacher: data.get('teacher'),
      email: data.get('email'),
      course: data.get('course'),
      subject: data.get('subject'),
      projector: data.has('projector'),
      speakers: data.has('speakers'),
      schoolNotebook: data.has('schoolNotebook'),
      internet: data.has('internet'),
      mode: data.get('mode'),
      repeatUntil: data.get('repeatUntil'),
      observations: data.get('observations')
    };
  }

  function updateEmailKind() {
    const email = teacherEmail.value.trim();
    if (!email) {
      emailKind.textContent = '';
      return;
    }
    if (!rules.isValidEmail(email)) {
      emailKind.textContent = 'Revisá el formato del correo';
      return;
    }
    emailKind.textContent = rules.isInstitutionalEmail(email) ? 'Correo institucional' : 'Correo externo válido';
  }

  function updateModeUi() {
    const mode = bookingForm.querySelector('input[name="mode"]:checked')?.value || 'single';
    repeatUntilWrap.hidden = mode !== 'weekly';
    repeatUntilInput.required = mode === 'weekly';
    if (mode !== 'weekly') repeatUntilInput.value = '';
    updateConfirmationSummary();
  }

  function updateConfirmationSummary() {
    if (!state.selectedDate || state.selectedSlotIds.length === 0) {
      confirmationSummary.innerHTML = '<strong>Revisá fecha y horario antes de confirmar.</strong>';
      return;
    }

    try {
      const range = rules.buildContinuousRange(state.selectedSlotIds);
      const data = readFormData();
      let dateText = formatLongDate(state.selectedDate);
      if (data.mode === 'weekly' && data.repeatUntil) {
        const dates = rules.buildWeeklyDates(state.selectedDate, data.repeatUntil);
        dateText = `${dates.length} fechas semanales · hasta ${formatLongDate(data.repeatUntil)}`;
      }
      confirmationSummary.innerHTML = `<strong>${dateText}</strong><br>${range.start} a ${range.end} · ${range.count} ${range.count === 1 ? 'módulo' : 'módulos'}`;
    } catch (error) {
      confirmationSummary.innerHTML = '<strong>Revisá la selección antes de confirmar.</strong>';
    }
  }

  function errorMessage(error) {
    const code = error && error.message ? error.message : '';
    const messages = {
      INVALID_TEACHER: 'Ingresá apellido y nombre.',
      INVALID_EMAIL: 'Ingresá un correo válido.',
      INVALID_COURSE: 'Ingresá el curso.',
      INVALID_SUBJECT: 'Ingresá la materia o espacio curricular.',
      INVALID_DATE: 'Seleccioná una fecha válida.',
      EMPTY_SELECTION: 'Seleccioná al menos un módulo.',
      INVALID_REPEAT_RANGE: 'Revisá la fecha final de repetición.',
      REPEAT_WINDOW_EXCEEDED: 'La repetición no puede superar la ventana de 60 días.'
    };
    return messages[code] || 'Revisá los datos e intentá nuevamente.';
  }

  async function refreshSelectedDateAfterWrite() {
    const selected = state.selectedDate;
    await loadMonthAvailability();
    if (selected) await selectDate(selected);
  }

  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    bookingResult.hidden = true;

    if (!apiReady) {
      setResult('<strong>Sistema en preparación.</strong><span>Esta versión todavía no puede modificar la planilla ni Google Calendar.</span>', 'pilot');
      return;
    }

    let payload;
    try {
      payload = rules.buildReservationPayload(readFormData(), state);
    } catch (error) {
      setResult(`<strong>No pudimos preparar la reserva.</strong><span>${errorMessage(error)}</span>`, 'error');
      return;
    }

    bookingSubmit.disabled = true;
    bookingSubmit.setAttribute('aria-busy', 'true');
    setResult('<strong>Confirmando disponibilidad…</strong><span>Volvemos a comprobar los módulos antes de guardar.</span>', 'info');

    try {
      const response = await requestJsonp('create', { payload: JSON.stringify(payload) });
      if (!response.ok) {
        if (response.code === 'CONFLICT') {
          setResult('<strong>Ese horario acaba de ocuparse.</strong><span>Actualizamos el calendario para que elijas otra franja.</span>', 'error');
          await refreshSelectedDateAfterWrite();
          return;
        }
        throw new Error(response.code || 'REQUEST_ERROR');
      }

      const conflicts = Array.isArray(response.conflicts) ? response.conflicts : [];
      const conflictText = conflicts.length
        ? `<span>No se pudieron reservar: ${conflicts.map((item) => item.date).join(', ')}.</span>`
        : '<span>Todas las fechas solicitadas quedaron confirmadas.</span>';
      setResult(`<strong>${response.confirmed} de ${response.requested} ${response.requested === 1 ? 'reserva confirmada' : 'reservas confirmadas'}.</strong>${conflictText}<span>La confirmación y el enlace de cancelación se envían al correo indicado.</span>`, 'success');
      await refreshSelectedDateAfterWrite();
    } catch (error) {
      setResult('<strong>No pudimos confirmar la reserva.</strong><span>No se muestra ninguna reserva como confirmada sin respuesta válida del servidor. Intentá nuevamente.</span>', 'error');
    } finally {
      bookingSubmit.disabled = false;
      bookingSubmit.removeAttribute('aria-busy');
    }
  });

  teacherEmail.addEventListener('input', updateEmailKind);
  bookingForm.addEventListener('input', updateConfirmationSummary);
  bookingForm.querySelectorAll('input[name="mode"]').forEach((input) => input.addEventListener('change', updateModeUi));

  prevButton.addEventListener('click', () => {
    state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() - 1, 1);
    state.selectedDate = '';
    state.selectedSlotIds = [];
    loadMonthAvailability();
  });

  nextButton.addEventListener('click', () => {
    state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() + 1, 1);
    state.selectedDate = '';
    state.selectedSlotIds = [];
    loadMonthAvailability();
  });

  renderSlots();
  renderSelectionSummary();
  updateModeUi();
  loadMonthAvailability();
})();
