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
				while (options.cursor < buffer.length) {
					let byte = buffer.readUInt8(options.cursor); options.cursor += 1;
					if (byte === 0xFF) {
						let type = buffer.readUInt8(options.cursor); options.cursor += 1;
						let size = readVarlen(buffer, options);
						let data = buffer.slice(options.cursor, options.cursor + size); options.cursor += size;
						if (type === 0x58) {
							console.log(`Time signature ${data[0]}/${1 << data[1]}ths, ${data[2]} clocks/4th, ${data[3]} 32nd/4ths`);
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
