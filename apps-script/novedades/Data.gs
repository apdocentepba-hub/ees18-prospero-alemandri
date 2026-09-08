function normalizeNewsYesNo_(value) {
  var text = String(value == null ? '' : value).trim().toUpperCase();
  return value === true || text === 'SÍ' || text === 'SI' || text === 'TRUE' || text === '1';
}

function safePublicNewsUrl_(value) {
  var text = String(value == null ? '' : value).trim();
  if (!text) return '';
  if (/^https:\/\//i.test(text)) return text;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(text)) return '';
  if (/^\/\//.test(text) || /^\//.test(text)) return '';
  if (/(^|\/)\.\.(\/|$)/.test(text)) return '';
  if (/^[A-Za-z0-9._~!$&'()*+,;=:@/?#%\-]+$/.test(text)) return text;
  return '';
}

function newsText_(value, maxLength) {
  var text = String(value == null ? '' : value).trim();
  return maxLength && text.length > maxLength ? text.slice(0, maxLength) : text;
}

function newsHeaderKey_(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function newsHeaderMap_(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i += 1) {
    map[newsHeaderKey_(headers[i])] = i;
  }
  return map;
}

function newsCell_(row, map, header) {
  var index = map[newsHeaderKey_(header)];
  return typeof index === 'number' ? row[index] : '';
}

function normalizeNewsDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, NOVEDADES_SETTINGS_.TIME_ZONE, 'yyyy-MM-dd');
  }

  var text = String(value == null ? '' : value).trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  var match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return match[3] + '-' + String(match[2]).padStart(2, '0') + '-' + String(match[1]).padStart(2, '0');
  }
  return '';
}

function newsDateDisplay_(isoDate, explicitDisplay) {
  var explicit = newsText_(explicitDisplay, 80);
  if (explicit) return explicit;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || '')) return '';

  var parts = isoDate.split('-');
  var monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  var monthIndex = Number(parts[1]) - 1;
  if (monthIndex < 0 || monthIndex >= monthNames.length) return isoDate;
  return Number(parts[2]) + ' de ' + monthNames[monthIndex] + ' de ' + parts[0];
}

function newsSectionHeader_(section) {
  var normalized = String(section || '').trim().toLowerCase();
  var headers = {
    'inicio': 'Inicio',
    'comunicados': 'Comunicados',
    'vida-escolar': 'Vida escolar'
  };
  if (!headers[normalized]) throw new Error('INVALID_SECTION');
  return { key: normalized, header: headers[normalized] };
}

function buildPublicNews_(section, headers, rows) {
  var sectionInfo = newsSectionHeader_(section);
  var map = newsHeaderMap_(headers || []);
  var ranked = [];

  for (var rowIndex = 0; rowIndex < (rows || []).length; rowIndex += 1) {
    var row = rows[rowIndex] || [];
    if (!normalizeNewsYesNo_(newsCell_(row, map, 'Activa'))) continue;
    if (!normalizeNewsYesNo_(newsCell_(row, map, sectionInfo.header))) continue;

    var id = newsText_(newsCell_(row, map, 'ID'), 120);
    var title = newsText_(newsCell_(row, map, 'Título'), 180);
    if (!id || !title) continue;

    var date = normalizeNewsDate_(newsCell_(row, map, 'Fecha'));
    var explicitDateDisplay = newsText_(newsCell_(row, map, 'Fecha visible'), 80);
    if (!date && !explicitDateDisplay) continue;

    var priority = Number(newsCell_(row, map, 'Prioridad'));
    if (!isFinite(priority)) priority = 0;

    ranked.push({
      rowOrder: rowIndex,
      item: {
        id: id,
        date: date,
        dateDisplay: newsDateDisplay_(date, explicitDateDisplay),
        priority: priority,
        type: newsText_(newsCell_(row, map, 'Tipo'), 80),
        title: title,
        summary: newsText_(newsCell_(row, map, 'Bajada'), 400),
        body: newsText_(newsCell_(row, map, 'Cuerpo'), 2400),
        image: safePublicNewsUrl_(newsCell_(row, map, 'Imagen')),
        buttonText: newsText_(newsCell_(row, map, 'Botón texto'), 100),
        buttonUrl: safePublicNewsUrl_(newsCell_(row, map, 'Botón URL'))
      }
    });
  }

  ranked.sort(function (a, b) {
    if (a.item.priority !== b.item.priority) return b.item.priority - a.item.priority;
    if (a.item.date !== b.item.date) return a.item.date < b.item.date ? 1 : -1;
    return a.rowOrder - b.rowOrder;
  });

  return ranked.map(function (entry) { return entry.item; });
}

function getPublicNews_(section) {
  var sectionInfo = newsSectionHeader_(section);
  var cache = CacheService.getScriptCache();
  var cacheKey = 'novedades-public-v1:' + sectionInfo.key;
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.ok === true && Array.isArray(parsed.items)) return parsed;
    } catch (error) {
      // Ignore corrupted cache and rebuild from the source sheet.
    }
  }

  var spreadsheet = SpreadsheetApp.openById(novedadesSpreadsheetId_());
  var sheet = spreadsheet.getSheetByName(NOVEDADES_SETTINGS_.SHEET_NAME);
  if (!sheet) throw new Error('MISSING_NOVEDADES_SHEET');

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var items = [];

  if (lastRow >= 2 && lastColumn >= 1) {
    var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
    items = buildPublicNews_(sectionInfo.key, values[0] || [], values.slice(1));
  }

  var payload = { ok: true, section: sectionInfo.key, items: items };
  cache.put(cacheKey, JSON.stringify(payload), NOVEDADES_SETTINGS_.CACHE_SECONDS);
  return payload;
}
