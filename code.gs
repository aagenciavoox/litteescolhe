
/**
 * Litte Escolhe - Backend Google Sheets
 * Este código deve ser colado no editor do Apps Script da planilha.
 */

const SHEETS_CONFIG = {
  'Livros': ['book_id', 'título', 'autor', 'capa_url', 'sinopse', 'gêneros', 'tags', 'data_lançamento', 'status', 'destaque'],
  'Usuários': ['user_id', 'nome', 'email', 'senha', 'tipo', 'ativo'],
  'Ideias': ['idea_id', 'user_id', 'book_id', 'ideia_texto', 'tipo_conteúdo', 'status', 'data_envio']
};

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Object.keys(SHEETS_CONFIG).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Se a aba estiver vazia, cria os cabeçalhos
    if (sheet.getLastRow() === 0) {
      const headers = SHEETS_CONFIG[sheetName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      
      // Cria usuário admin padrão
      if (sheetName === 'Usuários') {
        sheet.appendRow(['u1', 'Admin Litte', 'admin@litte.com', 'admin', 'admin', 'TRUE']);
      }
    }
  });
}

function doGet(e) {
  setupSheets();
  const action = e.parameter.action;
  
  if (action === 'getDB') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const db = {
      books: getRows(ss.getSheetByName('Livros')),
      users: getRows(ss.getSheetByName('Usuários')),
      ideas: getRows(ss.getSheetByName('Ideias'))
    };
    return createResponse(db);
  }
}

function doPost(e) {
  setupSheets();
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return createResponse({ error: "Invalid JSON" });
  }

  const action = params.action;
  const sheetName = params.sheet;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return createResponse({ error: "Sheet not found: " + sheetName });

  if (action === 'addRow') {
    const headers = SHEETS_CONFIG[sheetName];
    const rowData = headers.map(h => {
      let val = params.data[h];
      if (Array.isArray(val)) return val.join(',');
      return val === undefined ? "" : val;
    });
    sheet.appendRow(rowData);
    return createResponse({ success: true });
  }

  if (action === 'updateRow') {
    const idColumn = params.idColumn;
    const idValue = params.idValue;
    const dataRows = sheet.getDataRange().getValues();
    const headers = dataRows[0];
    const idIndex = headers.indexOf(idColumn);
    
    if (idIndex === -1) return createResponse({ error: "ID column not found" });

    for (let i = 1; i < dataRows.length; i++) {
      if (dataRows[i][idIndex].toString() === idValue.toString()) {
        const rowNum = i + 1;
        headers.forEach((h, colIdx) => {
          if (params.data[h] !== undefined) {
            let val = params.data[h];
            if (Array.isArray(val)) val = val.join(',');
            sheet.getRange(rowNum, colIdx + 1).setValue(val);
          }
        });
        return createResponse({ success: true });
      }
    }
    return createResponse({ error: "Row not found for ID: " + idValue });
  }
}

function getRows(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      // Converte strings separadas por vírgula em arrays
      if (h === 'gêneros' || h === 'tags') {
        val = val ? val.toString().split(',').map(s => s.trim()) : [];
      }
      obj[h] = val;
    });
    return obj;
  });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
