import * as libfs from "fs";

const DEBUG = false;

function decompressRecord(archive: Buffer, cursor: number): Buffer {
	let header = archive.readUInt32LE(cursor); cursor += 4;
	let decompressedSize = (header >> 0) & 0xFFFFFF;
	let isCompressed = (header >> 29) & 1;
	if (!isCompressed) {
		return archive.slice(cursor, cursor + decompressedSize);
	}
	let buffer = Buffer.alloc(decompressedSize);
	let bytesWritten = 0;
	let history = Buffer.alloc(4096);
	let historyPosition = 0;
	let controlByte = 0;
	let controlShift = 8;
	function append(byte: number): void {
		buffer[bytesWritten] = byte;
		bytesWritten += 1;
		history[historyPosition] = byte;
		historyPosition = (historyPosition + 1) & 4095;
	}
	while (bytesWritten < buffer.length) {
		if (controlShift >= 8) {
			controlByte = archive.readUInt8(cursor); cursor += 1;
			controlShift = 0;
		}
		let bit = (controlByte >> controlShift) & 1;
		controlShift += 1;
		if (bit) {
			let byte = archive.readUInt8(cursor); cursor += 1;
			append(byte);
		} else {
			let header = archive.readUInt16LE(cursor); cursor += 2;
			let offset = (header >> 0) & 4095;
			let length = (header >> 12) & 15;
			for (let i = offset; i < offset + length + 3; i++) {
				let byte = history[i & 4095];
				append(byte);
			}
		}
	}
	return buffer;
}

function extract(source: string, target: string): void {
	libfs.mkdirSync(target, { recursive: true });
	let archive = libfs.readFileSync(source);
	let cursor = 0;
	let version = archive.readUInt32LE(cursor); cursor += 4
	let recordCount = archive.readUInt16LE(cursor); cursor += 2;
	let id = archive.readUInt16LE(cursor); cursor += 2;
	for (let i = 0; i < recordCount; i++) {
		let offset = archive.readUInt32LE(cursor); cursor += 4;
		let buffer = decompressRecord(archive, offset);
		let ext = "";
		if (buffer.slice(0, 4).toString("binary") === "RIFF") {
			ext = ".wav";
		} else if (buffer.slice(0, 20).toString("binary") === "Creative Voice File\x1A") {
			ext = ".voc";
		} else if (buffer.slice(0, 4).toString("binary") === "FORM") {
			ext = ".xmi";
		}
		libfs.writeFileSync(`${target}${i.toString().padStart(3, "0")}${ext}`, buffer);
	}
}

function pack(source: string, target: string): void {
	let entries = libfs.readdirSync(source, { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.sort((one, two) => one.name.localeCompare(two.name));
	let header = Buffer.alloc(8);
	header.writeUInt32LE(24, 0);
	header.writeUInt32LE(entries.length, 4);
	let fd = libfs.openSync(target, "w");
	libfs.writeSync(fd, header);
	let offset = Buffer.alloc(4);
	offset.writeUInt32LE(8 + 4 * entries.length);
	for (let entry of entries) {
		libfs.writeSync(fd, offset);
		let stat = libfs.statSync(`${source}${entry.name}`);
		offset.writeUInt32LE(offset.readUInt32LE(0) + 4 + stat.size, 0);
	}
	for (let entry of entries) {
		let record = libfs.readFileSync(`${source}${entry.name}`);
		offset.writeUInt32LE(record.length, 0);
		libfs.writeSync(fd, offset);
		libfs.writeSync(fd, record);
	}
	libfs.closeSync(fd);
}

type Chunk = {
	type: string;
	size: number;
	data: Buffer
};

function readType(buffer: Buffer, options: { cursor: number }): string {
	let type = buffer.slice(options.cursor, options.cursor + 4).toString("binary");
	options.cursor += 4;
	return type;
}

function readChunk(buffer: Buffer, options: { cursor: number }): Chunk {
	let type = readType(buffer, options);
	let size = buffer.readUInt32BE(options.cursor);
	options.cursor += 4;
	let data = buffer.slice(options.cursor, options.cursor + size);
	options.cursor += size;
	if (options.cursor % 2 === 1) {
		options.cursor += 1;
	}
	return {
		type,
		size,
		data
	};
}

function readVarlen(buffer: Buffer, options: { cursor: number }): number {
	let value = 0;
	for (let i = 0; i < 4; i++) {
		let byte = buffer.readUInt8(options.cursor); options.cursor += 1;
		value = (value << 7) | (byte & 0x7F);
		if (byte < 128) {
			break;
		}
	}
	return value;
}

function writeVarlen(value: number): Buffer {
	let v0 = value;
	if (value < 0) {
		throw ``;
	}
	let bytes = Buffer.alloc(4);
	for (let i = 0; i < 4; i++) {
		bytes[i] = value & 0x7F;
		if (i > 0) {
			bytes[i] += 128;
		}

		if (value < 128) {
			bytes = bytes.slice(0, i + 1).reverse();
			return bytes;
		}
		value = (value >> 7);
	}
	throw `Unsupported value ${value}!`;
}

function xmi2mid_one(source: string, target: string): void {
	let buffer = libfs.readFileSync(source);
	let options = { cursor: 0 };
	let one = readChunk(buffer, options);
	let two = readChunk(buffer, options);
	{
		options.cursor = 0;
		readType(two.data, options);
		let form = readChunk(two.data, options);
		{
			options.cursor = 0
			readType(form.data, options);
			let timb = readChunk(form.data, options);
			let evnt = readChunk(form.data, options);
			{
				options.cursor = 0
				let buffer = Buffer.from(evnt.data);
				let g_tempo = 500000;
				let g_ticks = 0;
				let events = new Array<{
					timestamp: number,
					index: number,
					event: Buffer
				}>();
				while (options.cursor < buffer.length) {
					let byte = buffer.readUInt8(options.cursor); options.cursor += 1;
					let delay = 0;
					if (byte < 0x80) {
						options.cursor -= 1;
						while (true) {
							byte = buffer.readUInt8(options.cursor); options.cursor += 1;
							if (byte > 0x7F) {
								options.cursor -= 1;
								break;
							}
							delay += byte;
							if (byte < 0x7F) {
								break;
							}
						}
						byte = buffer.readUInt8(options.cursor); options.cursor += 1;
					}
					g_ticks += delay;
					//libfs.writeSync(fd, writeVarlen(delay));
					let event = (byte >> 4) & 0x0F;
					let channel = (byte >> 0) & 0x0F;
					if (event < 0x08) {
						throw `Invalid event ${event} @ ${options.cursor-1} ${delay}`;
					} else if (event === 0x8) {
						if (DEBUG) console.log(`Note off @ ${options.cursor-1}`);
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
						//libfs.writeSync(fd, Uint8Array.of(byte, a, b));
						events.push({
							timestamp: g_ticks,
							index: events.length,
							event: Buffer.of(byte, a, b)
						});
					} else if (event === 0x9) {
						if (DEBUG) console.log(`Note on @ ${options.cursor-1}`, delay);
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
						let ticks = readVarlen(buffer, options);
						//libfs.writeSync(fd, Uint8Array.of(byte, a, b));
						events.push({
							timestamp: g_ticks,
							index: events.length,
							event: Buffer.of(byte, a, b)
						});
						events.push({
							timestamp: g_ticks + ticks,
							index: events.length,
							event: Buffer.of((0x8 << 4) | channel, a, b)
						});
						//libfs.writeSync(fd, writeVarlen(ticks));
						//libfs.writeSync(fd, Uint8Array.of((0x8 << 4) | channel, a, 64));
					} else if (event === 0xA) {
						if (DEBUG) console.log(`Polyphonic key pressure @ ${options.cursor-1}`);
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
						//libfs.writeSync(fd, Uint8Array.of(byte, a, b));
						events.push({
							timestamp: g_ticks,
							index: events.length,
							event: Buffer.of(byte, a, b)
						});
					} else if (event === 0xB) {
						if (DEBUG) console.log(`Controller @ ${options.cursor-1}`);
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
						if (a === 116) {
							console.log("\tstart loop", b);
						} else if (a === 117) {
							console.log("\tend loop", b);
						}
						//libfs.writeSync(fd, Uint8Array.of(byte, a, b));
						events.push({
							timestamp: g_ticks,
							index: events.length,
							event: Buffer.of(byte, a, b)
						});
					} else if (event === 0xC) {
						if (DEBUG) console.log(`Instrument change @ ${options.cursor-1}`);
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						//libfs.writeSync(fd, Uint8Array.of(byte, a));
						events.push({
							timestamp: g_ticks,
							index: events.length,
							event: Buffer.of(byte, a)
						});
					} else if (event === 0xD) {
						if (DEBUG) console.log(`Channel pressure @ ${options.cursor-1}`);
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						//libfs.writeSync(fd, Uint8Array.of(byte, a));
						events.push({
							timestamp: g_ticks,
							index: events.length,
							event: Buffer.of(byte, a)
						});
					} else if (event === 0xE) {
						if (DEBUG) console.log(`Pitch bend @ ${options.cursor-1}`);
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
						//libfs.writeSync(fd, Uint8Array.of(byte, a, b));
						events.push({
							timestamp: g_ticks,
							index: events.length,
							event: Buffer.of(byte, a, b)
						});
					} else if (event === 0xF) {
						if (channel < 0xF) {
							if (DEBUG) console.log(`Sysex @ ${options.cursor-1}`);
							let size = readVarlen(buffer, options);
							let data = buffer.slice(options.cursor, options.cursor + size); options.cursor += size;
							//libfs.writeSync(fd, Uint8Array.of(byte));
							//libfs.writeSync(fd, writeVarlen(size));
							//libfs.writeSync(fd, data);
							events.push({
								timestamp: g_ticks,
								index: events.length,
								event: Buffer.concat([ Buffer.of(byte), writeVarlen(size), data ])
							});
						} else {
							if (DEBUG) console.log(`Meta @ ${options.cursor-1}`);
							let type = buffer.readUInt8(options.cursor); options.cursor += 1;
							let size = readVarlen(buffer, options);
							let data = buffer.slice(options.cursor, options.cursor + size); options.cursor += size;
							//libfs.writeSync(fd, Uint8Array.of(byte, type));
							//libfs.writeSync(fd, writeVarlen(size));
							//libfs.writeSync(fd, data);
							events.push({
								timestamp: g_ticks,
								index: events.length,
								event: Buffer.concat([ Buffer.of(byte, type), writeVarlen(size), data ])
							});
							if (false) {
							} else if (type === 0x00) {
								//console.log("\tSequence number", data);
							} else if (type >= 0x01 && type <= 0x0F) {
								//console.log("\tText", data.toString("binary"));
							} else if (type === 0x20) {
								//console.log("\tSet active channel", data);
								let channel = data.readUInt8(0);
								if (!(channel >= 0 && channel <= 15)) {
									throw `Invalid channel!`;
								}
							} else if (type === 0x2F) {
								//console.log("\tEnd of track", data);
								break;
							} else if (type === 0x51) {
								//console.log("\tSet tempo", data);
								let a = data.readUInt8(0);
								let b = data.readUInt8(1);
								let c = data.readUInt8(2);
								let tempo = (a << 16) | (b << 8) | (c << 0);
								g_tempo = tempo;
							} else if (type === 0x54) {
								//console.log("\tSet SMPTE offset", data);
								let hours = data.readUInt8(0);
								let minutes = data.readUInt8(1);
								let seconds = data.readUInt8(2);
								let frames = data.readUInt8(3);
								let fractional_frames = data.readUInt8(4) / 100;
							} else if (type === 0x58) {
								//console.log("\tTime signature", data);
								let numerator = data.readUInt8(0);
								let denominator = (1 << data.readUInt8(1));
								let clocks_per_metronome_click = data.readUInt8(2);
								let quarter_32nd_notes = data.readUInt8(3);
							} else if (type === 0x7F) {
								//console.log("\tSequencer specific", data);
							} else {
								//console.log("\tUnrecognized", data);
							}
						}
					}
				}
				events = events.sort((one, two) => {
					if (one.timestamp < two.timestamp) {
						return -1;
					}
					if (one.timestamp > two.timestamp) {
						return 1;
					}
					if (one.index < two.index) {
						return -1;
					}
					if (one.index > two.index) {
						return 1;
					}
					return 0;
				});
				let temp = Buffer.alloc(4);
				let fd = libfs.openSync(target, "w");
				temp.write("MThd", "binary");
				libfs.writeSync(fd, temp, 0, 4);
				temp.writeUInt32BE(6);
				libfs.writeSync(fd, temp, 0, 4);
				temp.writeUInt16BE(1);
				libfs.writeSync(fd, temp, 0, 2);
				temp.writeUInt16BE(2);
				libfs.writeSync(fd, temp, 0, 2);
				temp.writeUInt16BE(60);
				libfs.writeSync(fd, temp, 0, 2);
				let track0buf = new Array<Buffer>();
				let timeevents = events.filter((event) => {
					if (event.event[0] === 0xFF) {
						if (event.event[1] === 0x51) {
							return false;
						} else if (event.event[1] === 0x58) {
							return true;
						} else if (event.event[1] === 0x2F) {
							return true;
						}
					}
					return false;
				});
				timeevents.unshift({
					timestamp: 0,
					index: -1,
					event: Buffer.of(0xff, 0x51, 0x03, 0x07, 0xa1, 0x20)
				});
				let notevents = events.filter((event) => {
					if (event.event[0] === 0xFF) {
						if (event.event[1] === 0x51) {
							return false;
						} else if (event.event[1] === 0x58) {
							return false;
						} else if (event.event[1] === 0x2F) {
							return true;
						}
					}
					return true;
				});
				g_ticks = 0;
				for (let event of timeevents) {
					let delay = event.timestamp - g_ticks;
					track0buf.push(writeVarlen(delay), event.event);
					g_ticks = event.timestamp;
				}
				let track0head = Buffer.from("MTrk\0\0\0\0", "binary");
				let track0data = Buffer.concat(track0buf);
				track0head.writeUInt32BE(track0data.length, 4);
				let track0 = Buffer.concat([track0head, track0data]);
				libfs.writeSync(fd, track0);
				temp.write("MTrk", "binary");
				libfs.writeSync(fd, temp, 0, 4);
				temp.writeUInt32BE(0);
				libfs.writeSync(fd, temp, 0, 4);
				g_ticks = 0;
				for (let event of notevents) {
					let delay = event.timestamp - g_ticks;
					libfs.writeSync(fd, writeVarlen(delay));
					libfs.writeSync(fd, event.event);
					g_ticks = event.timestamp;
				}
				let size = libfs.fstatSync(fd).size;
				if (size % 2 === 1) {
					temp.writeUInt8(0, 0);
					libfs.writeSync(fd, temp, 0, 1);
					size += 1;
				}
				temp.writeUInt32BE(size - 22 - track0.length);
				libfs.writeSync(fd, temp, 0, 4, 18 + track0.length);
				libfs.closeSync(fd);
			}
		}
	}
}

function xmi2mid(source: string, target: string): void {
	libfs.mkdirSync(target, { recursive: true });
	let entries = libfs.readdirSync(source, { withFileTypes: true });
	for (let entry of entries) {
		console.log(entry.name);
		if (entry.isFile()) {
			try {
				xmi2mid_one(source + entry.name, target + entry.name + ".mid");
			} catch (error) {
				console.log(error);
			}
		}
	}
}

let command = process.argv[2];
if (command === "extract") {
	extract("./private/data.war.original", "./private/records/");
	extract("./private/data2.war.original", "./private/records2/");
} else if (command === "pack") {
	pack("./private/records/", "c:/dos/warcraft/data/data.war");
} else if (command === "xmi2mid") {
	xmi2mid("./private/xmi/", "./private/mid/");
} else {
	console.log("Please specify command.");
}
