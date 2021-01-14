import { Cursor } from "./cursor";
import { Reader } from "./reader";

export interface Loadable {
	load(cursor: Cursor, reader: Reader): Promise<this>;
};
