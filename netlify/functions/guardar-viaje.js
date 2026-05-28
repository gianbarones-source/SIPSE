// netlify/functions/guardar-viaje.js
// Guarda un nuevo viaje en Google Sheets

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Viajes';

async function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);

    // Generar ID único
    const id = `VJ-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Verificar/crear hoja y cabeceras
    await ensureHeaders(sheets);

    // Fila de datos
    const row = [
      id,
      data.fecha || '',
      data.hora || '',
      data.cliente || '',
      data.telefono || '',
      data.origen || '',
      data.destino || '',
      data.tipo || '',
      data.precio || '',
      data.detalle_servicios || '',
      data.notas || '',
      data.vendedor || '',
      data.estado || 'confirmado',
      '', // camion (asigna el dueño)
      '', // ayudantes (asigna el dueño)
      data.timestamp || new Date().toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:O`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, id }),
    };

  } catch (err) {
    console.error('guardar-viaje error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

async function ensureHeaders(sheets) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:O1`,
    });
    if (!res.data.values || !res.data.values[0] || res.data.values[0][0] !== 'ID') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:O1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'ID', 'Fecha', 'Hora', 'Cliente', 'Teléfono',
            'Origen', 'Destino', 'Tipo', 'Precio Total', 'Detalle Servicios',
            'Notas', 'Vendedor', 'Estado', 'Camión', 'Ayudantes', 'Timestamp'
          ]]
        }
      });
    }
  } catch(e) {
    // Si la hoja no existe, Sheets la crea en el append
    console.log('ensureHeaders:', e.message);
  }
}
