import * as libfs from "fs";

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
	let recordCount = archive.readUInt32LE(cursor); cursor += 4;
	for (let i = 0; i < recordCount; i++) {
		let offset = archive.readUInt32LE(cursor); cursor += 4;
		let buffer = decompressRecord(archive, offset);
		libfs.writeFileSync(`${target}${i.toString().padStart(3, "0")}`, buffer);
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
	data: ArrayBuffer
};

function readType(buffer: ArrayBuffer, options: { cursor: number }): string {
	let type = new TextDecoder().decode(buffer.slice(options.cursor, options.cursor + 4));
	options.cursor += 4;
	return type;
}

function readChunk(buffer: ArrayBuffer, options: { cursor: number }): Chunk {
	let type = readType(buffer, options);
	let size = new DataView(buffer, options.cursor, 4).getUint32(0);
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

function xmi2mid(source: string, target: string): void {
	let buffer = libfs.readFileSync(source).buffer;
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
				let g_channel = 0;
				let g_tempo = 500000;
				while (options.cursor < buffer.length) {
					let byte = buffer.readUInt8(options.cursor); options.cursor += 1;
					let delay = 0;
					if (byte < 0x80) {
						options.cursor -= 1;
						while (true) {
							byte = buffer.readUInt8(options.cursor); options.cursor += 1;
							delay += byte;
							if (byte < 0x7F) {
								break;
							}
						}
						byte = buffer.readUInt8(options.cursor); options.cursor += 1;
					}
					if (delay > 0) {
						console.log("Delay", delay);
					}
					let event = (byte >> 4) & 0x0F;
					let channel = (byte >> 0) & 0x0F;
					if (event < 0x08) {
						throw `Invalid event ${event} @ ${options.cursor}`;
					} else if (event === 0x8) {
						console.log("Note off");
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
					} else if (event === 0x9) {
						console.log("Note on", options.cursor);
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
						let ticks = readVarlen(buffer, options);
					} else if (event === 0xA) {
						console.log("Polyphonic key pressure");
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
					} else if (event === 0xB) {
						console.log("Controller");
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
					} else if (event === 0xC) {
						console.log("Instrument change");
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
					} else if (event === 0xD) {
						console.log("Channel pressure");
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
					} else if (event === 0xE) {
						console.log("Pitch bend");
						let a = buffer.readUInt8(options.cursor); options.cursor += 1;
						let b = buffer.readUInt8(options.cursor); options.cursor += 1;
					} else if (event === 0xF) {
						if (channel < 0xF) {
							console.log("Sysex");
							let size = readVarlen(buffer, options);
							let data = buffer.slice(options.cursor, options.cursor + size); options.cursor += size;
						} else {
							console.log("Meta");
							let type = buffer.readUInt8(options.cursor); options.cursor += 1;
							let size = readVarlen(buffer, options);
							let data = buffer.slice(options.cursor, options.cursor + size); options.cursor += size;
							if (false) {
							} else if (type === 0x00) {
								console.log("\tSequence number", data);
							} else if (type >= 0x01 && type <= 0x0F) {
								console.log("\tText", data.toString("binary"));
							} else if (type === 0x20) {
								console.log("\tSet active channel", data);
								let channel = data.readUInt8(0);
								if (!(channel >= 0 && channel <= 15)) {
									throw `Invalid channel!`;
								}
								g_channel = channel;
							} else if (type === 0x2F) {
								console.log("\tEnd of track", data);
							} else if (type === 0x51) {
								console.log("\tSet tempo", data);
								let a = data.readUInt8(0);
								let b = data.readUInt8(1);
								let c = data.readUInt8(2);
								let tempo = (a << 16) | (b << 8) | (c << 0);
								g_tempo = tempo;
							} else if (type === 0x54) {
								console.log("\tSet SMPTE offset", data);
								let hours = data.readUInt8(0);
								let minutes = data.readUInt8(1);
								let seconds = data.readUInt8(2);
								let frames = data.readUInt8(3);
								let fractional_frames = data.readUInt8(4) / 100;
							} else if (type === 0x58) {
								console.log("\tTime signature", data);
								let numerator = data.readUInt8(0);
								let denominator = (1 << data.readUInt8(1));
								let clocks_per_metronome_click = data.readUInt8(2);
								let quarter_32nd_notes = data.readUInt8(3); // quarter is 24 clocks
							} else if (type === 0x7F) {
								console.log("\tSequencer specific", data);
							} else {
								console.log("\tUnrecognized", data);
							}
						}
					}
				}
			}
		}
	}
}

let command = process.argv[2];
if (command === "extract") {
	extract("./private/data.war.original", "./private/records/");
} else if (command === "pack") {
	pack("./private/records/", "c:/dos/warcraft/data/data.war");
} else if (command === "xmi2mid") {
	xmi2mid("./private/records/000", "./private/000.mid");
} else {
	console.log("Please specify command.");
}
