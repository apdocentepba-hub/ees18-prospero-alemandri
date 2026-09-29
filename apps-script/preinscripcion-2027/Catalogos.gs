const DISTRITOS_PREINSCRIPCION_2027 = [
  [108,'25 DE MAYO'],[2,'ADOLFO ALSINA'],[3,'ALBERTI'],[4,'ALMIRANTE BROWN'],[11,'ARRECIFES'],[5,'AVELLANEDA'],[6,'AYACUCHO'],[7,'AZUL'],[8,'BAHIA BLANCA'],[9,'BALCARCE'],[10,'BARADERO'],[119,'BERAZATEGUI'],[113,'BERISSO'],[12,'BOLIVAR'],[13,'BRAGADO'],[14,'BRANDSEN'],[15,'CAMPANA'],[16,'CAÑUELAS'],[17,'CARLOS CASARES'],[18,'CARLOS TEJEDOR'],[19,'CARMEN DE ARECO'],[21,'CASTELLI'],[26,'CHACABUCO'],[27,'CHASCOMUS'],[28,'CHIVILCOY'],[22,'COLON'],[23,'CORONEL DORREGO'],[24,'CORONEL PRINGLES'],[112,'CORONEL ROSALES'],[121,'CORONEL SARMIENTO'],[25,'CORONEL SUAREZ'],[20,'DAIREAUX'],[29,'DOLORES'],[114,'ENSENADA'],[116,'ESCOBAR'],[30,'ESTEBAN ECHEVERRIA'],[31,'EXALTACION DE LA CRUZ'],[130,'EZEIZA'],[32,'FLORENCIO VARELA'],[128,'FLORENTINO AMEGHINO'],[33,'GENERAL ALVARADO'],[34,'GENERAL ALVEAR'],[35,'GENERAL ARENALES'],[36,'GENERAL BELGRANO'],[37,'GENERAL GUIDO'],[38,'GENERAL LAMADRID'],[39,'GENERAL LAVALLE'],[40,'GENERAL MADARIAGA'],[41,'GENERAL PAZ'],[42,'GENERAL PINTO'],[43,'GENERAL PUEYRREDON'],[44,'GENERAL RODRIGUEZ'],[45,'GENERAL SAN MARTIN'],[46,'GENERAL SARMIENTO'],[48,'GENERAL VIAMONTE'],[49,'GENERAL VILLEGAS'],[50,'GONZALES CHAVES'],[51,'GUAMINI'],[118,'HIPOLITO YRIGOYEN'],[135,'HURLINGHAM'],[122,'ISLAS'],[136,'ITUZAINGO'],[132,'JOSE C. PAZ'],[52,'JUAREZ'],[53,'JUNIN'],[1,'LA PLATA'],[111,'LANUS'],[54,'LAPRIDA'],[56,'LAS FLORES'],[57,'LAS HERAS'],[58,'LEANDRO N. ALEM'],[137,'LEZAMA'],[59,'LINCOLN'],[60,'LOBERIA'],[61,'LOBOS'],[62,'LOMAS DE ZAMORA'],[63,'LUJAN'],[64,'MAGDALENA'],[65,'MAIPU'],[133,'MALVINAS ARGENTINAS'],[68,'MAR CHIQUITA'],[67,'MARCOS PAZ'],[69,'MATANZA'],[70,'MERCEDES'],[71,'MERLO'],[72,'MONTE'],[126,'MONTE HERMOSO'],[73,'MORENO'],[100,'MORON'],[74,'NAVARRO'],[75,'NECOCHEA'],[76,'NUEVE DE JULIO'],[77,'OLAVARRIA'],[123,'PARTIDO DE LA COSTA'],[78,'PATAGONES'],[79,'PEHUAJO'],[80,'PELLEGRINI'],[81,'PERGAMINO'],[82,'PILA'],[83,'PILAR'],[124,'PINAMAR'],[129,'PRESIDENTE PERON'],[84,'PUAN'],[134,'PUNTA INDIO'],[85,'QUILMES'],[86,'RAMALLO'],[87,'RAUCH'],[88,'RIVADAVIA'],[89,'ROJAS'],[90,'ROQUE PEREZ'],[91,'SAAVEDRA'],[92,'SALADILLO'],[120,'SALLIQUELO'],[66,'SALTO'],[93,'SAN ANDRES DE GILES'],[94,'SAN ANTONIO DE ARECO'],[115,'SAN CAYETANO'],[95,'SAN FERNANDO'],[96,'SAN ISIDRO'],[131,'SAN MIGUEL'],[97,'SAN NICOLAS'],[98,'SAN PEDRO'],[99,'SAN VICENTE'],[101,'SUIPACHA'],[102,'TANDIL'],[103,'TAPALQUE'],[55,'TIGRE'],[104,'TORDILLO'],[105,'TORNQUIST'],[106,'TRENQUE LAUQUEN'],[107,'TRES ARROYOS'],[117,'TRES DE FEBRERO'],[127,'TRES LOMAS'],[109,'VICENTE LOPEZ'],[125,'VILLA GESELL'],[110,'VILLARINO'],[47,'ZARATE']
];

const OTRA_ESCUELA_ID = 'OTRA';
const CATALOGO_PRIMARIAS_HEADERS = [
  'Código distrito','Distrito','ID escuela','Escuela','Gestión','Clave','CUE-anexo','Nº escuela','Modalidad','Municipio'
];

function getDistritos() {
  return DISTRITOS_PREINSCRIPCION_2027.map(function(item) {
    return { codigo: item[0], nombre: item[1] };
  });
}

function normalizarCodigoDistrito_(value) {
  const codigo = Number(String(value == null ? '' : value).replace(/\D/g, ''));
  const existe = DISTRITOS_PREINSCRIPCION_2027.some(function(item) { return item[0] === codigo; });
  if (!Number.isInteger(codigo) || !existe) throw new Error('Distrito inválido.');
  return codigo;
}

function nombreDistrito_(codigo) {
  const item = DISTRITOS_PREINSCRIPCION_2027.find(function(row) { return row[0] === codigo; });
  if (!item) throw new Error('Distrito inválido.');
  return item[1];
}

function getCatalogoPrimariasSheet_() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('PREINSCRIPCION_SPREADSHEET_ID');
  const sheetName = props.getProperty('PREINSCRIPCION_CATALOGO_SHEET_NAME') || 'CatalogoPrimarias';
  if (!spreadsheetId) throw new Error('Falta configurar PREINSCRIPCION_SPREADSHEET_ID.');
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  if (!sheet) throw new Error('No se encontró la pestaña ' + sheetName + '. Ejecutá actualizarCatalogoPrimarias2027().');
  return sheet;
}

function getPrimariasPorDistrito(codigoDistrito) {
  const codigo = normalizarCodigoDistrito_(codigoDistrito);
  const cache = CacheService.getScriptCache();
  const cacheKey = 'primarias-2027-distrito-' + codigo;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const sheet = getCatalogoPrimariasSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0].map(function(value) { return String(value || '').trim(); });
  CATALOGO_PRIMARIAS_HEADERS.forEach(function(expected, index) {
    if (headers[index] !== expected) throw new Error('Encabezado inválido en CatalogoPrimarias: se esperaba “' + expected + '”.');
  });

  const result = values.slice(1).filter(function(row) {
    return Number(row[0]) === codigo;
  }).map(function(row) {
    return {
      id: String(row[2] || '').trim(),
      nombre: String(row[3] || '').trim(),
      gestion: String(row[4] || '').trim(),
      clave: String(row[5] || '').trim(),
      cueAnexo: String(row[6] || '').trim(),
      nroEscuela: String(row[7] || '').trim(),
      modalidad: String(row[8] || '').trim(),
      municipio: String(row[9] || '').trim()
    };
  }).filter(function(item) {
    return item.id && item.nombre;
  }).sort(function(a, b) {
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base', numeric: true });
  });

  const serialized = JSON.stringify(result);
  if (serialized.length < 95000) cache.put(cacheKey, serialized, 21600);
  return result;
}

function resolverEscuela_(codigoDistrito, escuelaId, escuelaManual) {
  const codigo = normalizarCodigoDistrito_(codigoDistrito);
  const id = String(escuelaId == null ? '' : escuelaId).trim();

  if (id === OTRA_ESCUELA_ID) {
    const manual = String(escuelaManual == null ? '' : escuelaManual).trim().slice(0, 180);
    if (!manual) throw new Error('Indicá el nombre de la escuela de procedencia.');
    return {
      distritoCodigo: codigo,
      distrito: nombreDistrito_(codigo),
      id: OTRA_ESCUELA_ID,
      nombre: manual,
      gestion: 'Otra / no informada',
      clave: '',
      cueAnexo: '',
      nroEscuela: '',
      modalidad: '',
      municipio: ''
    };
  }

  if (!id) throw new Error('Seleccioná la escuela de procedencia.');
  const escuela = getPrimariasPorDistrito(codigo).find(function(item) { return item.id === id; });
  if (!escuela) throw new Error('La escuela seleccionada no pertenece al distrito indicado o ya no está disponible.');

  return Object.assign({
    distritoCodigo: codigo,
    distrito: nombreDistrito_(codigo)
  }, escuela);
}
