// netlify/functions/actualizar-viaje.js
// Actualiza camión, ayudantes y estado de un viaje existente

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
    const { id, camion, ayudantes, estado } = JSON.parse(event.body);
    if (!id) return { statusCode: 400, body: 'ID requerido' };

    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Buscar la fila con ese ID
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const ids = res.data.values || [];
    const rowIndex = ids.findIndex((r, i) => i > 0 && r[0] === id);

    if (rowIndex === -1) {
      return { statusCode: 404, body: 'Viaje no encontrado' };
    }

    // rowIndex es 0-based en el array, pero en Sheets es +1 por header +1 por base-1
    const sheetRow = rowIndex + 1; // ya incluye el offset del header (fila 1)

    // Actualizar columnas: L = Estado (col 12), M = Camión (col 13), N = Ayudantes (col 14)
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `${SHEET_NAME}!L${sheetRow}`, values: [[estado || '']] },
          { range: `${SHEET_NAME}!M${sheetRow}`, values: [[camion || '']] },
          { range: `${SHEET_NAME}!N${sheetRow}`, values: [[ayudantes || '0']] },
        ]
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true }),
    };

  } catch (err) {
    console.error('actualizar-viaje error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
