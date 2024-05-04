import { IntegerAssert } from "../../asserts";

function makeDataView(array: Uint8Array): DataView {
	return new DataView(array.buffer, array.byteOffset, array.byteLength);
};

function toAsciiString(array: Uint8Array): string {
	return Array.from(array).map((number) => String.fromCharCode(number)).join("");
};

type Cursor = {
	offset: number;
};

export type EntryHeader = {
	unknown_a: number;
	index: number;
	length: number;
	offset: number;
	string: number;
	flags: number;
};

export const EntryHeader = {
	load(array: Uint8Array, cursor?: Cursor): EntryHeader {
		cursor = cursor ?? { offset: 0 };
		let dw = makeDataView(array);
		let unknown_a = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let index = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let length = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let offset = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let string = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		let flags = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		return {
			unknown_a,
			index,
			length,
			offset,
			string,
			flags
		};
	}
};

export type Archive = {
	data_offset: number;
	strings: Array<string>;
	entries: Array<EntryHeader>;
};

export const Archive = {
	load(array: Uint8Array, cursor?: Cursor): Archive {
		cursor = cursor ?? { offset: 0 };
		let dw = makeDataView(array);
		let identifier_one = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		IntegerAssert.exactly(identifier_one, 0xFFFFFFFF);
		let identifier_two = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		IntegerAssert.exactly(identifier_two, 0x3F7D70A4);
		let data_offset = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let number_of_strings = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let number_of_entries = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let length_of_strings = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let strings: Array<string> = [];
		for (let i = 0; i < number_of_strings; i++) {
			let string_length = dw.getUint16(cursor.offset, true); cursor.offset += 2;
			let string = toAsciiString(array.subarray(cursor.offset, cursor.offset + string_length)); cursor.offset += string_length;
			strings.push(string);
		}
		let terminator = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		IntegerAssert.exactly(terminator, 0);
		let entries: Array<EntryHeader> = [];
		for (let i = 0; i < number_of_entries; i++) {
			let record_header = EntryHeader.load(array, cursor);
			entries.push(record_header);
		}
		return {
			data_offset,
			strings,
			entries
		};
	}
};
