const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const comunicados = fs.readFileSync(path.join(root, 'comunicados.html'), 'utf8');
const channelUrl = 'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l';

assert(home.includes(channelUrl), 'Inicio debe incluir el enlace oficial al canal de WhatsApp');
assert(/Seguir el canal de WhatsApp/i.test(home), 'Inicio debe mostrar un botón para seguir el canal de WhatsApp');
assert(comunicados.includes(channelUrl), 'Comunicados debe incluir el enlace oficial al canal de WhatsApp');
assert(/Canal oficial de WhatsApp/i.test(comunicados), 'Comunicados debe anunciar el canal oficial de WhatsApp');
assert(/7 de septiembre de 2026/i.test(comunicados), 'La novedad del canal debe tener fecha visible');

console.log('whatsapp-channel.test.js: all assertions passed');
