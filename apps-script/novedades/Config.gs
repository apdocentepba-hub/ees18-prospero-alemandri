var NOVEDADES_SETTINGS_ = Object.freeze({
  SHEET_NAME: 'Novedades',
  CACHE_SECONDS: 120,
  TIME_ZONE: 'America/Argentina/Buenos_Aires'
});

function novedadesSpreadsheetId_() {
  var id = PropertiesService.getScriptProperties().getProperty('NOVEDADES_SPREADSHEET_ID');
  if (!id) throw new Error('MISSING_NOVEDADES_SPREADSHEET_ID');
  return String(id).trim();
}
