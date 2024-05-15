import * as fs from "fs";
import { Archive } from "./";

let array = Uint8Array.from(fs.readFileSync("./private/cnc/REDALERT.MIX"));
let archive = Archive.load(array);
console.log(archive);
for (let [index, record_header] of archive.record_headers.entries()) {
	let uncompressed = array.subarray(archive.header_size + record_header.relative_offset, archive.header_size + record_header.relative_offset + record_header.length);
	fs.mkdirSync(`./private/cnc/REDALERT/`, { recursive: true });
	fs.writeFileSync(`./private/cnc/REDALERT/${index.toString().padStart(2, "0")}`, uncompressed);
}
