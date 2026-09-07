const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'apps-script', 'reservas-audiovisuales');
const sent = [];
const cacheValues = new Map();

const context = vm.createContext({
  console,
  String,
  Object,
  Array,
  RegExp,
  Error,
  MailApp: {
    sendEmail(message) {
      sent.push({ ...message });
    }
  },
  CacheService: {
    getScriptCache() {
      return {
        get(key) { return cacheValues.get(key) || null; },
        put(key, value) { cacheValues.set(key, value); }
      };
    }
  },
  reservationDateDisplay_(date) { return date; },
  reservationResourcesText_() { return 'Sin recursos adicionales informados'; },
  updateReservationFieldsById_() {}
});

for (const file of ['Contact.gs', 'Mail.gs']) {
  vm.runInContext(fs.readFileSync(path.join(backend, file), 'utf8'), context, { filename: file });
}

assert.strictEqual(context.isValidPublicContactEmail_('familia@gmail.com'), true);
assert.strictEqual(context.isValidPublicContactEmail_('familia@hotmail.com'), true);
assert.strictEqual(context.isValidPublicContactEmail_('familia@yahoo.com'), true);
assert.strictEqual(context.isValidPublicContactEmail_('docente@abc.gob.ar'), true);
assert.strictEqual(context.isValidPublicContactEmail_('correo-invalido'), false);

const contactResult = context.sendPublicContact_({
  email: 'familia@hotmail.com',
  subject: 'Consulta por inscripción',
  message: 'Quisiera consultar documentación necesaria.',
  website: ''
});
assert.strictEqual(contactResult.ok, true);
assert.strictEqual(sent.length, 1);
assert.strictEqual(sent[0].to, 'secundaria18avellaneda@abc.gob.ar');
assert.strictEqual(sent[0].replyTo, 'familia@hotmail.com');
assert(sent[0].subject.includes('Consulta por inscripción'));

assert.throws(
  () => context.sendPublicContact_({ email: 'familia@hotmail.com', subject: 'Otra', message: 'Mensaje', website: '' }),
  /CONTACT_RATE_LIMITED/
);
assert.throws(
  () => context.normalizePublicContact_({ email: 'bot@example.com', subject: 'Spam', message: 'Spam', website: 'https://spam.example' }),
  /CONTACT_SPAM_REJECTED/
);

sent.length = 0;
const internalResult = context.sendReservationInternalNotification_({
  id: 'r-1',
  date: '2026-09-07',
  start: '08:30',
  end: '09:30',
  teacher: 'Docente Prueba',
  email: 'docente@abc.gob.ar',
  course: '4° 2°',
  subject: 'Historia',
  resources: {},
  observations: ''
});
assert.strictEqual(internalResult.ok, true);
assert.strictEqual(sent.length, 1);
const recipients = sent[0].to.split(',').map((value) => value.trim()).sort();
assert.deepStrictEqual(recipients, ['audiovisualesenspa@gmail.com', 'martin.nicolas.podubinio@gmail.com']);
assert(!sent[0].to.includes('secundaria18avellaneda@abc.gob.ar'));

console.log('contact-backend.test.js: all assertions passed');
