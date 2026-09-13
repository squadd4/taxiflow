/**
 * Taxi Flow — recebe os pedidos de orçamento do site e grava-os nesta folha de cálculo.
 *
 * Instalação passo a passo: docs/orcamentos-google-sheets.md (repositório do site).
 *
 * Propriedades do script (Definições do projeto → Propriedades do script):
 *   WEBHOOK_SECRET  obrigatório — o mesmo valor de CONTACT_WEBHOOK_SECRET na Vercel
 *   NOTIFY_EMAIL    opcional — quem recebe um aviso por cada pedido (vários: separados por vírgulas)
 */

var SHEET_NAME = 'Pedidos';
var HEADERS = ['Data/Hora', 'Nome', 'Email', 'Telemóvel', 'Tipo', 'Mensagem', 'Referência', 'Origem'];
var TYPES = { motorista: 'Motorista', empresa: 'Empresa' };
var LIMITS = { id: 64, name: 120, email: 200, phone: 30, message: 3000, source: 60 };
var DUPLICATE_WINDOW_SECONDS = 6 * 60 * 60;

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('WEBHOOK_SECRET');
    if (!secret) return reply_({ ok: false, error: 'not-configured' });

    var body = parse_(e);
    if (!body || body.token !== secret) return reply_({ ok: false, error: 'unauthorized' });

    var lead = {
      id: text_(body.id, LIMITS.id),
      name: text_(body.name, LIMITS.name),
      email: text_(body.email, LIMITS.email),
      phone: text_(body.phone, LIMITS.phone),
      type: TYPES[body.type] || '',
      message: text_(body.message, LIMITS.message),
      source: text_(body.source, LIMITS.source),
    };
    if (!lead.name || !lead.email || !lead.type || !lead.message) {
      return reply_({ ok: false, error: 'invalid' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      // The site retries when the answer is slow: the same reference is written once.
      var cache = CacheService.getScriptCache();
      if (lead.id && cache.get('pedido:' + lead.id)) return reply_({ ok: true, duplicate: true });

      var sheet = sheet_();
      sheet.appendRow([
        new Date(),
        safe_(lead.name),
        safe_(lead.email),
        safe_(lead.phone),
        lead.type,
        safe_(lead.message),
        safe_(lead.id),
        safe_(lead.source),
      ]);
      sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('dd/mm/yyyy hh:mm');
      if (lead.id) cache.put('pedido:' + lead.id, '1', DUPLICATE_WINDOW_SECONDS);
    } finally {
      lock.releaseLock();
    }

    notify_(lead, props.getProperty('NOTIFY_EMAIL'));
    return reply_({ ok: true });
  } catch (error) {
    console.error(error);
    return reply_({ ok: false, error: 'script-error' });
  }
}

/** Abrir o URL /exec no browser mostra se a aplicação Web está publicada. */
function doGet() {
  return reply_({ ok: true, service: 'taxiflow-orcamentos' });
}

/**
 * Corre esta função uma vez no editor (Executar) para autorizar o script.
 * Grava uma linha de teste e, se NOTIFY_EMAIL estiver definido, envia um aviso.
 */
function testarPedido() {
  var secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!secret) throw new Error('Define primeiro a propriedade WEBHOOK_SECRET em Definições do projeto.');
  var result = doPost({
    postData: {
      contents: JSON.stringify({
        token: secret,
        id: 'teste-' + new Date().getTime(),
        name: 'Pedido de teste',
        email: 'teste@exemplo.pt',
        phone: '+351 912 345 678',
        type: 'motorista',
        message: 'Linha de teste criada pela função testarPedido. Podes apagá-la.',
        source: 'apps-script',
      }),
    },
  });
  console.log(result.getContent());
}

function sheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(6, 420);
  }
  return sheet;
}

function notify_(lead, recipients) {
  if (!recipients) return;
  try {
    var options = { name: 'Taxi Flow — site' };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) options.replyTo = lead.email;
    MailApp.sendEmail(
      recipients,
      'Novo pedido de orçamento: ' + lead.name + ' (' + lead.type + ')',
      [
        'Nome: ' + lead.name,
        'Email: ' + lead.email,
        'Telemóvel: ' + (lead.phone || '—'),
        'Tipo: ' + lead.type,
        '',
        lead.message,
        '',
        'Folha de cálculo: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
      ].join('\n'),
      options
    );
  } catch (error) {
    // The request is already in the sheet; a failed email must not lose it.
    console.error('O aviso por email falhou (o pedido ficou gravado):', error);
  }
}

function parse_(e) {
  try {
    return JSON.parse((e && e.postData && e.postData.contents) || '');
  } catch (error) {
    return null;
  }
}

function text_(value, limit) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

/** Text starting with = + - @ would run as a formula in Sheets. */
function safe_(value) {
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

function reply_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
