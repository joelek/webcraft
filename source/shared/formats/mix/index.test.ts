import * as fs from "fs";
import { Archive } from "./";

let array = Uint8Array.from(fs.readFileSync("./private/cnc/SCORES.MIX"));
let archive = Archive.load(array);
console.log(archive);
for (let [index, record_header] of archive.record_headers.entries()) {
	let uncompressed = array.subarray(archive.header_size + record_header.relative_offset, archive.header_size + record_header.relative_offset + record_header.length);
	fs.mkdirSync(`./private/cnc/scores/`, { recursive: true });
	fs.writeFileSync(`./private/cnc/scores/${index}`, uncompressed);
	// ffmpeg -c:a adpcm_ima_ws -i 12 12.wav
	// ffmpeg -f wsaud -i 1 1.wav
}