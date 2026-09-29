const DEFAULT_CATALOGO_PRIMARIAS_URL = 'https://raw.githubusercontent.com/apdocentepba-hub/ees18-prospero-alemandri/main/data/preinscripcion-2027-primarias.json';

function configurarPreinscripcion2027(spreadsheetId, catalogUrl) {
  const cleanSpreadsheetId = normalizarTexto_(spreadsheetId, 200);
  if (!cleanSpreadsheetId) throw new Error('Debés indicar el ID de la planilla de Google Sheets.');

  SpreadsheetApp.openById(cleanSpreadsheetId);
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    PREINSCRIPCION_SPREADSHEET_ID: cleanSpreadsheetId,
    PREINSCRIPCION_SHEET_NAME: PREINSCRIPCION_SHEET_NAME,
    PREINSCRIPCION_CATALOGO_SHEET_NAME: 'CatalogoPrimarias',
    PREINSCRIPCION_CATALOGO_URL: normalizarTexto_(catalogUrl, 500) || DEFAULT_CATALOGO_PRIMARIAS_URL
  }, false);

  prepararHojaPreinscripciones2027();
  actualizarCatalogoPrimarias2027();
  return 'Configuración guardada. Hoja de preinscripciones y catálogo de primarias preparados.';
}

function prepararHojaPreinscripciones2027() {
  const config = getPreinscripcionConfig_();
  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  let sheet = spreadsheet.getSheetByName(config.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(config.sheetName);

  prepararEncabezadosEstricto_(sheet, PREINSCRIPCION_HEADERS, config.sheetName);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, PREINSCRIPCION_HEADERS.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, PREINSCRIPCION_HEADERS.length).setBackground('#0f3f62').setFontColor('#ffffff');
  sheet.autoResizeColumns(1, PREINSCRIPCION_HEADERS.length);
  sheet.setColumnWidth(headerIndex_('Apellido y nombre del ingresante'), 240);
  sheet.setColumnWidth(headerIndex_('Escuela de procedencia'), 300);
  sheet.setColumnWidth(headerIndex_('Apellido y nombre del adulto responsable'), 260);
  sheet.setColumnWidth(headerIndex_('Correo electrónico'), 240);
  return 'Hoja ' + config.sheetName + ' preparada.';
}

function prepararEncabezadosEstricto_(sheet, headers, label) {
  const lastColumn = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  const width = Math.max(lastColumn, headers.length);
  const existing = width > 0 ? sheet.getRange(1, 1, 1, width).getDisplayValues()[0] : [];
  const hasHeader = existing.some(function(value) { return String(value || '').trim() !== ''; });

  if (hasHeader) {
    headers.forEach(function(header, index) {
      if (String(existing[index] || '').trim() !== header) {
        throw new Error('La hoja ' + label + ' tiene encabezados distintos en la columna ' + (index + 1) + '. No se modificó nada.');
      }
    });
    return;
  }

  if (lastRow > 1) {
    throw new Error('La hoja ' + label + ' contiene datos pero no tiene los encabezados esperados. No se modificó nada.');
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function actualizarCatalogoPrimarias2027(catalogUrl) {
  const config = getPreinscripcionConfig_();
  const props = PropertiesService.getScriptProperties();
  const url = normalizarTexto_(catalogUrl, 500) || props.getProperty('PREINSCRIPCION_CATALOGO_URL') || DEFAULT_CATALOGO_PRIMARIAS_URL;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('No se pudo descargar el catálogo de primarias. HTTP ' + status + '.');

  let catalog;
  try {
    catalog = JSON.parse(response.getContentText('UTF-8'));
  } catch (error) {
    throw new Error('El catálogo de primarias descargado no es JSON válido.');
  }
  if (!Array.isArray(catalog) || catalog.length < 1000) {
    throw new Error('El catálogo de primarias parece incompleto. No se reemplazó el catálogo actual.');
  }

  const validDistricts = {};
  getDistritos().forEach(function(item) { validDistricts[item.codigo] = true; });
  const rows = catalog.map(function(item) {
    const codigo = Number(item.distritoCodigo);
    if (!validDistricts[codigo] || !item.id || !item.nombre || !item.gestion) {
      throw new Error('El catálogo contiene un registro inválido. No se reemplazó el catálogo actual.');
    }
    return [
      codigo,
      String(item.distrito || nombreDistrito_(codigo)),
      String(item.id),
      String(item.nombre),
      String(item.gestion),
      String(item.clave || ''),
      String(item.cueAnexo || ''),
      String(item.nroEscuela || ''),
      String(item.modalidad || ''),
      String(item.localidad || '')
    ];
  });

  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  let sheet = spreadsheet.getSheetByName(config.catalogSheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(config.catalogSheetName);

  const existingHeader = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), CATALOGO_PRIMARIAS_HEADERS.length)).getDisplayValues()[0]
    : [];
  const hasHeader = existingHeader.some(function(value) { return String(value || '').trim() !== ''; });
  if (hasHeader) {
    CATALOGO_PRIMARIAS_HEADERS.forEach(function(header, index) {
      if (String(existingHeader[index] || '').trim() !== header) {
        throw new Error('La hoja CatalogoPrimarias tiene una estructura distinta. No se modificó nada.');
      }
    });
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, CATALOGO_PRIMARIAS_HEADERS.length).setValues([CATALOGO_PRIMARIAS_HEADERS]);
  const chunkSize = 1000;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    sheet.getRange(start + 2, 1, chunk.length, CATALOGO_PRIMARIAS_HEADERS.length).setValues(chunk);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, CATALOGO_PRIMARIAS_HEADERS.length).setFontWeight('bold').setBackground('#dcebf2');
  sheet.autoResizeColumns(1, CATALOGO_PRIMARIAS_HEADERS.length);
  props.setProperty('PREINSCRIPCION_CATALOGO_URL', url);
  props.setProperty('PREINSCRIPCION_CATALOGO_ACTUALIZADO', new Date().toISOString());
  CacheService.getScriptCache().removeAll(getDistritos().map(function(item) { return 'primarias-2027-distrito-' + item.codigo; }));
  return 'Catálogo actualizado: ' + rows.length + ' escuelas primarias.';
}
