import { Header } from "./header";
import { Cursor, Reader, WindowedReader } from "../../binary";

export class File {
	private constructor() {}

	static async parseChunk(cursor: Cursor, reader: Reader): Promise<{ header: Header, body: Reader }> {
		let header = new Header();
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
