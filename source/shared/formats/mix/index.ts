import * as libcrypto from "crypto";

function makeDataView(array: Uint8Array): DataView {
	return new DataView(array.buffer, array.byteOffset, array.byteLength);
};

type Cursor = {
	offset: number;
};

export type ArchiveRecordHeader = {
	id: number;
	relative_offset: number;
	length: number;
};

export const ArchiveRecordHeader = {
	load(array: Uint8Array, cursor?: Cursor): ArchiveRecordHeader {
		cursor = cursor ?? { offset: 0 };
		let dw = makeDataView(array);
		let id = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let relative_offset = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let length = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		return {
			id,
			relative_offset,
			length
		};
	}
};

let PUBLIC_KEY = libcrypto.createPublicKey({
	format: "jwk",
	key: {
		"kty": "RSA",
		"n": "AihRvNoIbTn85FZRYNZRcT-i6KpU-maCsEqr3Q5q-LDB5tH7Tz2qQ38V",
		"e": "AQAB"
	}
} as any);

export type Archive = {
	record_headers: Array<ArchiveRecordHeader>;
	header_size: number;
};

export const Archive = {
	load(array: Uint8Array, cursor?: Cursor): Archive {
		cursor = cursor ?? { offset: 0 };
		let dw = makeDataView(array);
		let number_of_records = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		if (number_of_records === 0) {
			let flags = dw.getUint16(cursor.offset, true); cursor.offset += 2;
			let has_sha1_checksum = (flags & 0x0001) !== 0;
			let is_encrypted = (flags & 0x0002) !== 0;
			let initialization_data = array.subarray(cursor.offset, cursor.offset + 80); cursor.offset += 80;
			throw new Error(`Expected an unencrypted file!`);
		}
		let data_size = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let record_headers: Array<ArchiveRecordHeader> = [];
		for (let i = 0; i < number_of_records; i++) {
			let record_header = ArchiveRecordHeader.load(array, cursor);
			record_headers.push(record_header);
		}
		let header_size = cursor.offset;
		return {
			record_headers,
			header_size
		};
	}
};
