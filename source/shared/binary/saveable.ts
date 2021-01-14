import { Cursor } from "./cursor";
import { Writer } from "./writer";

export interface Saveable {
	save(cursor: Cursor, writer: Writer): Promise<this>;
};
