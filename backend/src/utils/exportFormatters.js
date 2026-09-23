/**
 * CSV and PDF renderers for the user data export (GET /profile/export).
 * Both take the same payload shape produced by buildProfileExportPayload()
 * so all three formats (JSON/CSV/PDF) always describe identical data.
 */
import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import { getTableColumns } from 'drizzle-orm';
import {
  CORE_WELLNESS_EXPORT_COLLECTIONS,
  SINGLE_RECORD_EXPORT_SECTIONS as SINGLE_RECORD_SECTIONS,
  EXCLUDED_EXPORT_FIELDS,
} from './profileDataExport.js';

/**
 * Real column names for a table, filtered to match what a populated row
 * would actually contain after sanitizeExportRecord — used so an empty CSV
 * still gets a real header row instead of a 0-byte file with no indication
 * of what it was supposed to contain.
 */
function columnHeadersFor(table) {
  return Object.keys(getTableColumns(table)).filter((col) => !EXCLUDED_EXPORT_FIELDS.includes(col));
}

const COLLECTION_LABELS = {
  foodLogs: 'Food Logs',
  waterLogs: 'Hydration Logs',
  moodLogs: 'Mood Logs',
  activityLogs: 'Activity Logs',
  sleepLogs: 'Sleep Logs',
  stressLogs: 'Stress Logs',
  weightHistory: 'Weight History',
  privacyConsentHistory: 'Privacy Consent History',
};

function csvEscape(value) {
  // Distinguish "missing" from "zero"/"false": null/undefined become an
  // empty cell, not the string "0" or "null".
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  let str;
  if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  // CSV/formula injection: a food or note field like `=cmd|'/bin/calc'!A0`
  // gets executed as a formula the moment the recipient opens this in Excel/
  // Sheets/LibreOffice, in a file this endpoint hands the user as their own
  // data. Neutralize by prefixing a leading apostrophe when the cell starts
  // with a character those programs treat as a formula trigger — Sheets and
  // Excel both render a leading `'` as "treat the rest as literal text" and
  // strip the apostrophe itself from the displayed value.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of flat-ish objects into a CSV string. Column set is the
 * union of keys across all rows, so one row missing a field doesn't shift
 * every other row's columns.
 *
 * @param {object[]} rows
 * @param {string[]} [fallbackColumns] - column names to use as the header
 *   when rows is empty, so a record type with zero entries still produces a
 *   real header row (e.g. "userId,mood,note,...") instead of a 0-byte file
 *   that gives no indication of what it was supposed to contain.
 */
export function rowsToCSV(rows, fallbackColumns) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return fallbackColumns && fallbackColumns.length > 0
      ? fallbackColumns.map(csvEscape).join(',')
      : '';
  }
  const columns = [];
  const seen = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  const lines = [columns.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => csvEscape(row?.[col])).join(','));
  }
  return lines.join('\r\n');
}

/**
 * Builds a ZIP (as a Buffer) containing one CSV per record type: single-row
 * sections (profile, goals, etc.) each get a one-row CSV, and each
 * collection (food logs, mood logs, ...) gets its own CSV of all rows.
 */
export async function buildExportZip(exportData) {
  const zip = new JSZip();

  for (const { key, label, table } of SINGLE_RECORD_SECTIONS) {
    const record = exportData[key];
    const rows = record ? [record] : [];
    zip.file(`${label.replace(/\s+/g, '_')}.csv`, rowsToCSV(rows, columnHeadersFor(table)));
  }

  for (const { key, table } of CORE_WELLNESS_EXPORT_COLLECTIONS) {
    const label = COLLECTION_LABELS[key] || key;
    zip.file(`${label.replace(/\s+/g, '_')}.csv`, rowsToCSV(exportData[key] || [], columnHeadersFor(table)));
  }

  const summaryRow = { exportedAt: exportData.exportedAt, userId: exportData.userId, ...exportData.summary };
  zip.file('Summary.csv', rowsToCSV([summaryRow]));

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function formatCellForPDF(value) {
  if (value === null || value === undefined || value === '') return '(none)';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Builds a single readable PDF report (as a Buffer): a summary page, then one
 * clearly labeled section per record type. Tables are simple key/value or
 * row listings — this is a report meant to be read, not a data interchange
 * format, so it does not attempt to preserve every raw column.
 */
export function buildExportPDF(exportData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('My Flourish Tracker — Data Export', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666666').text(`Exported: ${exportData.exportedAt}`);
    doc.text(`Account: ${exportData.userId}`);
    doc.fillColor('#000000');
    doc.moveDown();

    doc.fontSize(14).text('Summary');
    doc.moveDown(0.2);
    doc.fontSize(10);
    Object.entries(exportData.summary || {}).forEach(([k, v]) => {
      doc.text(`${k}: ${formatCellForPDF(v)}`);
    });

    // Sections with real data each get their own page; sections with none
    // are consolidated onto one shared page instead of one near-blank page
    // apiece — a low-activity account was producing a 14-page PDF where
    // most pages said nothing but "No data."/"No entries."
    const emptySectionLabels = [];

    for (const { key, label } of SINGLE_RECORD_SECTIONS) {
      const record = exportData[key];
      if (!record) {
        emptySectionLabels.push(label);
        continue;
      }
      doc.addPage();
      doc.fontSize(14).text(label);
      doc.moveDown(0.3);
      doc.fontSize(10);
      Object.entries(record).forEach(([k, v]) => {
        doc.text(`${k}: ${formatCellForPDF(v)}`);
      });
    }

    for (const { key } of CORE_WELLNESS_EXPORT_COLLECTIONS) {
      const label = COLLECTION_LABELS[key] || key;
      const rows = exportData[key] || [];
      if (rows.length === 0) {
        emptySectionLabels.push(label);
        continue;
      }
      doc.addPage();
      doc.fontSize(14).text(`${label} (${rows.length})`);
      doc.moveDown(0.3);
      doc.fontSize(9);

      rows.forEach((row, idx) => {
        if (idx > 0) doc.moveDown(0.4);
        doc.fontSize(9).fillColor('#333333').text(`Entry ${idx + 1}`, { underline: true });
        doc.fillColor('#000000');
        Object.entries(row).forEach(([k, v]) => {
          doc.text(`  ${k}: ${formatCellForPDF(v)}`);
        });
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
        }
      });
    }

    if (emptySectionLabels.length > 0) {
      doc.addPage();
      doc.fontSize(14).text('No data yet');
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666666');
      doc.text('The following sections had nothing to export:');
      doc.moveDown(0.2);
      emptySectionLabels.forEach((label) => doc.text(`•  ${label}`));
      doc.fillColor('#000000');
    }

    doc.end();
  });
}
