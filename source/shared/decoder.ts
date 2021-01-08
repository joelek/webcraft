/* export class Integer {
	private constructor() {

	}

	static assert(value: number): void {
		if (!Number.isInteger(value)) {
			throw `Expected ${value} to be an integer!`;
		}
	}

	static assertAtLeast(min: number, value: number): void {
		this.assert(min);
		this.assert(value);
		if (value < min) {
			throw `Expected ${value} to be at least ${min}!`;
		}
	}

	static assertAtMost(value: number, max: number): void {
		this.assert(value);
		this.assert(max);
		if (value > max) {
			throw `Expected ${value} to be at most ${max}!`;
		}
	}

	static assertBetween(min: number, value: number, max: number): void {
		this.assertAtLeast(min, value);
		this.assertAtMost(value, max);
	}
};

export class Buffer extends Uint8Array {
	private array: Uint8Array;
	private offset: number;
	readonly length: number;

	private constructor(array: Uint8Array, options?: Partial<{ offset: number, length: number }>) {
		super(array)
		let offset = options?.offset ?? 0;
		let length = options?.length ?? array.byteLength - offset;
		Integer.assertBetween(0, offset, array.byteLength - 1);
		Integer.assertBetween(0, length, array.byteLength - offset);
		this.array = array;
		this.offset = offset;
		this.length = length;
	}

	size(): number {
		return this.length;
	}

	static alloc(length: number): Buffer {
		let array = new Uint8Array(length);
		let instance = new Buffer(array);
		return instance;
	}

	static of(...values: Array<number>): Buffer {
		let array = new Uint8Array(values.length);
		array.set(values, 0);
		let instance = new Buffer(array);
		return instance;
	}
};













export type Cursor = {
	offset: number;
};

export interface Reader {
	read(cursor: Cursor, options?: Partial<{ buffer: Buffer, offset: number, length: number }>): Promise<Buffer>;
	size(): number;
};

export class OffsetReader implements Reader {
	private reader: Reader;
	private offset: number;
	private length: number;

	constructor(reader: Reader, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? reader.size() - offset;
		Integer.assertBetween(0, offset, reader.size() - 1);
		Integer.assertBetween(0, length, reader.size() - offset);
		this.reader = reader;
		this.offset = offset;
		this.length = length;
	}

	async read(cursor: Cursor, options?: Partial<{ buffer: Buffer; offset: number; length: number; }>): Promise<Buffer> {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? this.size() - offset;
		Integer.assertBetween(0, offset, this.size() - 1);
		Integer.assertBetween(0, length, this.size() - offset);
		let buffer = await this.reader.read({ }, )
	}

	size(): number {
		return this.length;
	}
};

class BufferReader implements Reader {
	private buffer: Buffer;

	constructor(buffer: Buffer) {
		this.buffer = buffer;
	}

	async read(cursor: Cursor, options?: Partial<{ buffer: Buffer, offset: number, length: number }>): Promise<Buffer> {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? (buffer.byteLength - offset);

		let slice = this.buffer.slice(cursor, cursor + length);
		let source = new Uint8Array(slice);
		let target = new Uint8Array(buffer, offset, length);
		target.set(source, 0);
		return length;
	}

	size(): number {
		return this.buffer.size();
	}
};

export type Endian = "big" | "little";

export class Decoder {
	private reader: Reader;
	private endian: Endian;
	private buffer: Buffer;
	private txtdec: TextDecoder;

	constructor(reader: Reader, options?: Partial<{ endian: Endian }>) {
		let endian = options?.endian ?? "little";
		this.reader = reader;
		this.endian = endian;
		this.buffer = Buffer.alloc(4);
		this.txtdec = new TextDecoder();
	}

	async view(cursor: Cursor, options?: Partial<{ length: number }>): Promise<Decoder> {
		let reader = new OffsetReader(reader);
		let decoder = new Decoder(reader, { endian: this.endian });
		return decoder;
	}

	async si32(cursor: Cursor, options?: Partial<{ endian: Endian }>): Promise<number> {
		let number = await this.ui32(cursor, options);
		if (number >= 0x80000000) {
			number -= 0x80000000;
			number -= 0x80000000;
		}
		return number;
	}

	async ui32(cursor: Cursor, options?: Partial<{ endian: Endian }>): Promise<number> {
		let buffer = await this.reader.read(cursor, {
			buffer: this.buffer,
			offset: 0,
			length: 4
		});
		let a = buffer[0];
		let b = buffer[1];
		let c = buffer[2];
		let d = buffer[3];
		let number = 0;
		let endian = options?.endian ?? this.endian;
		if (endian === "big") {
			number = ((a << 24) | (b << 16) | (c << 8) | (d << 0)) >>> 0;
		} else {
			number = ((d << 24) | (c << 16) | (b << 8) | (a << 0)) >>> 0;
		}
		return number;
	}

	async text(cursor: Cursor, options?: Partial<{ length: number, encoding: "utf8" }>): Promise<string> {
		let buffer = await this.reader.read(cursor, options);
		let string = this.txtdec.decode(buffer);
		return string;
	}
};

export class BytePacker {
	private constructor() {

	}

	static unpack(value: number, offset: number, length: number): number {

	}
}















(async () => {
	let buffer = Buffer.of(0xFF, 0xFF);
	let reader = new BufferReader(buffer);
	let decoder = new Decoder(reader, { endian: "big" });
	let cursor = { offset: 0 };
	let type = await decoder.text(cursor, { length: 4 });
	let size = await decoder.ui32(cursor);
	let pi32
	let view = await decoder.view(cursor, { length: size });
	{
		let cursor = { offset: 0 };
	}
})();
 */

export type f = number;
