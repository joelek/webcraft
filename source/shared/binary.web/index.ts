import { IntegerAssert } from "../asserts";
import { Buffer, Cursor, Reader, Writer } from "../binary";
export * from "../binary";

export class WebFileReader implements Reader {
	private file: File;

	constructor(file: File) {
		this.file = file;
	}

	async read(cursor: Cursor, target: Buffer): Promise<Buffer> {
		let offset = cursor.offset;
		let length = target.size();
		IntegerAssert.between(0, offset, this.file.size);
		IntegerAssert.between(0, length, this.file.size - offset);
		let blob = this.file.slice(offset, offset + length);
		let source = new Uint8Array(await blob.arrayBuffer());
		target.place(source);
		cursor.offset += length;
		return target;
	}

	size(): number {
		return this.file.size;
	}
};
