import * as fs from "fs";
import { Archive } from "./";

let array = Uint8Array.from(fs.readFileSync("./private/h4/text.h4r"));
let archive = Archive.load(array);
console.log(archive);
