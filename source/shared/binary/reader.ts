import { IntegerAssert } from "../asserts";
import { Buffer } from "./buffer";
import { Cursor } from "./cursor";

export interface Reader {
	read(cursor: Cursor, target: Buffer): Promise<Buffer>;
	size(): number;
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
