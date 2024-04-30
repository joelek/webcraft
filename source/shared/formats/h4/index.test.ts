import * as fs from "fs";
import * as zlib from "zlib";
import { Archive } from "./";

let array = Uint8Array.from(fs.readFileSync("./private/h4/music.h4r"));
let archive = Archive.load(array);
console.log(archive);
for (let record_header of archive.record_headers) {
	let compressed = array.subarray(record_header.offset, record_header.offset + record_header.compressed_size);
	let uncompressed = zlib.gunzipSync(compressed);
	fs.mkdirSync(`./private/h4/music/`, { recursive: true });
	fs.writeFileSync(`./private/h4/music/${record_header.file_name}`, uncompressed);
}
