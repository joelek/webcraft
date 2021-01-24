import * as midi from "./";
import { Cursor } from "../../binary";
import { NodeFileReader } from "../../binary.node";

(async () => {
	let reader = new NodeFileReader("./private/test.mid");
	let cursor = new Cursor();
	let file = await midi.File.fromReader(cursor, reader);
})();
