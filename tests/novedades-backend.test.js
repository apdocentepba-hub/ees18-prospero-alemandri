const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'apps-script', 'novedades');

for (const file of ['Config.gs', 'Data.gs', 'Code.gs']) {
  assert(
    fs.existsSync(path.join(backendDir, file)),
    `RED esperado: falta apps-script/novedades/${file}`
  );
}

const HEADERS = [
  'ID', 'Activa', 'Fecha', 'Fecha visible', 'Prioridad', 'Tipo', 'Título',
  'Bajada', 'Cuerpo', 'Imagen', 'Botón texto', 'Botón URL',
  'Inicio', 'Comunicados', 'Vida escolar', 'Actualizada'
];

const rows = [
  [
    'leer-en-comunidad-2026-09-04', 'Sí', '2026-09-04', '', 20, 'Vida escolar',
    'Leer en Comunidad', 'Jornada de Bibliotecas Escolares Abiertas 2026.',
    'La comunidad educativa compartió una jornada de lectura.',
    'assets/img/leer-en-comunidad-2026-01.jpg', 'Ver actividad', 'vida-escolar.html',
    'Sí', 'No', 'Sí', '2026-09-07 10:00'
  ],
  [
    'whatsapp-2026-09-07', 'Sí', '2026-09-07', '', 30, 'Institucional',
    'Canal oficial de WhatsApp', 'Nuevo canal de novedades de la escuela.',
    'La E.E.S. Nº 18 incorpora un canal de WhatsApp para compartir novedades y avisos institucionales.',
    '', '📢 Seguir el canal de WhatsApp',
    'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l',
    'Sí', 'Sí', 'No', '2026-09-07 11:00'
  ],
  [
    're-bonaerense-2026', 'Sí', '', '2026', 10, 'Proyecto',
    '2.º Encuentro de RE Bonaerense', 'Estudiantes hacen memoria.',
    'La escuela compartió micro relatos desarrollados por estudiantes.',
    'assets/img/re-bonaerense-2024.jpg', 'Ver actividad', 'vida-escolar.html',
    'Sí', 'No', 'Sí', '2026-09-07 09:00'
  ],
  [
    'inactiva', 'No', '2026-09-08', '', 99, 'Institucional',
    'No publicar', 'No debe aparecer.', '', '', '', '',
    'Sí', 'Sí', 'Sí', '2026-09-07 12:00'
  ],
  [
    'solo-comunicados', 'Sí', '2026-09-06', '', 40, 'Comunicado',
    'Sólo comunicados', 'Visible sólo en Comunicados.', '', '', '', '',
    'No', 'Sí', 'No', '2026-09-07 08:00'
  ]
];

let openByIdCalls = 0;
const cache = new Map();

const fakeSheet = {
  getLastRow() { return rows.length + 1; },
  getLastColumn() { return HEADERS.length; },
  getRange(row, column, numRows, numColumns) {
    assert.strictEqual(row, 1);
    assert.strictEqual(column, 1);
    assert.strictEqual(numRows, rows.length + 1);
    assert.strictEqual(numColumns, HEADERS.length);
    return {
      getValues() {
        return [HEADERS.slice(), ...rows.map((item) => item.slice())];
      }
    };
  }
};

const fakeSpreadsheet = {
  getSheetByName(name) {
    return name === 'Novedades' ? fakeSheet : null;
  }
};

function textOutput(content) {
  return {
    content,
    mimeType: '',
    setMimeType(value) {
      this.mimeType = value;
      return this;
    }
  };
}

const context = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty(key) {
          return key === 'NOVEDADES_SPREADSHEET_ID' ? 'sheet-news-production' : '';
        }
      };
    }
  },
  SpreadsheetApp: {
    openById(id) {
      assert.strictEqual(id, 'sheet-news-production');
      openByIdCalls += 1;
      return fakeSpreadsheet;
    }
  },
  CacheService: {
    getScriptCache() {
      return {
        get(key) { return cache.has(key) ? cache.get(key) : null; },
        put(key, value, seconds) {
          assert.strictEqual(seconds, 120);
          cache.set(key, value);
        }
      };
    }
  },
  Utilities: {
    formatDate(value, _timezone, pattern) {
      const date = value instanceof Date ? value : new Date(value);
      if (pattern === 'yyyy-MM-dd') return date.toISOString().slice(0, 10);
      throw new Error(`Unsupported test date format: ${pattern}`);
    }
  },
  ContentService: {
    MimeType: { JSON: 'application/json', JAVASCRIPT: 'application/javascript' },
    createTextOutput: textOutput
  }
});

for (const file of ['Config.gs', 'Data.gs', 'Code.gs']) {
  vm.runInContext(fs.readFileSync(path.join(backendDir, file), 'utf8'), context, { filename: file });
}

assert.strictEqual(context.normalizeNewsYesNo_('Sí'), true);
assert.strictEqual(context.normalizeNewsYesNo_('SI'), true);
assert.strictEqual(context.normalizeNewsYesNo_('No'), false);
assert.strictEqual(context.safePublicNewsUrl_('javascript:alert(1)'), '');
assert.strictEqual(
  context.safePublicNewsUrl_('assets/img/re-bonaerense-2024.jpg'),
  'assets/img/re-bonaerense-2024.jpg'
);
assert.strictEqual(
  context.safePublicNewsUrl_('https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l'),
  'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l'
);

const home = context.buildPublicNews_('inicio', HEADERS, rows);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(home.map((item) => item.id))),
  ['whatsapp-2026-09-07', 'leer-en-comunidad-2026-09-04', 're-bonaerense-2026']
);
assert.strictEqual(home[2].date, '');
assert.strictEqual(home[2].dateDisplay, '2026');
assert.strictEqual(home.some((item) => item.id === 'inactiva'), false);
assert.strictEqual(home.some((item) => item.id === 'solo-comunicados'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(home[0], 'Activa'), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(home[0], 'Actualizada'), false);
assert.throws(() => context.buildPublicNews_('otra-seccion', HEADERS, rows), /INVALID_SECTION/);

const comunicados = context.buildPublicNews_('comunicados', HEADERS, rows);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(comunicados.map((item) => item.id))),
  ['solo-comunicados', 'whatsapp-2026-09-07']
);

const firstRead = context.getPublicNews_('inicio');
const secondRead = context.getPublicNews_('inicio');
assert.strictEqual(firstRead.ok, true);
assert.strictEqual(secondRead.ok, true);
assert.strictEqual(openByIdCalls, 1, 'el backend debe reutilizar el caché público en la misma ejecución');
assert.strictEqual(firstRead.items.length, 3);

const jsonp = context.doGet({ parameter: { section: 'inicio', callback: 'cbNews' } });
assert.strictEqual(jsonp.mimeType, 'application/javascript');
assert(jsonp.content.startsWith('cbNews({'));
assert(jsonp.content.endsWith(');'));

const invalidCallback = context.doGet({ parameter: { section: 'inicio', callback: 'alert(1)' } });
assert.strictEqual(invalidCallback.mimeType, 'application/json');
assert(invalidCallback.content.startsWith('{'));

assert.strictEqual(typeof context.doPost, 'undefined', 'Novedades no debe exponer escritura pública por POST');

console.log('novedades-backend.test.js: all assertions passed');
