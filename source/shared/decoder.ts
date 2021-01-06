export class Integer {
	private constructor() {

	}

	static assert(value: number): void {
		if (!Number.isInteger(value)) {
			throw `Expected ${value} to be an integer!`;
		}
	}

	static assertBetween(min: number, value: number, max: number): void {
		this.assert(min);
		this.assert(value);
		this.assert(max);
		if (value < min) {
			throw `Expected ${value} to be at least ${min}!`;
		}
		if (value > max) {
			throw `Expected ${value} to be at most ${max}!`;
		}
	}
};

export type Cursor = {
	offset: number;
};

export type Endian = "big" | "little";

export class ByteDecoder {
	private buffer: ArrayBuffer;
	private offset: number;
	private length: number;
	private endian: Endian;
	private array: Uint8Array;
	private data_view: DataView;
	private text_decoder: TextDecoder;

	constructor(buffer: ArrayBuffer, options?: Partial<{ offset: number, length: number, endian: Endian }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? buffer.byteLength - offset;
		let endian = options?.endian ?? "little";
		Integer.assertBetween(0, offset, buffer.byteLength - 1);
		Integer.assertBetween(0, length, buffer.byteLength - offset);
		this.buffer = buffer;
		this.offset = offset;
		this.length = length;
		this.endian = endian;
		this.array = new Uint8Array(buffer, offset, length);
		this.data_view = new DataView(buffer, offset, length);
		this.text_decoder = new TextDecoder();
	}

	text(cursor: Cursor, options?: Partial<{ length: number }>): string {
		let length = options?.length ?? this.length - cursor.offset;
		Integer.assertBetween(0, cursor.offset, this.length - length);
		let offset = this.offset + cursor.offset;
		let string = this.text_decoder.decode(new Uint8Array(this.buffer, offset, length));
		cursor.offset += length;
		return string;
	}

	ui16(cursor: Cursor, options?: Partial<{ endian: Endian }>): number {
		let endian = options?.endian ?? this.endian;
		let length = 2;
		Integer.assertBetween(0, cursor.offset, this.length - length);
		let offset = this.offset + cursor.offset;
		let a = this.array[offset];
		offset += 1;
		let b = this.array[offset];
		let number = 0;
		if (endian === "big") {
			number = (a << 8) | (b << 0);
		} else {
			number = (b << 8) | (a << 0);
		}
		cursor.offset += length;
		return number;
	}
};

let buffer = Uint8Array.of(0xFF, 0xFF).buffer;
let decoder = new ByteDecoder(buffer);

console.log(decoder.ui16({offset: 0}));
console.log(decoder.text({ offset: 0}));
