import * as fs from "fs";
import * as cp from "child_process";
import { Archive } from "./";

let array = Uint8Array.from(fs.readFileSync("./private/cnc/SCORES.MIX"));
let archive = Archive.load(array);
console.log(archive);
for (let [index, record_header] of archive.record_headers.entries()) {
	let uncompressed = array.subarray(archive.header_size + record_header.relative_offset, archive.header_size + record_header.relative_offset + record_header.length);
	fs.mkdirSync(`./private/cnc/scores/`, { recursive: true });
	fs.writeFileSync(`./private/cnc/scores/${index}`, uncompressed);
	cp.execFileSync("ffmpeg", [
		"-i", `./private/cnc/scores/${index}`,
		`./private/cnc/scores/${index}.wav`,
		"-y"
	]);
}
