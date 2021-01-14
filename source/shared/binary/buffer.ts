import { IntegerAssert } from "../asserts";
import { Cursor } from "./cursor";
import { Loadable } from "./loadable";
import { Reader } from "./reader";
import { Saveable } from "./saveable";
import { Writer } from "./writer";

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
