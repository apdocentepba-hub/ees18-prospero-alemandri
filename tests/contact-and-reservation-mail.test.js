const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const contactHtml = read('contacto.html');
assert(/id="contact-form"/i.test(contactHtml), 'Contacto debe incluir un formulario de contacto');
assert(/type="email"[^>]*name="email"/i.test(contactHtml), 'Contacto debe solicitar un correo electrónico válido');
assert(!/name="email"[^>]*abc\\\.gob\\\.ar/i.test(contactHtml), 'Contacto no debe limitar el correo a @abc.gob.ar');
assert(/name="subject"/i.test(contactHtml), 'Contacto debe solicitar asunto');
assert(/name="message"/i.test(contactHtml), 'Contacto debe solicitar cuerpo del mensaje');
assert(/name="website"/i.test(contactHtml), 'Contacto debe incluir una trampa anti-spam');
assert(contactHtml.includes('assets/js/reservas-config.js'), 'Contacto debe reutilizar la URL del Web App existente');
assert(contactHtml.includes('assets/js/contacto.js'), 'Contacto debe cargar su controlador JavaScript');

const contactJsPath = path.join(root, 'assets/js/contacto.js');
assert(fs.existsSync(contactJsPath), 'Debe existir assets/js/contacto.js');
const contactJs = read('assets/js/contacto.js');
assert(/action[^\n]*contact/i.test(contactJs), 'El formulario debe invocar la acción contact del Web App');
assert(/isValidEmail/i.test(contactJs), 'El frontend debe validar correos generales');

const contactBackendPath = path.join(root, 'apps-script/reservas-audiovisuales/Contact.gs');
assert(fs.existsSync(contactBackendPath), 'Debe existir Contact.gs para procesar mensajes públicos');
const contactBackend = read('apps-script/reservas-audiovisuales/Contact.gs');
assert(contactBackend.includes('secundaria18avellaneda@abc.gob.ar'), 'Los mensajes de contacto deben ir sólo al correo institucional');
assert(/replyTo\s*:\s*contact\.email/.test(contactBackend), 'El correo recibido debe poder responder al remitente mediante Reply-To');
assert(/CONTACT_RATE_LIMITED/.test(contactBackend), 'El backend debe incluir protección básica de frecuencia');
assert(/CONTACT_SPAM_REJECTED/.test(contactBackend), 'El backend debe rechazar el honeypot anti-spam');

const codeGs = read('apps-script/reservas-audiovisuales/Code.gs');
assert(/action\s*===\s*['"]contact['"]/.test(codeGs), 'El Web App debe exponer la acción contact');

const mailGs = read('apps-script/reservas-audiovisuales/Mail.gs');
assert(mailGs.includes('martin.nicolas.podubinio@gmail.com'), 'Audiovisuales debe avisar internamente a Martín');
assert(mailGs.includes('audiovisualesenspa@gmail.com'), 'Audiovisuales debe avisar internamente a audiovisualesenspa@gmail.com');
assert(!/sendReservationInternalNotification_[\s\S]{0,1600}secundaria18avellaneda@abc\.gob\.ar/.test(mailGs), 'Los avisos internos de Audiovisuales no deben ir al correo institucional');
assert(/sendReservationInternalNotification_\(created\)/.test(read('apps-script/reservas-audiovisuales/Reservations.gs')), 'Cada reserva confirmada debe disparar el aviso interno');

console.log('contact-and-reservation-mail.test.js: all assertions passed');
