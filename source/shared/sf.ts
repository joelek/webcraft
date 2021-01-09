import * as libfs from "fs";

import { IntegerAssert, StringAssert } from "./assert";

export type Endian = "big" | "little";
export type Complement = "none" | "ones" | "twos";

export class Buffer implements Loadable, Saveable {
	private array: Uint8Array;

	constructor(buffer: ArrayBuffer, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? buffer.byteLength - offset;
		IntegerAssert.between(0, offset, buffer.byteLength);
		IntegerAssert.between(0, length, buffer.byteLength - offset);
		this.array = new Uint8Array(buffer, offset, length);
	}

	async save(cursor: Cursor, writer: Writer): Promise<this> {
		await writer.write(cursor, this);
		return this;
	}

	async load(cursor: Cursor, reader: Reader): Promise<this> {
		await reader.read(cursor, this);
		return this;
	}

	copy(target: Buffer): Buffer {
		IntegerAssert.exactly(target.size(), this.size());
		target.array.set(this.array);
		return target;
	}

	get(index: number): number {
		IntegerAssert.between(0, index, this.array.length - 1);
		return this.array[index];
	}

	place(array: Uint8Array): void {
		IntegerAssert.atMost(this.array.length, array.length);
		this.array.set(array);
	}

	set(index: number, value: number): number {
		IntegerAssert.between(0, index, this.array.length - 1);
		IntegerAssert.between(0, value, 255);
		return this.array[index] = value;
	}

	size(): number {
		return this.array.length;
	}

	window(options?: Partial<{ offset: number, length: number }>): Buffer {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? this.array.length - offset;
		return new Buffer(this.array.buffer, {
			offset: this.array.byteOffset + offset,
			length: length
		});
	}

	static alloc(length: number): Buffer {
		IntegerAssert.atLeast(0, length);
		let buffer = new ArrayBuffer(length);
		return new Buffer(buffer);
	}
};

export class Cursor {
	offset: number;

	constructor(options?: Partial<{ offset: number }>) {
		let offset = options?.offset ?? 0;
		IntegerAssert.atLeast(0, offset);
		this.offset = offset;
	}
};

export interface Reader {
	read(cursor: Cursor, target: Buffer): Promise<Buffer>;
	size(): number;
};

export interface Writer {
	size(): number;
	write(cursor: Cursor, source: Buffer): Promise<Buffer>;
};

export interface Loadable {
	load(cursor: Cursor, reader: Reader): Promise<this>;
};

export interface Saveable {
	save(cursor: Cursor, writer: Writer): Promise<this>;
};

export class WindowedReader implements Reader {
	private reader: Reader;
	private offset: number;
	private length: number;

	constructor(reader: Reader, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? reader.size() - offset;
		IntegerAssert.between(0, offset, reader.size());
		IntegerAssert.between(0, length, reader.size() - offset);
		this.reader = reader;
		this.offset = offset;
		this.length = length;
	}

	async read(cursor: Cursor, buffer: Buffer): Promise<Buffer> {
		let offset = cursor.offset;
		let length = buffer.size();
		IntegerAssert.between(0, offset, this.length);
		IntegerAssert.between(0, length, this.length);
		await this.reader.read({ offset: this.offset + offset }, buffer);
		cursor.offset += length;
		return buffer;
	}

	size(): number {
		return this.length;
	}
};

export class Chunk implements Loadable, Saveable {
	readonly buffer: Buffer;

	constructor(buffer: Buffer) {
		this.buffer = buffer;
	}

	async load(cursor: Cursor, reader: Reader): Promise<this> {
		await reader.read(cursor, this.buffer);
		return this;
	}

	async save(cursor: Cursor, writer: Writer): Promise<this> {
		await writer.write(cursor, this.buffer);
		return this;
	}

	sizeOf(): number {
		return this.buffer.size();
	}
};

export class Utf8String extends Chunk {
	private getContinuationByte(index: number): number {
		let byte = this.buffer.get(index);
		if ((byte & 0b11000000) !== 0b10000000) {
			throw `Expected ${byte} to be a continuation byte!`;
		}
		return byte & 0b00111111;
	}

	private encode(value: string, write: (byte: number) => void): void {
		let i = 0;
		while (i < value.length) {
			let cp = value.codePointAt(i++) ?? 0;
			if (cp >= 0xD800 && cp <= 0xDFFF) {
				throw `Expected ${cp} to be a non-surrogate code point!`;
			}
			if (cp < 0x0080) {
				write(((cp >>  0) & 0b01111111) | 0b00000000);
			} else if (cp < 0x0800) {
				write(((cp >>  6) & 0b00011111) | 0b11000000);
				write(((cp >>  0) & 0b00111111) | 0b10000000);
			} else if (cp < 0x10000) {
				write(((cp >> 12) & 0b00001111) | 0b11100000);
				write(((cp >>  6) & 0b00111111) | 0b10000000);
				write(((cp >>  0) & 0b00111111) | 0b10000000);
			} else {
				i += 1;
				write(((cp >> 18) & 0b00000111) | 0b11110000);
				write(((cp >> 12) & 0b00111111) | 0b10000000);
				write(((cp >>  6) & 0b00111111) | 0b10000000);
				write(((cp >>  0) & 0b00111111) | 0b10000000);
			}
		}
	}

	get value(): string {
		let value = "";
		let i = 0;
		while (i < this.buffer.size()) {
			let byte = this.buffer.get(i++);
			let cp = 0;
			if ((byte & 0b10000000) === 0b00000000) {
				let a = byte & 0b01111111;
				cp = (a << 0);
			} else if ((byte & 0b11100000) === 0b11000000) {
				let a = byte & 0b00011111;
				let b = this.getContinuationByte(i++);
				cp = (a << 6) | (b << 0);
			} else if ((byte & 0b11110000) === 0b11100000) {
				let a = byte & 0b00001111;
				let b = this.getContinuationByte(i++);
				let c = this.getContinuationByte(i++);
				cp = (a << 12) | (b << 6) | (c << 0);
			} else if ((byte & 0b11111000) === 0b11110000) {
				let a = byte & 0b00000111;
				let b = this.getContinuationByte(i++);
				let c = this.getContinuationByte(i++);
				let d = this.getContinuationByte(i++);
				cp = (a << 18) | (b << 12) | (c << 6) | (d << 0);
			} else {
				throw `Expected ${byte} to be a starting byte!`;
			}
			if (cp === 0) {
				break;
			}
			value += String.fromCodePoint(cp);
		}
		return value;
	}

	set value(value: string) {
		let length = 0;
		this.encode(value, (byte) => {
			length += 1;
		});
		if (length > this.buffer.size()) {
			throw `Expected "${value}" to be encoded using at most ${this.buffer.size()} bytes!`;
		}
		let i = 0;
		this.encode(value, (byte) => {
			this.buffer.set(i++, byte);
		});
		while (i < this.buffer.size()) {
			this.buffer.set(i++, 0);
		}
	}

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(0);
		super(buffer);
	}
};

export class Integer1 extends Chunk {
	private complement: Complement;

	get value(): number {
		let value = this.buffer.get(0);
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value > 0x7F) {
				value -= 0xFF;
			}
		} else if (this.complement === "twos") {
			if (value > 0x7F) {
				value -= 0xFF + 1;
			}
		}
		return value;
	}

	set value(value: number) {
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value < 0) {
				value += 0xFF;
			}
		} else if (this.complement === "twos") {
			if (value < 0) {
				value += 0xFF + 1;
			}
		}
		IntegerAssert.between(0, value, 0xFF);
		this.buffer.set(0, value);
	}

	constructor(options?: Partial<{ buffer: Buffer, complement: Complement }>) {
		let buffer = options?.buffer ?? Buffer.alloc(1);
		let complement = options?.complement ?? "none";
		IntegerAssert.exactly(buffer.size(), 1);
		super(buffer);
		this.complement = complement;
	}
};

export class Integer2 extends Chunk {
	private complement: Complement;
	private endian: Endian;

	get value(): number {
		let a = this.buffer.get(0);
		let b = this.buffer.get(1);
		let value = 0;
		if (false) {
		} else if (this.endian === "big") {
			value = ((a << 8) | (b << 0)) >>> 0;
		} else if (this.endian === "little") {
			value = ((b << 8) | (a << 0)) >>> 0;
		}
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value > 0x7FFF) {
				value -= 0xFFFF;
			}
		} else if (this.complement === "twos") {
			if (value > 0x7FFF) {
				value -= 0xFFFF + 1;
			}
		}
		return value;
	}

	set value(value: number) {
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value < 0) {
				value += 0xFFFF;
			}
		} else if (this.complement === "twos") {
			if (value < 0) {
				value += 0xFFFF + 1;
			}
		}
		IntegerAssert.between(0, value, 0xFFFF);
		if (false) {
		} else if (this.endian === "big") {
			this.buffer.set(0, (value >>>  8) & 0xFF);
			this.buffer.set(1, (value >>>  0) & 0xFF);
		} else if (this.endian === "little") {
			this.buffer.set(0, (value >>>  0) & 0xFF);
			this.buffer.set(1, (value >>>  8) & 0xFF);
		}
	}

	constructor(options?: Partial<{ buffer: Buffer, complement: Complement, endian: Endian }>) {
		let buffer = options?.buffer ?? Buffer.alloc(2);
		let complement = options?.complement ?? "none";
		let endian = options?.endian ?? "little";
		IntegerAssert.exactly(buffer.size(), 2);
		super(buffer);
		this.complement = complement;
		this.endian = endian;
	}
};

export class Integer3 extends Chunk {
	private complement: Complement;
	private endian: Endian;

	get value(): number {
		let a = this.buffer.get(0);
		let b = this.buffer.get(1);
		let c = this.buffer.get(2);
		let value = 0;
		if (false) {
		} else if (this.endian === "big") {
			value = ((a << 16) | (b << 8) | (c << 0)) >>> 0;
		} else if (this.endian === "little") {
			value = ((c << 16) | (b << 8) | (a << 0)) >>> 0;
		}
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value > 0x7FFFFF) {
				value -= 0xFFFFFF;
			}
		} else if (this.complement === "twos") {
			if (value > 0x7FFFFF) {
				value -= 0xFFFFFF + 1;
			}
		}
		return value;
	}

	set value(value: number) {
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value < 0) {
				value += 0xFFFFFF;
			}
		} else if (this.complement === "twos") {
			if (value < 0) {
				value += 0xFFFFFF + 1;
			}
		}
		IntegerAssert.between(0, value, 0xFFFFFF);
		if (false) {
		} else if (this.endian === "big") {
			this.buffer.set(0, (value >>> 16) & 0xFF);
			this.buffer.set(1, (value >>>  8) & 0xFF);
			this.buffer.set(2, (value >>>  0) & 0xFF);
		} else if (this.endian === "little") {
			this.buffer.set(0, (value >>>  0) & 0xFF);
			this.buffer.set(1, (value >>>  8) & 0xFF);
			this.buffer.set(2, (value >>> 16) & 0xFF);
		}
	}

	constructor(options?: Partial<{ buffer: Buffer, complement: Complement, endian: Endian }>) {
		let buffer = options?.buffer ?? Buffer.alloc(3);
		let complement = options?.complement ?? "none";
		let endian = options?.endian ?? "little";
		IntegerAssert.exactly(buffer.size(), 3);
		super(buffer);
		this.complement = complement;
		this.endian = endian;
	}
};

export class Integer4 extends Chunk {
	private complement: Complement;
	private endian: Endian;

	get value(): number {
		let a = this.buffer.get(0);
		let b = this.buffer.get(1);
		let c = this.buffer.get(2);
		let d = this.buffer.get(3);
		let value = 0;
		if (false) {
		} else if (this.endian === "big") {
			value = ((a << 24) | (b << 16) | (c << 8) | (d << 0)) >>> 0;
		} else if (this.endian === "little") {
			value = ((d << 24) | (c << 16) | (b << 8) | (a << 0)) >>> 0;
		}
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value > 0x7FFFFFFF) {
				value -= 0xFFFFFFFF;
			}
		} else if (this.complement === "twos") {
			if (value > 0x7FFFFFFF) {
				value -= 0xFFFFFFFF + 1;
			}
		}
		return value;
	}

	set value(value: number) {
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value < 0) {
				value += 0xFFFFFFFF;
			}
		} else if (this.complement === "twos") {
			if (value < 0) {
				value += 0xFFFFFFFF + 1;
			}
		}
		IntegerAssert.between(0, value, 0xFFFFFFFF);
		if (false) {
		} else if (this.endian === "big") {
			this.buffer.set(0, (value >>> 24) & 0xFF);
			this.buffer.set(1, (value >>> 16) & 0xFF);
			this.buffer.set(2, (value >>>  8) & 0xFF);
			this.buffer.set(3, (value >>>  0) & 0xFF);
		} else if (this.endian === "little") {
			this.buffer.set(0, (value >>>  0) & 0xFF);
			this.buffer.set(1, (value >>>  8) & 0xFF);
			this.buffer.set(2, (value >>> 16) & 0xFF);
			this.buffer.set(3, (value >>> 24) & 0xFF);
		}
	}

	constructor(options?: Partial<{ buffer: Buffer, complement: Complement, endian: Endian }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		let complement = options?.complement ?? "none";
		let endian = options?.endian ?? "little";
		IntegerAssert.exactly(buffer.size(), 4);
		super(buffer);
		this.complement = complement;
		this.endian = endian;
	}
};

export class PackedInteger1 {
	private integer: Integer1;
	private offset: number;
	private length: number;

	get value(): number {
		let a = 32 - this.offset - this.length;
		let b = 32 - this.length;
		return (this.integer.value << a) >>> b;
	}

	set value(value: number) {
		let a = this.offset;
		let b = 32 - this.length;
		let c = 32 - this.offset - this.length;
		let m = ((0xFF >> a) << b) >>> c;
		IntegerAssert.between(0, value, m >>> a);
		this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
	}

	constructor(integer: Integer1, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? 8 - offset;
		IntegerAssert.between(0, offset, 8);
		IntegerAssert.between(0, length, 8 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
};

export class PackedInteger2 {
	private integer: Integer2;
	private offset: number;
	private length: number;

	get value(): number {
		let a = 32 - this.offset - this.length;
		let b = 32 - this.length;
		return (this.integer.value << a) >>> b;
	}

	set value(value: number) {
		let a = this.offset;
		let b = 32 - this.length;
		let c = 32 - this.offset - this.length;
		let m = ((0xFFFF >> a) << b) >>> c;
		IntegerAssert.between(0, value, m >>> a);
		this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
	}

	constructor(integer: Integer2, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? 16 - offset;
		IntegerAssert.between(0, offset, 16);
		IntegerAssert.between(0, length, 16 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
};

export class PackedInteger3 {
	private integer: Integer3;
	private offset: number;
	private length: number;

	get value(): number {
		let a = 32 - this.offset - this.length;
		let b = 32 - this.length;
		return (this.integer.value << a) >>> b;
	}

	set value(value: number) {
		let a = this.offset;
		let b = 32 - this.length;
		let c = 32 - this.offset - this.length;
		let m = ((0xFFFFFF >> a) << b) >>> c;
		IntegerAssert.between(0, value, m >>> a);
		this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
	}

	constructor(integer: Integer3, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? 24 - offset;
		IntegerAssert.between(0, offset, 24);
		IntegerAssert.between(0, length, 24 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
};

export class PackedInteger4 {
	private integer: Integer4;
	private offset: number;
	private length: number;

	get value(): number {
		let a = 32 - this.offset - this.length;
		let b = 32 - this.length;
		return (this.integer.value << a) >>> b;
	}

	set value(value: number) {
		let a = this.offset;
		let b = 32 - this.length;
		let c = 32 - this.offset - this.length;
		let m = ((0xFFFFFFFF >> a) << b) >>> c;
		IntegerAssert.between(0, value, m >>> a);
		this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
	}

	constructor(integer: Integer4, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? 32 - offset;
		IntegerAssert.between(0, offset, 32);
		IntegerAssert.between(0, length, 32 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
};

export class BufferReader implements Reader {
	private buffer: Buffer;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(0);
		this.buffer = buffer;
	}

	async read(cursor: Cursor, target: Buffer): Promise<Buffer> {
		let window = this.buffer.window({
			offset: cursor.offset,
			length: target.size()
		});
		window.copy(target);
		cursor.offset += target.size();
		return target;
	}

	size(): number {
		return this.buffer.size();
	}
};

export class NodeFileReader implements Reader {
	private fd: number;

	constructor(path: string) {
		this.fd = libfs.openSync(path, "r");
	}

	close(): void {
		libfs.closeSync(this.fd);
	}

	async read(cursor: Cursor, target: Buffer): Promise<Buffer> {
		let array = new Uint8Array(target.size());
		let bytes_read = libfs.readSync(this.fd, array, {
			position: cursor.offset
		});
		if (bytes_read !== target.size()) {
			throw `Unexpectedly read ${bytes_read} bytes when expecting to read ${target.size()} bytes!`;
		}
		target.place(array);
		cursor.offset += bytes_read;
		return target;
	}

	size(): number {
		let stat = libfs.fstatSync(this.fd);
		return stat.size;
	}
};

export class NodeFileWriter implements Writer {
	private fd: number;

	constructor(path: string) {
		this.fd = libfs.openSync(path, "w");
	}

	close(): void {
		libfs.closeSync(this.fd);
	}

	async write(cursor: Cursor, source: Buffer): Promise<Buffer> {
		let array = new Uint8Array(source.size());
		let target = new Buffer(array.buffer);
		source.copy(target);
		let bytes_written = libfs.writeSync(this.fd, array, null, null, cursor.offset);
		if (bytes_written !== source.size()) {
			throw `Unexpectedly wrote ${bytes_written} bytes when expecting to write ${source.size()} bytes!`;
		}
		cursor.offset += bytes_written;
		return source;
	}

	size(): number {
		let stat = libfs.fstatSync(this.fd);
		return stat.size;
	}
};

export class RiffHeader extends Chunk {
	readonly type: Utf8String;
	readonly size: Integer4;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(8);
		IntegerAssert.exactly(buffer.size(), 8);
		super(buffer);
		this.type = new Utf8String({
			buffer: buffer.window({ offset: 0, length: 4 })
		});
		this.size = new Integer4({
			buffer: buffer.window({ offset: 4, length: 4 })
		});
	}
};

export class RiffFile {
	private constructor() {}

	static async parseChunk(cursor: Cursor, reader: Reader): Promise<{ header: RiffHeader, body: Reader }> {
		let header = new RiffHeader();
		await header.load(cursor, reader);
		let body = new WindowedReader(reader, { offset: cursor.offset, length: header.size.value });
		cursor.offset += header.size.value;
		cursor.offset += cursor.offset % 2;
		return {
			header,
			body
		};
	}
};

namespace wave {

export class Header extends Chunk {
	readonly audio_format: Integer2;
	readonly channel_count: Integer2;
	readonly sample_rate: Integer4;
	readonly byte_rate: Integer4;
	readonly block_align: Integer2;
	readonly bits_per_sample: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(16);
		IntegerAssert.exactly(buffer.size(), 16);
		super(buffer);
		this.audio_format = new Integer2({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.channel_count = new Integer2({
			buffer: buffer.window({
				offset: 2,
				length: 2
			})
		});
		this.sample_rate = new Integer4({
			buffer: buffer.window({
				offset: 4,
				length: 4
			})
		});
		this.byte_rate = new Integer4({
			buffer: buffer.window({
				offset: 8,
				length: 4
			})
		});
		this.block_align = new Integer2({
			buffer: buffer.window({
				offset: 12,
				length: 2
			})
		});
		this.bits_per_sample = new Integer2({
			buffer: buffer.window({
				offset: 14,
				length: 2
			})
		});
	}
};

}

namespace soundfont {

export class Ranges extends Chunk {
	readonly lo: Integer1;
	readonly hi: Integer1;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(2);
		IntegerAssert.exactly(buffer.size(), 2);
		super(buffer);
		this.lo = new Integer1({
			buffer: buffer.window({ offset: 0, length: 1 })
		});
		this.hi = new Integer1({
			buffer: buffer.window({ offset: 1, length: 1 })
		});
	}

	toJSON() {
		return {
			lo: this.lo.value,
			hi: this.hi.value
		};
	}
};

export class GeneratorAmount extends Chunk {
	readonly ranges: Ranges;
	readonly amount_signed: Integer2;
	readonly amount: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(2);
		IntegerAssert.exactly(buffer.size(), 2);
		super(buffer);
		this.ranges = new Ranges({
			buffer: buffer.window({ offset: 0, length: 2 })
		});
		this.amount_signed = new Integer2({
			buffer: buffer.window({ offset: 0, length: 2 }),
			complement: "twos"
		});
		this.amount = new Integer2({
			buffer: buffer.window({ offset: 0, length: 2 })
		});
	}

	toJSON() {
		return {
			ranges: this.ranges.toJSON(),
			amount_signed: this.amount_signed.value,
			amount: this.amount.value
		};
	}
};

export class Modulator extends Integer2 {
	readonly index: PackedInteger2;
	readonly continuous: PackedInteger2;
	readonly direction: PackedInteger2;
	readonly polarity: PackedInteger2;
	readonly type: PackedInteger2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		super(options);
		this.index = new PackedInteger2(this, {
			offset: 0,
			length: 7
		});
		this.continuous = new PackedInteger2(this, {
			offset: 7,
			length: 1
		});
		this.direction = new PackedInteger2(this, {
			offset: 8,
			length: 1
		});
		this.polarity = new PackedInteger2(this, {
			offset: 9,
			length: 1
		});
		this.type = new PackedInteger2(this, {
			offset: 10,
			length: 6
		});
	}

	toJSON() {
		return {
			index: this.index.value,
			continuous: this.continuous.value,
			direction: this.direction.value,
			polarity: this.polarity.value,
			type: this.type.value
		};
	}
};

export class Generator extends Integer2 {
	readonly index: PackedInteger2;
	readonly link: PackedInteger2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		super(options);
		this.index = new PackedInteger2(this, {
			offset: 0,
			length: 15
		});
		this.link = new PackedInteger2(this, {
			offset: 15,
			length: 1
		});
	}

	toJSON() {
		return {
			index: this.index.value,
			link: this.link.value
		};
	}
};

export class Transform extends Integer2 {
	readonly index: PackedInteger2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		super(options);
		this.index = new PackedInteger2(this, {
			offset: 0,
			length: 16
		});
	}

	toJSON() {
		return {
			index: this.index.value
		};
	}
};

export class PresetHeader extends Chunk {
	readonly name: Utf8String;
	readonly preset: Integer2;
	readonly bank: Integer2;
	readonly pbag_index: Integer2;
	readonly library: Integer4;
	readonly genre: Integer4;
	readonly morphology: Integer4;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(38);
		IntegerAssert.exactly(buffer.size(), 38);
		super(buffer);
		this.name = new Utf8String({
			buffer: buffer.window({
				offset: 0,
				length: 20
			})
		});
		this.preset = new Integer2({
			buffer: buffer.window({
				offset: 20,
				length: 2
			})
		});
		this.bank = new Integer2({
			buffer: buffer.window({
				offset: 22,
				length: 2
			})
		});
		this.pbag_index = new Integer2({
			buffer: buffer.window({
				offset: 24,
				length: 2
			})
		});
		this.library = new Integer4({
			buffer: buffer.window({
				offset: 26,
				length: 4
			})
		});
		this.genre = new Integer4({
			buffer: buffer.window({
				offset: 30,
				length: 4
			})
		});
		this.morphology = new Integer4({
			buffer: buffer.window({
				offset: 34,
				length: 4
			})
		});
	}

	toJSON() {
		return {
			name: this.name.value,
			preset: this.preset.value,
			bank: this.bank.value,
			pbag_index: this.pbag_index.value,
			library: this.library.value,
			genre: this.genre.value,
			morphology: this.morphology.value
		};
	}
};

export class PresetBag extends Chunk {
	readonly pgen_index: Integer2;
	readonly pmod_index: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		IntegerAssert.exactly(buffer.size(), 4);
		super(buffer);
		this.pgen_index = new Integer2({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.pmod_index = new Integer2({
			buffer: buffer.window({
				offset: 2,
				length: 2
			})
		});
	}

	toJSON() {
		return {
			pgen_index: this.pgen_index.value,
			pmod_index: this.pmod_index.value
		};
	}
};

export class PresetModulator extends Chunk {
	readonly modulator_source_operator: Modulator;
	readonly generator_destination_operator: Generator;
	readonly modulator_amount: Integer2;
	readonly modulator_amount_source_operator: Modulator;
	readonly modulator_transform_operator: Transform;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(10);
		IntegerAssert.exactly(buffer.size(), 10);
		super(buffer);
		this.modulator_source_operator = new Modulator({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.generator_destination_operator = new Generator({
			buffer: buffer.window({
				offset: 2,
				length: 2
			})
		});
		this.modulator_amount = new Integer2({
			buffer: buffer.window({
				offset: 4,
				length: 2
			}),
			complement: "twos"
		});
		this.modulator_amount_source_operator = new Modulator({
			buffer: buffer.window({
				offset: 6,
				length: 2
			})
		});
		this.modulator_transform_operator = new Transform({
			buffer: buffer.window({
				offset: 8,
				length: 2
			})
		});
	}

	toJSON() {
		return {
			modulator_source_operator: this.modulator_source_operator.toJSON(),
			generator_destination_operator: this.generator_destination_operator.toJSON(),
			modulator_amount: this.modulator_amount.value,
			modulator_amount_source_operator: this.modulator_amount_source_operator.toJSON(),
			modulator_transform_operator: this.modulator_transform_operator.toJSON()
		};
	}
};

export class PresetGenerator extends Chunk {
	readonly generator: Generator;
	readonly amount: GeneratorAmount;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		IntegerAssert.exactly(buffer.size(), 4);
		super(buffer);
		this.generator = new Generator({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.amount = new GeneratorAmount({
			buffer: buffer.window({
				offset: 2,
				length: 2
			})
		});
	}

	toJSON() {
		return {
			generator: this.generator.toJSON(),
			amount: this.amount.toJSON()
		};
	}
};

export class Instrument extends Chunk {
	readonly name: Utf8String;
	readonly ibag_index: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(22);
		IntegerAssert.exactly(buffer.size(), 22);
		super(buffer);
		this.name = new Utf8String({
			buffer: buffer.window({
				offset: 0,
				length: 20
			})
		});
		this.ibag_index = new Integer2({
			buffer: buffer.window({
				offset: 20,
				length: 2
			})
		});
	}

	toJSON() {
		return {
			name: this.name.value,
			ibag_index: this.ibag_index.value
		};
	}
};

export class InstrumentBag extends Chunk {
	readonly igen_index: Integer2;
	readonly imod_index: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		IntegerAssert.exactly(buffer.size(), 4);
		super(buffer);
		this.igen_index = new Integer2({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.imod_index = new Integer2({
			buffer: buffer.window({
				offset: 2,
				length: 2
			})
		});
	}

	toJSON() {
		return {
			igen_index: this.igen_index.value,
			imod_index: this.imod_index.value
		};
	}
};

export class InstrumentModulator extends Chunk {
	readonly modulator_source_operator: Modulator;
	readonly generator_destination_operator: Generator;
	readonly modulator_amount: Integer2;
	readonly modulator_amount_source_operator: Modulator;
	readonly modulator_transform_operator: Transform;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(10);
		IntegerAssert.exactly(buffer.size(), 10);
		super(buffer);
		this.modulator_source_operator = new Modulator({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.generator_destination_operator = new Generator({
			buffer: buffer.window({
				offset: 2,
				length: 2
			})
		});
		this.modulator_amount = new Integer2({
			buffer: buffer.window({
				offset: 4,
				length: 2
			}),
			complement: "twos"
		});
		this.modulator_amount_source_operator = new Modulator({
			buffer: buffer.window({
				offset: 6,
				length: 2
			})
		});
		this.modulator_transform_operator = new Transform({
			buffer: buffer.window({
				offset: 8,
				length: 2
			})
		});
	}

	toJSON() {
		return {
			modulator_source_operator: this.modulator_source_operator.toJSON(),
			generator_destination_operator: this.generator_destination_operator.toJSON(),
			modulator_amount: this.modulator_amount.value,
			modulator_amount_source_operator: this.modulator_amount_source_operator.toJSON(),
			modulator_transform_operator: this.modulator_transform_operator.toJSON()
		};
	}
};

export class InstrumentGenerator extends Chunk {
	readonly generator: Generator;
	readonly amount: GeneratorAmount;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		IntegerAssert.exactly(buffer.size(), 4);
		super(buffer);
		this.generator = new Generator({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.amount = new GeneratorAmount({
			buffer: buffer.window({
				offset: 2,
				length: 2
			})
		});
	}

	toJSON() {
		return {
			generator: this.generator.value,
			amount: this.amount.toJSON()
		};
	}
};

export class SampleHeader extends Chunk {
	readonly name: Utf8String;
	readonly start: Integer4;
	readonly end: Integer4;
	readonly loop_start: Integer4;
	readonly loop_end: Integer4;
	readonly sample_rate: Integer4;
	readonly original_key: Integer1;
	readonly correction: Integer1;
	readonly link: Integer2;
	readonly type: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(46);
		IntegerAssert.exactly(buffer.size(), 46);
		super(buffer);
		this.name = new Utf8String({
			buffer: buffer.window({
				offset: 0,
				length: 20
			})
		});
		this.start = new Integer4({
			buffer: buffer.window({
				offset: 20,
				length: 4
			})
		});
		this.end = new Integer4({
			buffer: buffer.window({
				offset: 24,
				length: 4
			})
		});
		this.loop_start = new Integer4({
			buffer: buffer.window({
				offset: 28,
				length: 4
			})
		});
		this.loop_end = new Integer4({
			buffer: buffer.window({
				offset: 32,
				length: 4
			})
		});
		this.sample_rate = new Integer4({
			buffer: buffer.window({
				offset: 36,
				length: 4
			})
		});
		this.original_key = new Integer1({
			buffer: buffer.window({
				offset: 40,
				length: 1
			})
		});
		this.correction = new Integer1({
			buffer: buffer.window({
				offset: 41,
				length: 1
			}),
			complement: "twos"
		});
		this.link = new Integer2({
			buffer: buffer.window({
				offset: 42,
				length: 2
			})
		});
		this.type = new Integer2({
			buffer: buffer.window({
				offset: 44,
				length: 2
			})
		});
	}

	toJSON() {
		return {
			name: this.name.value,
			start: this.start.value,
			end: this.end.value,
			loop_start: this.loop_start.value,
			loop_end: this.loop_end.value,
			sample_rate: this.sample_rate.value,
			original_key: this.original_key.value,
			correction: this.correction.value,
			link: this.link.value,
			type: this.type.value
		};
	}
};

export class File implements Loadable {
	smpl: Reader;
	sm24: Reader;
	phdr: Array<PresetHeader>;
	pbag: Array<PresetBag>;
	pmod: Array<PresetModulator>;
	pgen: Array<PresetGenerator>;
	inst: Array<Instrument>;
	ibag: Array<InstrumentBag>;
	imod: Array<InstrumentModulator>;
	igen: Array<InstrumentGenerator>;
	shdr: Array<SampleHeader>;

	constructor() {
		this.smpl = new BufferReader();
		this.sm24 = new BufferReader();
		this.phdr = new Array<PresetHeader>();
		this.pbag = new Array<PresetBag>();
		this.pmod = new Array<PresetModulator>();
		this.pgen = new Array<PresetGenerator>();
		this.inst = new Array<Instrument>();
		this.ibag = new Array<InstrumentBag>();
		this.imod = new Array<InstrumentModulator>();
		this.igen = new Array<InstrumentGenerator>();
		this.shdr = new Array<SampleHeader>();
	}

	async dump(target: string): Promise<void> {
		libfs.mkdirSync(target, { recursive: true });
		for (let sample of this.shdr) {
			let header = new wave.Header();
			header.audio_format.value = 1;
			header.channel_count.value = [0x0008, 0x8008].includes(sample.type.value) ? 2 : 1;
			header.sample_rate.value = sample.sample_rate.value;
			header.bits_per_sample.value = 16;
			header.byte_rate.value = header.sample_rate.value * header.channel_count.value * header.bits_per_sample.value / 8;
			header.block_align.value = header.channel_count.value * header.bits_per_sample.value / 8;
			let buffer = Buffer.alloc((sample.end.value - sample.start.value + 1) * 2);
			await this.smpl.read({ offset: sample.start.value * 2 }, buffer);
			let riff_header = new RiffHeader();
			riff_header.type.value = "RIFF";
			riff_header.size.value = 4 + 8 + 16 + 8 + buffer.size();
			let format = new Utf8String({
				buffer: Buffer.alloc(4)
			});
			format.value = "WAVE";
			let format_riff_header = new RiffHeader();
			format_riff_header.type.value = "fmt ";
			format_riff_header.size.value = 16;
			let data_riff_header = new RiffHeader();
			data_riff_header.type.value = "data";
			data_riff_header.size.value = buffer.size();
			let writer = new NodeFileWriter(`./private/samples/${sample.name.value}.wav`);
			let cursor = new Cursor();
			await riff_header.save(cursor, writer);
			await format.save(cursor, writer);
			await format_riff_header.save(cursor, writer);
			await header.save(cursor, writer);
			await data_riff_header.save(cursor, writer);
			await buffer.save(cursor, writer);
			writer.close();
		}
	}

	async load(cursor: Cursor, reader: Reader): Promise<this> {
		let chunk = await RiffFile.parseChunk(cursor, reader);
		console.log("" + chunk.header.type.value + ": " + chunk.header.size.value);
		StringAssert.identical(chunk.header.type.value, "RIFF");
		{
			let reader = chunk.body;
			let cursor = new Cursor();
			let type = await new Utf8String({ buffer: Buffer.alloc(4) }).load(cursor, reader);
			StringAssert.identical(type.value, "sfbk");
			while (cursor.offset < reader.size()) {
				let chunk = await RiffFile.parseChunk(cursor, reader);
				console.log("\t" + chunk.header.type.value + ": " + chunk.header.size.value);
				StringAssert.identical(chunk.header.type.value, "LIST");
				{
					let reader = chunk.body;
					let cursor = new Cursor();
					let type = await new Utf8String({ buffer: Buffer.alloc(4) }).load(cursor, reader);
					if (false) {
					} else if (type.value === "INFO") {
						while (cursor.offset < reader.size()) {
							let chunk = await RiffFile.parseChunk(cursor, reader);
							console.log("\t\t" + chunk.header.type.value + ": " + chunk.header.size.value);
							if (false) {
							} else if (chunk.header.type.value === "ifil") {
							} else if (chunk.header.type.value === "INAM") {
							} else if (chunk.header.type.value === "ISFT") {
							} else if (chunk.header.type.value === "ICOP") {
							} else if (chunk.header.type.value === "IENG") {
							} else if (chunk.header.type.value === "ICMT") {
							}
						}
					} else if (type.value === "sdta") {
						while (cursor.offset < reader.size()) {
							let chunk = await RiffFile.parseChunk(cursor, reader);
							console.log("\t\t" + chunk.header.type.value + ": " + chunk.header.size.value);
							if (false) {
							} else if (chunk.header.type.value === "smpl") {
								this.smpl = chunk.body;
							} else if (chunk.header.type.value === "sm24") {
								this.sm24 = chunk.body;
							}
						}
					} else if (type.value === "pdta") {
						while (cursor.offset < reader.size()) {
							let chunk = await RiffFile.parseChunk(cursor, reader);
							console.log("\t\t" + chunk.header.type.value + ": " + chunk.header.size.value);
							if (false) {
							} else if (chunk.header.type.value === "phdr") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new PresetHeader().load(cursor, reader);
									this.phdr.push(header);
								}
							} else if (chunk.header.type.value === "pbag") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new PresetBag().load(cursor, reader);
									this.pbag.push(header);
								}
							} else if (chunk.header.type.value === "pmod") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new PresetModulator().load(cursor, reader);
									this.pmod.push(header);
								}
							} else if (chunk.header.type.value === "pgen") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new PresetGenerator().load(cursor, reader);
									this.pgen.push(header);
								}
							} else if (chunk.header.type.value === "inst") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new Instrument().load(cursor, reader);
									this.inst.push(header);
								}
							} else if (chunk.header.type.value === "ibag") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new InstrumentBag().load(cursor, reader);
									this.ibag.push(header);
								}
							} else if (chunk.header.type.value === "imod") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new InstrumentModulator().load(cursor, reader);
									this.imod.push(header);
								}
							} else if (chunk.header.type.value === "igen") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new InstrumentGenerator().load(cursor, reader);
									this.igen.push(header);
								}
							} else if (chunk.header.type.value === "shdr") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new SampleHeader().load(cursor, reader);
									this.shdr.push(header);
								}
							}
						}
					}
				}
			}
		}
		return this;
	}
};

}

(async () => {
	let reader = new NodeFileReader("./dist/static/gm.sf2");
	let cursor = new Cursor();
	let sf = await new soundfont.File().load(cursor, reader);
	await sf.dump("./private/samples/");
	let banks = new Set<number>();
	sf.phdr.map((f) => {
		banks.add(f.preset.value);
	});
	console.log(banks);
})();
