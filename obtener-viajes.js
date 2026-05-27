// netlify/functions/obtener-viajes.js
// Lee viajes desde Google Sheets. Puede filtrar por fecha.

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Viajes';

const COLS = {
  id: 0, fecha: 1, hora: 2, cliente: 3, telefono: 4,
  origen: 5, destino: 6, tipo: 7, precio: 8, notas: 9,
  vendedor: 10, estado: 11, camion: 12, ayudantes: 13, timestamp: 14,
};

async function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return auth;
}

exports.handler = async (event) => {
  const fecha = event.queryStringParameters?.fecha || null;

  try {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:O`,
    });

    const rows = res.data.values || [];

    let viajes = rows
      .filter(r => r[COLS.id]) // filas con ID válido
      .map(r => ({
        id:         r[COLS.id]        || '',
        fecha:      r[COLS.fecha]     || '',
        hora:       r[COLS.hora]      || '',
        cliente:    r[COLS.cliente]   || '',
        telefono:   r[COLS.telefono]  || '',
        origen:     r[COLS.origen]    || '',
        destino:    r[COLS.destino]   || '',
        tipo:       r[COLS.tipo]      || '',
        precio:     r[COLS.precio]    || '',
        notas:      r[COLS.notas]     || '',
        vendedor:   r[COLS.vendedor]  || '',
        estado:     r[COLS.estado]    || 'confirmado',
        camion:     r[COLS.camion]    || '',
        ayudantes:  r[COLS.ayudantes] || '0',
        timestamp:  r[COLS.timestamp] || '',
      }));

    // Filtrar por fecha si se pasó parámetro
    if (fecha) {
      viajes = viajes.filter(v => v.fecha === fecha);
    }

    // Ordenar por fecha y hora
    viajes.sort((a, b) => {
      const da = (a.fecha + a.hora);
      const db = (b.fecha + b.hora);
      return da.localeCompare(db);
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(viajes),
    };

  } catch (err) {
    console.error('obtener-viajes error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
