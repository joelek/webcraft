import * as fs from "fs";
import { Archive } from "./";

let array = Uint8Array.from(fs.readFileSync("./private/MUSIC.MEG"));
let archive = Archive.load(array);
console.log(JSON.stringify(archive, null, "\t"));
for (let [index, entry] of archive.entries.entries()) {
	let uncompressed = array.subarray(entry.offset, entry.offset + entry.length);
	fs.mkdirSync(`./private/cnc/`, { recursive: true });
	fs.writeFileSync(`./private/cnc/${archive.strings[entry.string].split("\\").pop()}`, uncompressed);
}
