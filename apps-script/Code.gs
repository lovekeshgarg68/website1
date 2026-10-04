/**
 * Aakanksha & Lovekesh — RSVP + guestbook backend.
 *
 * Deploy this as a Google Apps Script Web App bound to a Google Sheet.
 * Full steps are in README.md. In short:
 *   1. Create a Google Sheet. Extensions → Apps Script. Paste this file.
 *   2. Run `setup` once (creates the RSVP and Notes tabs with headers).
 *   3. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 *   4. Copy the Web app URL into js/config.js → SCRIPT_URL.
 *
 * Notes only appear on the website after you tick the "Approved" box on
 * the Notes tab, so nothing unreviewed is ever shown to guests.
 */

var SHEETS = {
  rsvp: {
    name: "RSVP",
    headers: ["Timestamp", "Name", "Phone", "Guests", "Details", "Note for the couple", "Page", "User agent"],
  },
  notes: {
    name: "Notes",
    headers: ["Timestamp", "Name", "Message", "Approved", "Page", "User agent"],
  },
};

var MAX_PER_MINUTE = 6; // crude anti-spam, per deployment

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (key) {
    var def = SHEETS[key];
    var sh = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(def.headers);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, def.headers.length).setFontWeight("bold");
    }
    if (key === "notes") {
      // Checkbox column for approval
      var approvedCol = def.headers.indexOf("Approved") + 1;
      sh.getRange(2, approvedCol, 1000, 1).insertCheckboxes();
    }
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var body = JSON.parse(e.postData.contents || "{}");
    if (!rateLimitOk_()) return json_({ ok: false, error: "Too many submissions, please try again in a minute." });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var now = new Date();

    if (body.type === "rsvp") {
      if (!body.name || !body.phone) return json_({ ok: false, error: "Missing name or phone." });
      var sh = ss.getSheetByName(SHEETS.rsvp.name);
      var wishes = clean_(body.wishes, 400);
      sh.appendRow([
        now,
        clean_(body.name, 120),
        clean_(body.phone, 60),
        clean_(body.guests, 10),
        clean_(body.details, 600),
        wishes,
        clean_(body.page, 300),
        clean_(body.userAgent, 300),
      ]);
      // A note for the couple also goes to the Notes tab, awaiting approval.
      if (wishes) appendNote_(ss, now, clean_(body.name, 80), wishes, body);
      return json_({ ok: true });
    }

    if (body.type === "note") {
      if (!body.name || !body.message) return json_({ ok: false, error: "Missing name or message." });
      appendNote_(ss, now, clean_(body.name, 80), clean_(body.message, 400), body);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: "Unknown type." });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function doGet(e) {
  var type = e && e.parameter && e.parameter.type;
  if (type === "notes") {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.notes.name);
    var values = sh.getDataRange().getValues();
    var out = [];
    for (var i = values.length - 1; i >= 1; i--) {
      var r = values[i];
      if (r[3] === true) out.push({ name: String(r[1]), message: String(r[2]) });
      if (out.length >= 60) break;
    }
    return json_({ ok: true, notes: out });
  }
  return json_({ ok: true, service: "Aakanksha & Lovekesh" });
}

function appendNote_(ss, now, name, message, body) {
  var nsh = ss.getSheetByName(SHEETS.notes.name);
  nsh.appendRow([now, name, message, false, clean_(body.page, 300), clean_(body.userAgent, 300)]);
  nsh.getRange(nsh.getLastRow(), 4).insertCheckboxes();
}

function rateLimitOk_() {
  var cache = CacheService.getScriptCache();
  var key = "rl_" + Math.floor(Date.now() / 60000);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n <= MAX_PER_MINUTE;
}

function clean_(v, max) {
  if (v === undefined || v === null) return "";
  var s = String(v).replace(/[\u0000-\u001f]+/g, " ").trim();
  // neutralise spreadsheet formula injection
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
