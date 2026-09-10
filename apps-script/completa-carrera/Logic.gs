function normalizeText_(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength || 300);
}

function normalizeDni_(value) {
  var dni = String(value || '').replace(/\D/g, '');
  if (dni.length < 6 || dni.length > 10) throw new Error('DNI inválido.');
  return dni;
}

function buildStudentFolderName_(dni, apellido, nombre) {
  var safe = (normalizeDni_(dni) + ' - ' + normalizeText_(apellido, 100) + ' ' + normalizeText_(nombre, 100))
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return safe.toUpperCase();
}

function normalizeMaterias_(materias) {
  var clean = (materias || []).map(function(item) {
    return {
      anio: normalizeText_(item && item.anio, 20),
      materia: normalizeText_(item && item.materia, 160)
    };
  }).filter(function(item) {
    return item.anio || item.materia;
  });

  if (!clean.length) throw new Error('Debés indicar al menos una materia.');
  if (clean.length > 3) throw new Error('Se permite un máximo de 3 materias por inscripción.');
  clean.forEach(function(item, index) {
    if (!item.anio || !item.materia) throw new Error('Completá año y materia en la materia ' + (index + 1) + '.');
  });
  return clean;
}

function normalizePlan_(tipo, detalle) {
  var planTipo = normalizeText_(tipo, 30).toLowerCase();
  if (planTipo === 'vigente') return 'Plan vigente';
  if (planTipo === 'otro') {
    var value = normalizeText_(detalle, 160);
    if (!value) throw new Error('Escribí el plan de estudios / año correspondiente.');
    return value;
  }
  throw new Error('Plan de estudios inválido.');
}
