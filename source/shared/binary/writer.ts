import { Buffer } from "./buffer";
import { Cursor } from "./cursor";

export interface Writer {
	size(): number;
	write(cursor: Cursor, source: Buffer): Promise<Buffer>;
};
