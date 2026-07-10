// src/lib/server/xlsx.ts
//
// Minimal, dependency-free generator for .xlsx (OpenXML SpreadsheetML) files.
// It builds the required XML parts and packages them into a ZIP archive using
// the "stored" (uncompressed) method, which needs nothing beyond a CRC32
// implementation. The resulting file opens in Excel, LibreOffice and Numbers.

import { Buffer } from 'node:buffer';

export type CellValue = string | number | null | undefined;

export interface Sheet {
	name: string;
	rows: CellValue[][];
}

interface ZipEntry {
	name: string;
	data: Buffer;
}

const crcTable = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c >>> 0;
	}
	return table;
})();

function crc32(buf: Buffer): number {
	let crc = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries: ZipEntry[]): Buffer {
	const localParts: Buffer[] = [];
	const centralParts: Buffer[] = [];
	let offset = 0;

	for (const entry of entries) {
		const nameBuf = Buffer.from(entry.name, 'utf8');
		const crc = crc32(entry.data);
		const size = entry.data.length;

		const localHeader = Buffer.alloc(30);
		localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
		localHeader.writeUInt16LE(20, 4); // version needed to extract
		localHeader.writeUInt16LE(0, 6); // general purpose bit flag
		localHeader.writeUInt16LE(0, 8); // compression method (0 = stored)
		localHeader.writeUInt16LE(0, 10); // last mod file time
		localHeader.writeUInt16LE(0, 12); // last mod file date
		localHeader.writeUInt32LE(crc, 14); // crc-32
		localHeader.writeUInt32LE(size, 18); // compressed size
		localHeader.writeUInt32LE(size, 22); // uncompressed size
		localHeader.writeUInt16LE(nameBuf.length, 26); // file name length
		localHeader.writeUInt16LE(0, 28); // extra field length

		localParts.push(localHeader, nameBuf, entry.data);

		const centralHeader = Buffer.alloc(46);
		centralHeader.writeUInt32LE(0x02014b50, 0); // central file header signature
		centralHeader.writeUInt16LE(20, 4); // version made by
		centralHeader.writeUInt16LE(20, 6); // version needed to extract
		centralHeader.writeUInt16LE(0, 8); // general purpose bit flag
		centralHeader.writeUInt16LE(0, 10); // compression method
		centralHeader.writeUInt16LE(0, 12); // last mod file time
		centralHeader.writeUInt16LE(0, 14); // last mod file date
		centralHeader.writeUInt32LE(crc, 16); // crc-32
		centralHeader.writeUInt32LE(size, 20); // compressed size
		centralHeader.writeUInt32LE(size, 24); // uncompressed size
		centralHeader.writeUInt16LE(nameBuf.length, 28); // file name length
		centralHeader.writeUInt16LE(0, 30); // extra field length
		centralHeader.writeUInt16LE(0, 32); // file comment length
		centralHeader.writeUInt16LE(0, 34); // disk number start
		centralHeader.writeUInt16LE(0, 36); // internal file attributes
		centralHeader.writeUInt32LE(0, 38); // external file attributes
		centralHeader.writeUInt32LE(offset, 42); // relative offset of local header

		centralParts.push(centralHeader, nameBuf);

		offset += localHeader.length + nameBuf.length + entry.data.length;
	}

	const localData = Buffer.concat(localParts);
	const centralDir = Buffer.concat(centralParts);

	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0); // end of central dir signature
	end.writeUInt16LE(0, 4); // number of this disk
	end.writeUInt16LE(0, 6); // disk where central directory starts
	end.writeUInt16LE(entries.length, 8); // central directory records on this disk
	end.writeUInt16LE(entries.length, 10); // total central directory records
	end.writeUInt32LE(centralDir.length, 12); // size of central directory
	end.writeUInt32LE(localData.length, 16); // offset of central directory
	end.writeUInt16LE(0, 20); // comment length

	return Buffer.concat([localData, centralDir, end]);
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function columnLetter(index: number): string {
	let letter = '';
	let n = index;
	while (n >= 0) {
		letter = String.fromCharCode((n % 26) + 65) + letter;
		n = Math.floor(n / 26) - 1;
	}
	return letter;
}

function buildSheetXml(rows: CellValue[][]): string {
	const rowsXml = rows
		.map((row, rowIndex) => {
			const r = rowIndex + 1;
			const cells = row
				.map((value, colIndex) => {
					if (value === null || value === undefined || value === '') {
						return '';
					}
					const ref = `${columnLetter(colIndex)}${r}`;
					if (typeof value === 'number' && Number.isFinite(value)) {
						return `<c r="${ref}"><v>${value}</v></c>`;
					}
					return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
						String(value)
					)}</t></is></c>`;
				})
				.join('');
			return `<row r="${r}">${cells}</row>`;
		})
		.join('');

	return (
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
		`<sheetData>${rowsXml}</sheetData></worksheet>`
	);
}

function sanitizeSheetName(name: string, index: number): string {
	const cleaned = name
		.replace(/[\\/?*[\]:]/g, ' ')
		.trim()
		.slice(0, 31);
	return cleaned || `Sheet${index + 1}`;
}

/**
 * Builds an .xlsx workbook buffer from the given sheets.
 */
export function buildXlsx(sheets: Sheet[]): Buffer {
	const safeSheets = sheets.map((sheet, i) => ({
		name: sanitizeSheetName(sheet.name, i),
		rows: sheet.rows
	}));

	const contentTypes =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
		'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
		'<Default Extension="xml" ContentType="application/xml"/>' +
		'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
		safeSheets
			.map(
				(_, i) =>
					`<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
			)
			.join('') +
		'</Types>';

	const rootRels =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
		'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
		'</Relationships>';

	const workbookRels =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
		safeSheets
			.map(
				(_, i) =>
					`<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
			)
			.join('') +
		'</Relationships>';

	const workbook =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
		'<sheets>' +
		safeSheets
			.map(
				(sheet, i) =>
					`<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
			)
			.join('') +
		'</sheets></workbook>';

	const entries: ZipEntry[] = [
		{ name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
		{ name: '_rels/.rels', data: Buffer.from(rootRels, 'utf8') },
		{ name: 'xl/workbook.xml', data: Buffer.from(workbook, 'utf8') },
		{ name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels, 'utf8') },
		...safeSheets.map((sheet, i) => ({
			name: `xl/worksheets/sheet${i + 1}.xml`,
			data: Buffer.from(buildSheetXml(sheet.rows), 'utf8')
		}))
	];

	return createZip(entries);
}
