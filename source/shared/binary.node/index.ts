import * as libfs from "fs";
import { Buffer, Cursor, Reader, Writer } from "../binary";
export * from "../binary";

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
