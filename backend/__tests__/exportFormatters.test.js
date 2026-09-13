import { describe, test, expect } from '@jest/globals';
import JSZip from 'jszip';
import { PDFParse } from 'pdf-parse';
import { rowsToCSV, buildExportZip, buildExportPDF } from '../src/utils/exportFormatters.js';
import { buildProfileExportPayload } from '../src/utils/profileDataExport.js';

function samplePayload() {
  return buildProfileExportPayload({
    exportedAt: '2026-09-12T00:00:00.000Z',
    userId: 'user_test_123',
    profile: { userId: 'user_test_123', fullName: 'Test User', createdAt: '2026-01-01T00:00:00.000Z' },
    dietaryPreferences: { userId: 'user_test_123', vegetarian: true },
    nutritionGoals: { userId: 'user_test_123', dailyCalories: 2200 },
    gamification: { userId: 'user_test_123', streak: 12 },
    accountSettings: {
      userId: 'user_test_123',
      expoPushToken: 'ExponentPushToken[super-secret-device-token]',
      fcmToken: 'fcm-super-secret-device-token',
      notifications: { enabled: true },
    },
    collections: {
      foodLogs: [
        { userId: 'user_test_123', name: 'Oatmeal, "steel cut"', calories: 300, notes: null },
        { userId: 'user_test_123', name: 'Chicken salad', calories: 0, notes: 'line1\nline2' },
      ],
      waterLogs: [{ userId: 'user_test_123', amountLiters: '0.5' }],
      moodLogs: [],
      activityLogs: [],
      sleepLogs: [],
      stressLogs: [],
      weightHistory: [],
      privacyConsentHistory: [],
    },
  });
}

describe('rowsToCSV', () => {
  test('produces a header row plus one row per record', () => {
    const csv = rowsToCSV([{ a: 1, b: 'x' }, { a: 2, b: 'y' }]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('a,b');
    expect(lines[1]).toBe('1,x');
    expect(lines[2]).toBe('2,y');
  });

  test('quotes values containing commas, quotes, or newlines', () => {
    const csv = rowsToCSV([{ name: 'Oatmeal, "steel cut"', notes: 'line1\nline2' }]);
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('"Oatmeal, ""steel cut""","line1\nline2"');
  });

  test('renders missing values as empty, distinct from zero', () => {
    const csv = rowsToCSV([{ calories: 0 }, { calories: null }, { calories: undefined }]);
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('0');
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe('');
  });

  test('unions columns across rows with differing shapes', () => {
    const csv = rowsToCSV([{ a: 1 }, { b: 2 }]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('a,b');
    expect(lines[1]).toBe('1,');
    expect(lines[2]).toBe(',2');
  });

  test('formula-injection guard: leading apostrophe neutralizes the formula trigger', () => {
    const dangerous = ['=1+1', '+1+1', '-1+1', '@A1'];
    for (const value of dangerous) {
      const csv = rowsToCSV([{ name: value }]);
      const dataLine = csv.split('\r\n')[1];
      // Excel/Sheets treat a leading apostrophe as "force text" and strip it
      // from what's displayed — the safety marker must be present in the raw
      // cell, and the original content must still be recoverable after it.
      expect(dataLine.startsWith("'")).toBe(true);
      expect(dataLine).toContain(value);
    }
  });

  test('does not alter values that merely contain (not start with) formula characters', () => {
    const csv = rowsToCSV([{ name: 'Total = 5 + 2' }]);
    const dataLine = csv.split('\r\n')[1];
    expect(dataLine).toBe('Total = 5 + 2');
  });

  test('returns empty string for no rows', () => {
    expect(rowsToCSV([])).toBe('');
  });
});

describe('buildExportZip', () => {
  test('produces a valid zip with one CSV per record type and no push tokens', async () => {
    const payload = samplePayload();
    const buffer = await buildExportZip(payload);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const zip = await JSZip.loadAsync(buffer);
    const filenames = Object.keys(zip.files);
    expect(filenames).toContain('Food_Logs.csv');
    expect(filenames).toContain('Summary.csv');
    expect(filenames).toContain('Account_Settings.csv');

    const foodCSV = await zip.file('Food_Logs.csv').async('string');
    expect(foodCSV).toContain('Oatmeal');
    expect(foodCSV).toContain('Chicken salad');

    const accountSettingsCSV = await zip.file('Account_Settings.csv').async('string');
    expect(accountSettingsCSV).not.toContain('super-secret-device-token');
  });

  test('empty record types still get a real header row, not a 0-byte file', async () => {
    const payload = samplePayload(); // moodLogs, activityLogs, etc. are empty in the sample
    const buffer = await buildExportZip(payload);
    const zip = await JSZip.loadAsync(buffer);

    const moodCSV = await zip.file('Mood_Logs.csv').async('string');
    expect(moodCSV.length).toBeGreaterThan(0);
    expect(moodCSV).toContain('userId');
    expect(moodCSV).toContain('mood');
    expect(moodCSV).not.toContain('\r\n'); // header only, no blank data row

    const activityCSV = await zip.file('Activity_Logs.csv').async('string');
    expect(activityCSV.length).toBeGreaterThan(0);
    expect(activityCSV).toContain('userId');

    // The header itself must not leak excluded fields either.
    const accountSettingsHeader = (await zip.file('Account_Settings.csv').async('string')).split('\r\n')[0];
    expect(accountSettingsHeader).not.toContain('fcmToken');
    expect(accountSettingsHeader).not.toContain('expoPushToken');
  });
});

describe('buildExportPDF', () => {
  test('produces a non-empty PDF buffer starting with the PDF magic header', async () => {
    const payload = samplePayload();
    const buffer = await buildExportPDF(payload);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  test('does not throw when every collection is empty', async () => {
    const payload = buildProfileExportPayload({
      userId: 'user_empty',
      profile: null,
      dietaryPreferences: null,
      nutritionGoals: null,
      gamification: null,
      accountSettings: null,
      collections: {
        foodLogs: [], waterLogs: [], moodLogs: [], activityLogs: [],
        sleepLogs: [], stressLogs: [], weightHistory: [], privacyConsentHistory: [],
      },
    });
    const buffer = await buildExportPDF(payload);
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  test('empty sections are consolidated onto one page instead of one page each', async () => {
    // Previously: 1 summary page + 5 single-record pages ("No data.") + 8
    // collection pages ("No entries.") = 14 pages for an account with
    // nothing logged yet. Now: 1 summary page + 1 consolidated "No data yet"
    // page listing every empty section = 2 pages.
    const payload = buildProfileExportPayload({
      userId: 'user_all_empty',
      profile: null,
      dietaryPreferences: null,
      nutritionGoals: null,
      gamification: null,
      accountSettings: null,
      collections: {
        foodLogs: [], waterLogs: [], moodLogs: [], activityLogs: [],
        sleepLogs: [], stressLogs: [], weightHistory: [], privacyConsentHistory: [],
      },
    });
    const buffer = await buildExportPDF(payload);
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();

    expect(parsed.total).toBe(2);
    expect(parsed.text).toContain('No data yet');
    expect(parsed.text).toContain('Profile');
    expect(parsed.text).toContain('Food Logs');
    expect(parsed.text).toContain('Mood Logs');
  });

  test('a mix of populated and empty sections only consolidates the empty ones', async () => {
    const payload = samplePayload(); // has food/water logs populated, mood/activity/etc. empty
    const buffer = await buildExportPDF(payload);
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();

    // Populated sections still get their own real content.
    expect(parsed.text).toContain('Oatmeal');
    // Empty ones are named in the consolidated list, not given their own page.
    expect(parsed.text).toContain('No data yet');
    expect(parsed.text).toContain('Mood Logs');
  });

  test('every field survives with heavy data — no silent clipping, real pagination', async () => {
    // A record with far more fields than fit on one page, and a collection
    // with far more rows than fit on one page. This is verified against the
    // PDF's actual extracted text (not just "it didn't throw") — pdfkit does
    // not error when content overflows a page, it just needs to actually
    // flow to a new one, which is exactly the kind of thing that can silently
    // regress without a content-level check.
    const bigProfile = { userId: 'user_pdf_heavy' };
    for (let i = 0; i < 80; i++) {
      bigProfile[`field_${String(i).padStart(2, '0')}`] = `unique-marker-value-${i}`;
    }
    const manyFoodLogs = Array.from({ length: 40 }, (_, i) => ({
      name: `Test Food Item ${i}`,
      calories: i * 10,
      marker: `food-marker-${i}`,
    }));

    const payload = buildProfileExportPayload({
      userId: 'user_pdf_heavy',
      profile: bigProfile,
      dietaryPreferences: null,
      nutritionGoals: null,
      gamification: null,
      accountSettings: null,
      collections: {
        foodLogs: manyFoodLogs,
        waterLogs: [], moodLogs: [], activityLogs: [],
        sleepLogs: [], stressLogs: [], weightHistory: [], privacyConsentHistory: [],
      },
    });

    const buffer = await buildExportPDF(payload);
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();

    for (let i = 0; i < 80; i++) {
      expect(parsed.text).toContain(`unique-marker-value-${i}`);
    }
    for (let i = 0; i < 40; i++) {
      expect(parsed.text).toContain(`food-marker-${i}`);
    }
    // 120+ fields/entries at ~30-40 lines/page cannot fit on 1-2 pages —
    // this bounds catch a regression to a fixed/clipped single page.
    expect(parsed.total).toBeGreaterThan(2);
  });
});
