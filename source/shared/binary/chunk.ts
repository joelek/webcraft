import { IntegerAssert } from "../asserts";
import { Buffer } from "./buffer";
import { Cursor } from "./cursor";
import { Loadable } from "./loadable";
import { Reader } from "./reader";
import { Saveable } from "./saveable";
import { Writer } from "./writer";

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

	static alloc(length: number): Chunk {
		IntegerAssert.atLeast(0, length);
		let buffer = new ArrayBuffer(length);
		return new Chunk(new Buffer(buffer));
	}
};
