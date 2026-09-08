const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const comunicados = fs.readFileSync(path.join(root, 'comunicados.html'), 'utf8');
const backendContract = fs.readFileSync(path.join(root, 'tests', 'novedades-backend.test.js'), 'utf8');
const channelUrl = 'https://whatsapp.com/channel/0029Vb7rBLn8kyyFXGBB2d1l';

assert(home.includes(channelUrl), 'Inicio debe conservar el acceso directo al canal de WhatsApp');
assert(/Seguir el canal de WhatsApp/i.test(home), 'Inicio debe mostrar un botón para seguir el canal de WhatsApp');
assert(comunicados.includes('data-news-section="comunicados"'), 'Comunicados debe obtener publicaciones desde la fuente administrable');
assert(backendContract.includes(channelUrl), 'El contrato editorial inicial debe incluir el enlace oficial al canal');
assert(/whatsapp-2026-09-07/.test(backendContract), 'El canal debe tener un ID editorial estable');
assert(/Canal oficial de WhatsApp/i.test(backendContract), 'La publicación inicial debe conservar el título del canal');
assert(/2026-09-07/.test(backendContract), 'La publicación inicial del canal debe conservar la fecha correcta');

console.log('whatsapp-channel.test.js: all assertions passed');
