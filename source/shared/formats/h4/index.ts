import { IntegerAssert, StringAssert } from "../../asserts";

function makeDataView(array: Uint8Array): DataView {
	return new DataView(array.buffer, array.byteOffset, array.byteLength);
};

function toAsciiString(array: Uint8Array): string {
	return Array.from(array).map((number) => String.fromCharCode(number)).join("");
};

type Cursor = {
	offset: number;
};

export type ArchiveRecordHeader = {
	offset: number;
	compressed_size: number;
	decompressed_size: number;
	unknown_a: number;
	file_name: string;
	directory_name: string;
	unknown_b: number;
	unknown_c: number;
};

export const ArchiveRecordHeader = {
	load(array: Uint8Array, cursor?: Cursor): ArchiveRecordHeader {
		cursor = cursor ?? { offset: 0 };
		let dw = makeDataView(array);
		let offset = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let compressed_size = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let decompressed_size = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let unknown_a = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let file_name_length = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		let file_name = toAsciiString(array.subarray(cursor.offset, cursor.offset + file_name_length)); cursor.offset += file_name_length;
		let directory_name_length = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		let directory_name = toAsciiString(array.subarray(cursor.offset, cursor.offset + directory_name_length)); cursor.offset += directory_name_length;
		let unknown_b = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		let unknown_c = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		return {
			offset,
			compressed_size,
			decompressed_size,
			unknown_a,
			file_name,
			directory_name,
			unknown_b,
			unknown_c
		};
	}
};

export type Archive = {
	record_headers: Array<ArchiveRecordHeader>;
};

export const Archive = {
	load(array: Uint8Array, cursor?: Cursor): Archive {
		cursor = cursor ?? { offset: 0 };
		let dw = makeDataView(array);
		let identifier = toAsciiString(array.subarray(0, 0 + 3)); cursor.offset += 3;
		StringAssert.identical(identifier, "H4R");
		let version = dw.getUint8(cursor.offset); cursor.offset += 1;
		IntegerAssert.exactly(version, 5);
		let header_size = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		IntegerAssert.atLeast(cursor.offset, header_size);
		cursor.offset = header_size;
		let number_of_records = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let record_headers: Array<ArchiveRecordHeader> = [];
		for (let i = 0; i < number_of_records; i++) {
			let record_header = ArchiveRecordHeader.load(array, cursor);
			record_headers.push(record_header);
		}
		return {
			record_headers
		};
	}
};
