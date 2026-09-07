var RESERVATION_INTERNAL_NOTIFICATION_RECIPIENTS_ = [
  'martin.nicolas.podubinio@gmail.com',
  'audiovisualesenspa@gmail.com'
];

function reservationCancellationUrl_(rawToken) {
  return 'https://ees18avellaneda.edu.ar/cancelar-reserva.html?token=' + encodeURIComponent(rawToken);
}

function reservationConfirmationBody_(reservation, rawToken) {
  return [
    'Tu reserva del Salón de Audiovisuales quedó confirmada.',
    '',
    'Fecha: ' + reservationDateDisplay_(reservation.date),
    'Horario: ' + reservation.start + ' a ' + reservation.end,
    'Curso: ' + reservation.course,
    'Materia: ' + reservation.subject,
    'Recursos: ' + reservationResourcesText_(reservation.resources),
    '',
    'Si necesitás cambiarla, primero cancelala desde este enlace y luego hacé una nueva reserva:',
    reservationCancellationUrl_(rawToken),
    '',
    'ID de reserva: ' + reservation.id,
    '',
    'E.E.S. Nº 18 “Próspero Alemandri”'
  ].join('\n');
}

function reservationInternalNotificationBody_(reservation) {
  return [
    'Nueva reserva confirmada del Salón de Audiovisuales.',
    '',
    'Fecha: ' + reservationDateDisplay_(reservation.date),
    'Horario: ' + reservation.start + ' a ' + reservation.end,
    'Docente: ' + reservation.teacher,
    'Correo docente: ' + reservation.email,
    'Curso: ' + reservation.course,
    'Materia: ' + reservation.subject,
    'Recursos: ' + reservationResourcesText_(reservation.resources),
    'Observaciones: ' + (reservation.observations || 'Sin observaciones'),
    '',
    'ID de reserva: ' + reservation.id
  ].join('\n');
}

function sendReservationConfirmation_(reservation, rawToken) {
  try {
    MailApp.sendEmail({
      to: reservation.email,
      subject: 'Reserva confirmada · Salón de Audiovisuales',
      body: reservationConfirmationBody_(reservation, rawToken),
      name: 'E.E.S. Nº 18 · Reservas'
    });

    updateReservationFieldsById_(reservation.id, {
      mailSent: 'Sí',
      syncState: reservation.syncState === 'PENDIENTE_CALENDAR' ? 'PENDIENTE_CALENDAR' : 'OK',
      syncError: reservation.syncError || ''
    }, reservation.rowNumber);
    return { ok: true };
  } catch (error) {
    var message = String(error && error.message ? error.message : error).slice(0, 220);
    updateReservationFieldsById_(reservation.id, {
      mailSent: 'No',
      syncState: reservation.syncState === 'PENDIENTE_CALENDAR' ? 'PENDIENTE_CALENDAR' : 'MAIL_PENDING',
      syncError: 'MAIL_PENDING: ' + message
    }, reservation.rowNumber);
    return { ok: false, error: message };
  }
}

function sendReservationInternalNotification_(reservation) {
  try {
    MailApp.sendEmail({
      to: RESERVATION_INTERNAL_NOTIFICATION_RECIPIENTS_.join(','),
      subject: 'Nueva reserva confirmada · Salón Audiovisuales',
      body: reservationInternalNotificationBody_(reservation),
      name: 'E.E.S. Nº 18 · Reservas'
    });
    return { ok: true };
  } catch (error) {
    console.error('No se pudo enviar el aviso interno de Audiovisuales', error);
    return { ok: false, error: String(error && error.message ? error.message : error).slice(0, 220) };
  }
}

function sendCancellationConfirmation_(reservation) {
  try {
    MailApp.sendEmail({
      to: reservation.email,
      subject: 'Reserva cancelada · Salón de Audiovisuales',
      body: [
        'La reserva del Salón de Audiovisuales fue cancelada.',
        '',
        'Fecha: ' + reservationDateDisplay_(reservation.date),
        'Horario: ' + reservation.start + ' a ' + reservation.end,
        'Curso: ' + reservation.course,
        'Materia: ' + reservation.subject,
        '',
        'El horario volvió a quedar disponible.',
        'Podés hacer una nueva reserva desde:',
        'https://ees18avellaneda.edu.ar/reservas-audiovisuales.html',
        '',
        'E.E.S. Nº 18 “Próspero Alemandri”'
      ].join('\n'),
      name: 'E.E.S. Nº 18 · Reservas'
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error).slice(0, 220) };
  }
}
