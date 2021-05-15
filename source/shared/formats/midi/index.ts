import { IntegerAssert, StringAssert } from "../../asserts";
import { Buffer, Chunk, Cursor, Reader, WindowedReader } from "../../binary";
import { ByteString, Integer1, Integer2, Integer4, PackedInteger1 } from "../../binary/chunks";
import { is } from "../../is";

export class ChunkHeader extends Chunk {
	readonly type: ByteString;
	readonly size: Integer4;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(8);
		IntegerAssert.exactly(buffer.size(), 8);
		super(buffer);
		this.type = new ByteString({
			buffer: buffer.window({ offset: 0, length: 4 })
		});
		this.size = new Integer4({
			buffer: buffer.window({ offset: 4, length: 4 }),
			endian: "big"
		});
	}
};

export class Header extends Chunk {
	readonly version: Integer2;
	readonly track_count: Integer2;
	readonly ticks_per_qn: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(6);
		IntegerAssert.exactly(buffer.size(), 6);
		super(buffer);
		this.version = new Integer2({
			buffer: buffer.window({ offset: 0, length: 2 }),
			endian: "big"
		});
		this.track_count = new Integer2({
			buffer: buffer.window({ offset: 2, length: 2 }),
			endian: "big"
		});
		this.ticks_per_qn = new Integer2({
			buffer: buffer.window({ offset: 4, length: 2 }),
			endian: "big"
		});
		IntegerAssert.atMost(0x7FFF, this.ticks_per_qn.value);
	}
};

export enum Type {
	NOTE_OFF = 0,
	NOTE_ON = 1,
	KEY_PRESSURE = 2,
	CONTROL_CHANGE = 3,
	PROGRAM_CHANGE = 4,
	CHANNEL_PRESSURE = 5,
	PITCH_CHANGE = 6,
	SYSEX = 7,
};

export async function readVarlen(cursor: Cursor, reader: Reader): Promise<number> {
	let value = 0;
	let buffer = Buffer.alloc(1);
	for (let i = 0; i < 4; i++) {
		await reader.read(cursor, buffer);
		let byte = buffer.get(0);
		value = (value << 7) | (byte & 0x7F);
		if (byte > 0x7F) {
			continue;
		}
		break;
	}
	return value;
};

export class Control extends Integer1 {
	readonly channel: PackedInteger1;
	readonly type: PackedInteger1;
	readonly marker: PackedInteger1;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		super(options);
		this.channel = new PackedInteger1(this, {
			offset: 0,
			length: 4
		});
		this.type = new PackedInteger1(this, {
			offset: 4,
			length: 3
		});
		this.marker = new PackedInteger1(this, {
			offset: 7,
			length: 1
		});
	}
};

export interface Event {
	delay: number,
	type: number,
	channel: number,
	data: Buffer
};

export interface Track {
	events: Array<Event>;
};

export class Track {
	private constructor() {}

	static async fromReader(cursor: Cursor, reader: Reader): Promise<Track> {
		let events = new Array<Event>();
		let last_control: Control | undefined;
		last_control = new Control();
		while (cursor.offset < reader.size()) {
			let delay = await readVarlen(cursor, reader);
			let control = await new Control().load(cursor, reader);
			if (control.marker.value === 0) {
				if (is.absent(last_control)) {
					throw `Expected last control byte to be set!`;
				}
				control = last_control;
				cursor.offset -= 1;
			}
			let type = control.type.value as Type;
			let channel = control.channel.value;
			let length = await (async () => {
				if (type === Type.NOTE_OFF) {
					return 2;
				} else
				if (type === Type.NOTE_ON) {
					return 2;
				} else
				if (type === Type.KEY_PRESSURE) {
					return 2;
				} else
				if (type === Type.CONTROL_CHANGE) {
					return 2;
				} else
				if (type === Type.PROGRAM_CHANGE) {
					return 1;
				} else
				if (type === Type.CHANNEL_PRESSURE) {
					return 1;
				} else
				if (type === Type.PITCH_CHANGE) {
					return 2;
				} else
				if (type === Type.SYSEX) {
					let length = Buffer.alloc(1);
					if (channel < 15) {
						await new Chunk(length).load({
							offset: cursor.offset
						}, reader)
						return length.get(0) + 1;
					} else {
						await new Chunk(length).load({
							offset: cursor.offset + 1
						}, reader);
						return length.get(0) + 2;
					}
				}
				throw `Expected code to be unreachable!`;
			})();
			let data = Buffer.alloc(length);
			await new Chunk(data).load(cursor, reader);
			let event: Event = {
				delay,
				type,
				channel,
				data,
			};
			events.push(event);
			if (type === Type.SYSEX) {
				if (channel === 15 && data.get(0) === 0x2F) {
					break;
				}
				last_control = new Control();
			} else {
				last_control = control;
			}
		}
		return {
			events
		};
	}
};

export interface File {
	header: Header;
	tracks: Array<Track>;
};

export class File {
	private constructor() {}

	static async fromReader(cursor: Cursor, reader: Reader): Promise<File> {
		let chunk_header = await new ChunkHeader().load(cursor, reader);
		StringAssert.identical(chunk_header.type.value, "MThd");
		let header = await new Header().load(cursor, reader);
		let tracks = new Array<Track>();
		for (let i = 0; i < header.track_count.value; i++) {
			let chunk_header = await new ChunkHeader().load(cursor, reader);
			StringAssert.identical(chunk_header.type.value, "MTrk");
			let data = new WindowedReader(reader, {
				offset: cursor.offset,
				length: chunk_header.size.value
			});
			let track = await Track.fromReader(new Cursor(), data);
			tracks.push(track);
			cursor.offset += chunk_header.size.value;
		}
		return {
			header,
			tracks
		};
	}
};
