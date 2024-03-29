import * as shared from "../shared";
import * as binary from "../shared/binary.web";
import { midi } from "../shared/formats";
import { MidiChannel, WavetableSynth } from "./synth";

const OVERRIDE = false;
const ZOOM = 1;

let keysle = document.createElement("div");
keysle.setAttribute("style", "position: absolute; z-index: 10; width: 100%; height: 100%; display: grid; grid-template-columns: repeat(auto-fill, 400px); pointer-events: none;");
let keys = new Array<Element>();
for (let i = 0; i < 16; i++) {
	let key = document.createElement("h2");
	key.setAttribute("style", "font-size: 60px; color: white; white-space: nowrap;");
	key.innerHTML = `[${i === 9 ? "D" : i}]:`;
	keysle.appendChild(key);
	keys.push(key);
}

if (OVERRIDE) {
	document.body.appendChild(keysle);
}

namespace is {
	export function absent<A>(subject: A | null | undefined): subject is null | undefined {
		return subject == null;
	};

	export function present<A>(subject: A | null | undefined): subject is A {
		return subject != null;
	};
};

namespace assert {
	export function assert(assertion: boolean): void {
		if (!assertion) {
			throw `Assertion failed!`;
		}
	}

	export function between(min: number, value: number, max: number): void {
		if ((value < min) || (value > max)) {
			throw `Expected ${value} to be an integer between ${min} and ${max}!`;
		}
	}

	export function identical(one: string, two: string): void {
		if (one !== two) {
			throw `Expected ${one} to be identical to ${two}!`;
		}
	}
}

type Endianness = "LittleEndian" | "BigEndian";

class BufferLike {
	private buffer: ArrayBuffer;
	private endianness: Endianness;

	constructor(buffer: ArrayBuffer, endianness: Endianness = "BigEndian") {
		this.buffer = buffer;
		this.endianness = endianness;
	}

	ui16(offset: number, endianness: Endianness = this.endianness): ui16 {
		return new ui16(endianness, this.buffer, offset);
	}
}

interface DataProvider {
	read(cursor: number, buffer: ArrayBuffer, offset?: number, length?: number): Promise<number>;
	size(): number;
}

class BufferDataProvider implements DataProvider {
	private buffer: ArrayBuffer;

	constructor(buffer: ArrayBuffer) {
		this.buffer = buffer;
	}

	async read(cursor: number, buffer: ArrayBuffer, offset?: number, length?: number): Promise<number> {
		offset = offset ?? 0;
		length = length ?? (buffer.byteLength - offset);
		let slice = this.buffer.slice(cursor, cursor + length);
		let source = new Uint8Array(slice);
		let target = new Uint8Array(buffer, offset, length);
		target.set(source, 0);
		return length;
	}

	size(): number {
		return this.buffer.byteLength;
	}
}

class FileDataProvider implements DataProvider {
	private file: File;

	constructor(file: File) {
		this.file = file;
	}

	async buffer(): Promise<DataProvider> {
		let buffer = new ArrayBuffer(this.size());
		await this.read(0, buffer);
		return new BufferDataProvider(buffer);
	}

	async read(cursor: number, buffer: ArrayBuffer, offset?: number, length?: number): Promise<number> {
		offset = offset ?? 0;
		length = length ?? (buffer.byteLength - offset);
		assert.between(0, offset, buffer.byteLength);
		assert.between(0, length, buffer.byteLength - offset);
		let blob = this.file.slice(cursor, cursor + length);
		let source = new Uint8Array(await blob.arrayBuffer());
		let target = new Uint8Array(buffer, offset, length);
		target.set(source, 0);
		return length;
	}

	size(): number {
		return this.file.size;
	}
}

class si08 {
	private endianness: Endianness;
	private view: DataView;

	get value(): number {
		return this.view.getInt8(0);
	}

	set value(next: number) {
		let last = this.value;
		this.view.setInt8(0, next);
		if (this.value !== next) {
			this.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(endianness: Endianness, buffer: ArrayBuffer = new ArrayBuffer(1), offset: number = 0) {
		assert.between(0, offset, buffer.byteLength - 1);
		this.endianness = endianness;
		this.view = new DataView(buffer, offset, 1);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
		return length;
	}
}

class si16 {
	private endianness: Endianness;
	private view: DataView;

	get value(): number {
		return this.view.getInt16(0, this.endianness === "LittleEndian");
	}

	set value(next: number) {
		let last = this.value;
		this.view.setUint16(0, next, this.endianness === "LittleEndian");
		if (this.value !== next) {
			this.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(endianness: Endianness, buffer: ArrayBuffer = new ArrayBuffer(2), offset: number = 0) {
		assert.between(0, offset, buffer.byteLength - 2);
		this.endianness = endianness;
		this.view = new DataView(buffer, offset, 2);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
		return length;
	}
}

class si24 {
	private integer: ui24;

	get value(): number {
		let value = this.integer.value;
		if (value > 0x7FFFFF) {
			value -= 0x1000000;
		}
		return value;
	}

	set value(next: number) {
		if (next < 0) {
			next += 0x1000000;
		}
		this.integer.value = next;
	}

	constructor(endianness: Endianness, buffer: ArrayBuffer = new ArrayBuffer(3), offset: number = 0) {
		this.integer = new ui24(endianness, buffer, offset);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		return this.integer.load(cursor, dataProvider);
	}
}

class si32 {
	private endianness: Endianness;
	private view: DataView;

	get value(): number {
		return this.view.getInt32(0, this.endianness === "LittleEndian");
	}

	set value(next: number) {
		let last = this.value;
		this.view.setInt32(0, next, this.endianness === "LittleEndian");
		if (this.value !== next) {
			this.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(endianness: Endianness, buffer: ArrayBuffer = new ArrayBuffer(4), offset: number = 0) {
		assert.between(0, offset, buffer.byteLength - 4);
		this.endianness = endianness;
		this.view = new DataView(buffer, offset, 4);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
		return length;
	}
}

class ui08 {
	private endianness: Endianness;
	private view: DataView;

	get value(): number {
		return this.view.getUint8(0);
	}

	set value(next: number) {
		let last = this.value;
		this.view.setUint8(0, next);
		if (this.value !== next) {
			this.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(endianness: Endianness, buffer: ArrayBuffer = new ArrayBuffer(1), offset: number = 0) {
		assert.between(0, offset, buffer.byteLength - 1);
		this.endianness = endianness;
		this.view = new DataView(buffer, offset, 1);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
		return length;
	}
}

class ui16 {
	private endianness: Endianness;
	private view: DataView;

	get value(): number {
		return this.view.getUint16(0, this.endianness === "LittleEndian");
	}

	set value(next: number) {
		let last = this.value;
		this.view.setUint16(0, next, this.endianness === "LittleEndian");
		if (this.value !== next) {
			this.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(endianness: Endianness, buffer: ArrayBuffer = new ArrayBuffer(2), offset: number = 0) {
		assert.between(0, offset, buffer.byteLength - 2);
		this.endianness = endianness;
		this.view = new DataView(buffer, offset, 2);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
		return length;
	}
}

class ui24 {
	private endianness: Endianness;
	private view: DataView;

	get value(): number {
		let a = this.view.getUint8(0);
		let b = this.view.getUint8(1);
		let c = this.view.getUint8(2);
		if (this.endianness === "LittleEndian") {
			return (c << 16) | (b << 8) | (a << 0);
		} else {
			return (a << 16) | (b << 8) | (c << 0);
		}
	}

	set value(next: number) {
		let last = this.value;
		let a = (next >>> 0) & 0xFF;
		let b = (next >>> 8) & 0xFF;
		let c = (next >>> 16) & 0xFF;
		if (this.endianness === "LittleEndian") {
			this.view.setUint8(0, a);
			this.view.setUint8(1, b);
			this.view.setUint8(2, c);
		} else {
			this.view.setUint8(0, c);
			this.view.setUint8(1, b);
			this.view.setUint8(2, a);
		}
		if (this.value !== next) {
			this.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(endianness: Endianness, buffer: ArrayBuffer = new ArrayBuffer(3), offset: number = 0) {
		assert.between(0, offset, buffer.byteLength - 3);
		this.endianness = endianness;
		this.view = new DataView(buffer, offset, 3);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
		return length;
	}
}

class ui32 {
	private endianness: Endianness;
	private view: DataView;

	get value(): number {
		return this.view.getUint32(0, this.endianness === "LittleEndian");
	}

	set value(next: number) {
		let last = this.value;
		this.view.setUint32(0, next, this.endianness === "LittleEndian");
		if (this.value !== next) {
			this.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(endianness: Endianness, buffer: ArrayBuffer = new ArrayBuffer(4), offset: number = 0) {
		assert.between(0, offset, buffer.byteLength - 4);
		this.endianness = endianness;
		this.view = new DataView(buffer, offset, 4);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
		return length;
	}
}

class pi08 {
	private integer: ui08;
	private offset: number;
	private length: number;

	get value(): number {
		let a = 32 - (this.offset + this.length);
		let b = 32 - (this.length);
		return (this.integer.value << a) >>> b;
	}

	set value(next: number) {
		let last = this.integer.value;
		let a = this.offset;
		let b = 32 - (this.length);
		let c = 32 - (this.offset + this.length);
		let m = ((0xFFFFFFFF >> a) << b) >>> c;
		this.integer.value = ((this.integer.value & ~m) | ((next << a) & m)) >>> 0;
		if (this.value !== next) {
			this.integer.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(integer: ui08, offset: number, length: number) {
		assert.between(0, offset, 8 - 1);
		assert.between(1, length, 8 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
}

class pi16 {
	private integer: ui16;
	private offset: number;
	private length: number;

	get value(): number {
		let a = 32 - (this.offset + this.length);
		let b = 32 - (this.length);
		return (this.integer.value << a) >>> b;
	}

	set value(next: number) {
		let last = this.integer.value;
		let a = this.offset;
		let b = 32 - (this.length);
		let c = 32 - (this.offset + this.length);
		let m = ((0xFFFFFFFF >> a) << b) >>> c;
		this.integer.value = ((this.integer.value & ~m) | ((next << a) & m)) >>> 0;
		if (this.value !== next) {
			this.integer.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(integer: ui16, offset: number, length: number) {
		assert.between(0, offset, 16 - 1);
		assert.between(1, length, 16 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
}

class pi24 {
	private integer: ui24;
	private offset: number;
	private length: number;

	get value(): number {
		let a = 32 - (this.offset + this.length);
		let b = 32 - (this.length);
		return (this.integer.value << a) >>> b;
	}

	set value(next: number) {
		let last = this.integer.value;
		let a = this.offset;
		let b = 32 - (this.length);
		let c = 32 - (this.offset + this.length);
		let m = ((0xFFFFFFFF >> a) << b) >>> c;
		this.integer.value = ((this.integer.value & ~m) | ((next << a) & m)) >>> 0;
		if (this.value !== next) {
			this.integer.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(integer: ui24, offset: number, length: number) {
		assert.between(0, offset, 24 - 1);
		assert.between(1, length, 24 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
}

class pi32 {
	private integer: ui32;
	private offset: number;
	private length: number;

	get value(): number {
		let a = 32 - (this.offset + this.length);
		let b = 32 - (this.length);
		return (this.integer.value << a) >>> b;
	}

	set value(next: number) {
		let last = this.integer.value;
		let a = this.offset;
		let b = 32 - (this.length);
		let c = 32 - (this.offset + this.length);
		let m = ((0xFFFFFFFF >> a) << b) >>> c;
		this.integer.value = ((this.integer.value & ~m) | ((next << a) & m)) >>> 0;
		if (this.value !== next) {
			this.integer.value = last;
			throw `Unexpectedly encoded ${next} as ${this.value}!`;
		}
	}

	constructor(integer: ui32, offset: number, length: number) {
		assert.between(0, offset, 32 - 1);
		assert.between(1, length, 32 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
}

class text {
	private decoder: TextDecoder;
	private encoder: TextEncoder;
	private view: Uint8Array;

	get value(): string {
		return this.decoder.decode(this.view).replace(/([\u0000]*)$/, "");
	}

	set value(next: string) {
		let last = this.value;
		this.view.fill(0);
		this.encoder.encodeInto(next, this.view);
		if (this.value !== next) {
			this.value = last;
			throw `Unexpectedly encoded "${next}" as "${this.value}"!`;
		}
	}

	constructor(buffer: ArrayBuffer, offset?: number, length?: number) {
		offset = offset ?? 0;
		length = length ?? (buffer.byteLength - offset);
		assert.between(0, offset, buffer.byteLength);
		assert.between(0, length, buffer.byteLength - offset);
		this.decoder = new TextDecoder();
		this.encoder = new TextEncoder();
		this.view = new Uint8Array(buffer, offset, length);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
		return length;
	}
}

class ArchiveHeader {
	private buffer: ArrayBuffer;
	readonly version: ui32;
	readonly recordCount: ui32;

	constructor(endianness: Endianness) {
		this.buffer = new ArrayBuffer(8);
		this.version = new ui32(endianness, this.buffer, 0);
		this.recordCount = new ui32(endianness, this.buffer, 4);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.buffer);
		return length;
	}
}

class RecordHeader {
	private buffer: ArrayBuffer;
	readonly uncompressedSize: pi32;
	readonly isCompressed: pi32;

	constructor(endianness: Endianness) {
		this.buffer = new ArrayBuffer(4);
		let integer = new ui32(endianness, this.buffer, 0);
		this.uncompressedSize = new pi32(integer, 0, 24);
		this.isCompressed = new pi32(integer, 29, 1);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.buffer);
		return length;
	}
}

class Archive {
	private dataProvider: DataProvider;
	private endianness: Endianness;

	private async decompress(cursor: number, buffer: ArrayBuffer): Promise<void> {
		let array = new Uint8Array(buffer);
		let shift = 8;
		let bytesWritten = 0;
		let control = new Uint8Array(1);
		let byte = new Uint8Array(1);
		let history = new Uint8Array(1 << 12);
		let historyPosition = 0;
		function append(byte: number): void {
			history[historyPosition] = byte;
			historyPosition += 1;
			historyPosition %= (1 << 12);
			array[bytesWritten] = byte;
			bytesWritten += 1;
		}
		let data = new ui16(this.endianness);
		let dataOffset = new pi16(data, 0, 12);
		let dataLength = new pi16(data, 12, 4);
		while (bytesWritten < buffer.byteLength) {
			if (shift >= 8) {
				cursor += await this.dataProvider.read(cursor, control.buffer);
				shift = 0;
			}
			let bit = (control[0] >> shift) & 0x01;
			shift += 1;
			if (bit) {
				cursor += await this.dataProvider.read(cursor, byte.buffer);
				append(byte[0]);
			} else {
				cursor += await data.load(cursor, this.dataProvider);
				let offset = dataOffset.value;
				let length = dataLength.value + 3;
				for (let i = offset; i < offset + length; i++) {
					append(history[i % (1 << 12)]);
				}
			}
		}
	}

	constructor(dataProvider: DataProvider, endianness: Endianness) {
		this.dataProvider = dataProvider;
		this.endianness = endianness;
	}

	async getRecord(index: number): Promise<DataProvider> {
		let archiveHeader = new ArchiveHeader(this.endianness);
		let cursor = 0;
		cursor += await archiveHeader.load(cursor, this.dataProvider);
		assert.between(0, index, archiveHeader.recordCount.value - 1);
		cursor += index * 4;
		let offset = new ui32(this.endianness);
		cursor += await offset.load(cursor, this.dataProvider);
		let recordHeader = new RecordHeader(this.endianness);
		cursor = offset.value;
		cursor += await recordHeader.load(cursor, this.dataProvider);
		let buffer = new ArrayBuffer(recordHeader.uncompressedSize.value);
		if (recordHeader.isCompressed.value) {
			await this.decompress(cursor, buffer);
		} else {
			await this.dataProvider.read(cursor, buffer);
		}
		return new BufferDataProvider(buffer);
	}
}

class VocHeader {
	private buffer: ArrayBuffer;
	readonly identifier: text;
	readonly size: ui16;
	readonly version: ui16;
	readonly validity: ui16;

	constructor(endianness: Endianness) {
		this.buffer = new ArrayBuffer(26);
		this.identifier = new text(this.buffer, 0, 20);
		this.size = new ui16(endianness, this.buffer, 20);
		this.version = new ui16(endianness, this.buffer, 22);
		this.validity = new ui16(endianness, this.buffer, 24);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.buffer);
		return length;
	}
}

class VocSoundDataHeader {
	private buffer: ArrayBuffer;
	readonly frequency: ui08;
	readonly codec: ui08;

	constructor(endianness: Endianness) {
		this.buffer = new ArrayBuffer(2);
		this.frequency = new ui08(endianness, this.buffer, 0);
		this.codec = new ui08(endianness, this.buffer, 1);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.buffer);
		return length;
	}
}

enum VocCodecType {
	PCM_8BIT_UNSIGNED = 0,
	CREATIVE_ADPCM_4BIT_8BIT = 1,
	CREATIVE_ADPCM_3BIT_8BIT = 2,
	CREATIVE_ADPCM_2BIT_8BIT = 3,
	PCM_16BIT_SIGNED = 4,
	UNKNOWN = 5,
	ALAW = 6,
	ULAW = 7
};

enum VocBlockType {
	TERMINATOR = 0,
	SOUND_DATA = 1,
	CONTINUED_SOUND_DATA = 2,
	SILENCE = 3,
	MARKER = 4,
	TEXT = 5,
	REPEAT_START = 6,
	REPEAT_END = 7,
	EXTRA_INFO = 8,
	NEW_SOUND_DATA = 9
};

type VocBlock = {
	type: VocBlockType,
	buffer: ArrayBuffer
};

class VocFile {
	private endianness: Endianness;
	private header: VocHeader;
	private blocks: Array<VocBlock>;

	constructor(endianness: Endianness = "LittleEndian") {
		this.endianness = endianness;
		this.header = new VocHeader(endianness);
		this.blocks = new Array<VocBlock>();
	}

	async load(dataProvider: DataProvider): Promise<this> {
		this.blocks.splice(0, this.blocks.length);
		let cursor = 0;
		cursor += await this.header.load(cursor, dataProvider);
		assert.identical(this.header.identifier.value, "Creative Voice File\x1A");
		while (cursor < dataProvider.size()) {
			let type = new ui08(this.endianness);
			cursor += await type.load(cursor, dataProvider);
			if (type.value === VocBlockType.TERMINATOR) {
				this.blocks.push({
					type: type.value,
					buffer: new ArrayBuffer(0)
				});
				break;
			} else if (type.value === VocBlockType.REPEAT_END) {
				this.blocks.push({
					type: type.value,
					buffer: new ArrayBuffer(0)
				});
			} else {
				let size = new ui24(this.endianness);
				cursor += await size.load(cursor, dataProvider);
				let buffer = new ArrayBuffer(size.value);
				cursor += await dataProvider.read(cursor, buffer);
				this.blocks.push({
					type: type.value,
					buffer: buffer
				});
			}
		}
		return this;
	}

	async play(): Promise<void> {
		if (is.absent(audio_context)) {
			audio_context = new AudioContext();
		}
		if (this.blocks.length === 0) {
			return;
		}
		let block = this.blocks[0];
		if (block.type !== VocBlockType.SOUND_DATA) {
			throw `Unsupported voc block!`;
		}
		let dataProvider = new BufferDataProvider(block.buffer);
		let cursor = 0;
		let header = new VocSoundDataHeader(this.endianness);
		cursor += await header.load(cursor, dataProvider);
		if (![ VocCodecType.PCM_8BIT_UNSIGNED, VocCodecType.PCM_16BIT_SIGNED ].includes(header.codec.value)) {
			throw `Unsupported voc codec!`;
		}
		let channels = 1;
		let bytesPerChannel = header.codec.value === VocCodecType.PCM_8BIT_UNSIGNED ? 1 : 2;
		let bytesPerFrame = bytesPerChannel * channels;
		let samples = (dataProvider.size() - cursor) / bytesPerFrame;
		let sampleRate = Math.floor(1000000 / (256 - header.frequency.value));
		let buffer = audio_context.createBuffer(channels, samples, sampleRate);
		if (bytesPerChannel === 1) {
			let sample = new ui08(this.endianness);
			for (let s = 0; s < samples; s++) {
				for (let c = 0; c < channels; c++) {
					cursor += await sample.load(cursor, dataProvider);
					let value = ((sample.value + 0) / 255) * 2.0 - 1.0;
					buffer.getChannelData(c)[s] = value;
				}
			}
		} else if (bytesPerChannel === 2) {
			let sample = new si16(this.endianness);
			for (let s = 0; s < samples; s++) {
				for (let c = 0; c < channels; c++) {
					cursor += await sample.load(cursor, dataProvider);
					let value = ((sample.value + 32768) / 65535) * 2.0 - 1.0;
					buffer.getChannelData(c)[s] = value;
				}
			}
		} else {
			throw `Expected 8 or 16 bits per sample!`;
		}
		let source = audio_context.createBufferSource();
		source.buffer = buffer;
		source.connect(audio_context.destination);
		source.start();
	}
}

class RiffChunkHeader {
	private buffer: ArrayBuffer;
	readonly id: text;
	readonly size: ui32;

	constructor(endianness: Endianness) {
		this.buffer = new ArrayBuffer(8);
		this.id = new text(this.buffer, 0, 4);
		this.size = new ui32(endianness, this.buffer, 4);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.buffer);
		return length;
	}
}

class WavHeader {
	private buffer: ArrayBuffer;
	readonly audioFormat: ui16;
	readonly numChannels: ui16;
	readonly sampleRate: ui32;
	readonly byteRate: ui32;
	readonly blockAlign: ui16;
	readonly bitsPerSample: ui16;

	constructor(endianness: Endianness) {
		this.buffer = new ArrayBuffer(16);
		this.audioFormat = new ui16(endianness, this.buffer, 0);
		this.numChannels = new ui16(endianness, this.buffer, 2);
		this.sampleRate = new ui32(endianness, this.buffer, 4);
		this.byteRate = new ui32(endianness, this.buffer, 8);
		this.blockAlign = new ui16(endianness, this.buffer, 12);
		this.bitsPerSample = new ui16(endianness, this.buffer, 14);
	}

	async load(cursor: number, dataProvider: DataProvider): Promise<number> {
		let length = 0;
		length += await dataProvider.read(cursor + length, this.buffer);
		return length;
	}
}

enum XMIEventType {
	NOTE_OFF = 0x8,
	NOTE_ON = 0x9,
	KEY_PRESSURE = 0xA,
	CONTROLLER = 0xB,
	INSTRUMENT_CHANGE = 0xC,
	CHANNEL_PRESSURE = 0xD,
	PITCH_BEND = 0xE,
	SYSEX = 0xF
};

type XMIEvent = {
	index: number,
	type: XMIEventType,
	channel: number,
	time: number,
	data: Uint8Array
};

class XmiFile {
	readonly events: Array<XMIEvent>;

	constructor() {
		this.events = new Array<XMIEvent>();
	}

	private readVarlen(buffer: Uint8Array, cursor: { offset: number }): number {
		let value = 0;
		for (let i = 0; i < 4; i++) {
			let byte = buffer[cursor.offset++];
			value = (value << 7) | (byte & 0x7F);
			if (byte < 128) {
				break;
			}
		}
		return value;
	}

	private async loadEvents(array: Uint8Array): Promise<this> {
		this.events.splice(0, this.events.length);
		let cursor = {
			offset: 0
		};
		let timestamp = 0;
		while (cursor.offset < array.length) {
			let byte = array[cursor.offset++];
			let delay = 0;
			if (byte < 0x80) {
				cursor.offset -= 1;
				while (true) {
					byte = array[cursor.offset++];
					if (byte > 0x7F) {
						cursor.offset -= 1;
						break;
					}
					delay += byte;
					if (byte < 0x7F) {
						break;
					}
				}
				byte = array[cursor.offset++];
			}
			timestamp += delay;
			let event = (byte >> 4) & 0x0F;
			let channel = (byte >> 0) & 0x0F;
			if (event < 0x08) {
				throw `Invalid event!`;
			} else if (event === 0x8) {
				let a = array[cursor.offset++];
				let b = array[cursor.offset++];
				this.events.push({
					index: this.events.length,
					type: XMIEventType.NOTE_OFF,
					channel: channel,
					time: timestamp,
					data: Uint8Array.of(a, b)
				});
			} else if (event === 0x9) {
				let a = array[cursor.offset++];
				let b = array[cursor.offset++];
				let ticks = this.readVarlen(array, cursor);
				this.events.push({
					index: this.events.length,
					type: XMIEventType.NOTE_ON,
					channel: channel,
					time: timestamp,
					data: Uint8Array.of(a, b)
				});
				this.events.push({
					index: this.events.length,
					type: XMIEventType.NOTE_OFF,
					channel: channel,
					time: timestamp + ticks,
					data: Uint8Array.of(a, b)
				});
			} else if (event === 0xA) {
				let a = array[cursor.offset++];
				let b = array[cursor.offset++];
				this.events.push({
					index: this.events.length,
					type: XMIEventType.KEY_PRESSURE,
					channel: channel,
					time: timestamp,
					data: Uint8Array.of(a, b)
				});
			} else if (event === 0xB) {
				let a = array[cursor.offset++];
				let b = array[cursor.offset++];
				this.events.push({
					index: this.events.length,
					type: XMIEventType.CONTROLLER,
					channel: channel,
					time: timestamp,
					data: Uint8Array.of(a, b)
				});
			} else if (event === 0xC) {
				let a = array[cursor.offset++];
				this.events.push({
					index: this.events.length,
					type: XMIEventType.INSTRUMENT_CHANGE,
					channel: channel,
					time: timestamp,
					data: Uint8Array.of(a)
				});
			} else if (event === 0xD) {
				let a = array[cursor.offset++];
				this.events.push({
					index: this.events.length,
					type: XMIEventType.CHANNEL_PRESSURE,
					channel: channel,
					time: timestamp,
					data: Uint8Array.of(a)
				});
			} else if (event === 0xE) {
				let a = array[cursor.offset++];
				let b = array[cursor.offset++];
				this.events.push({
					index: this.events.length,
					type: XMIEventType.PITCH_BEND,
					channel: channel,
					time: timestamp,
					data: Uint8Array.of(a, b)
				});
			} else if (event === 0xF) {
				if (channel < 0xF) {
					let size = this.readVarlen(array, cursor);
					let data = array.slice(cursor.offset, cursor.offset + size); cursor.offset += size;
					this.events.push({
						index: this.events.length,
						type: XMIEventType.SYSEX,
						channel: channel,
						time: timestamp,
						data: data
					});
				} else {
					let type = array[cursor.offset++];
					let size = this.readVarlen(array, cursor);
					let data = array.slice(cursor.offset, cursor.offset + size); cursor.offset += size;
					if (type !== 0x51 && type !== 0x58) {
						this.events.push({
							index: this.events.length,
							type: XMIEventType.SYSEX,
							channel: channel,
							time: timestamp,
							data: Uint8Array.of(type, ...data)
						});
					}
					if (type === 0x2F) {
						break;
					}
				}
			}
		}
		this.events.sort((one, two) => {
			if (one.time < two.time) {
				return -1;
			}
			if (one.time > two.time) {
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
		let time = 0;
		for (let event of this.events) {
			let delay = event.time - time;
			time = event.time;
			event.time = delay;
		}
		return this;
	}

	async load(dataProvider: DataProvider): Promise<this> {
		let cursor = 0;
		let form = new RiffChunkHeader("BigEndian");
		cursor += await form.load(cursor, dataProvider);
		assert.identical(form.id.value, "FORM");
		{
			let xdir = new text(new ArrayBuffer(4));
			cursor += await xdir.load(cursor, dataProvider);
			assert.identical(xdir.value, "XDIR");
			let info = new RiffChunkHeader("BigEndian");
			cursor += await info.load(cursor, dataProvider);
			assert.identical(info.id.value, "INFO");
			cursor += info.size.value;
			cursor += info.size.value % 2;
		}
		cursor += form.size.value % 2;
		let cat = new RiffChunkHeader("BigEndian");
		cursor += await cat.load(cursor, dataProvider);
		assert.identical(cat.id.value, "CAT ");
		{
			let xmid = new text(new ArrayBuffer(4));
			cursor += await xmid.load(cursor, dataProvider);
			assert.identical(xmid.value, "XMID");
			let form = new RiffChunkHeader("BigEndian");
			cursor += await form.load(cursor, dataProvider);
			assert.identical(form.id.value, "FORM");
			{
				let xmid = new text(new ArrayBuffer(4));
				cursor += await xmid.load(cursor, dataProvider);
				assert.identical(xmid.value, "XMID");
				let timb = new RiffChunkHeader("BigEndian");
				cursor += await timb.load(cursor, dataProvider);
				assert.identical(timb.id.value, "TIMB");
				cursor += timb.size.value;
				cursor += timb.size.value % 2;
				let evnt = new RiffChunkHeader("BigEndian");
				cursor += await evnt.load(cursor, dataProvider);
				assert.identical(evnt.id.value, "EVNT");
				let array = new Uint8Array(evnt.size.value);
				cursor += await dataProvider.read(cursor, array.buffer);
				cursor += evnt.size.value % 2;
				await this.loadEvents(array);
			}
			cursor += form.size.value % 2;
		}
		cursor += cat.size.value % 2;
		return this;
	}
}

class WavFile {
	private endianness: Endianness;
	private header: WavHeader;
	private buffer: ArrayBuffer;

	constructor(endianness: Endianness = "LittleEndian") {
		this.endianness = endianness;
		this.header = new WavHeader(endianness);
		this.buffer = new ArrayBuffer(0);
	}

	async load(dataProvider: DataProvider): Promise<this> {
		let cursor = 0;
		let chunk = new RiffChunkHeader(this.endianness);
		cursor += await chunk.load(cursor, dataProvider);
		assert.identical(chunk.id.value, "RIFF");
		let buffer = new ArrayBuffer(chunk.size.value);
		await dataProvider.read(cursor, buffer);
		{
			let dataProvider = new BufferDataProvider(buffer);
			let cursor = 0;
			let id = new text(new ArrayBuffer(4));
			cursor += await id.load(cursor, dataProvider);
			assert.identical(id.value, "WAVE");
			let format = new RiffChunkHeader(this.endianness);
			cursor += await format.load(cursor, dataProvider);
			assert.identical(format.id.value, "fmt ");
			cursor += await this.header.load(cursor, dataProvider);
			cursor += format.size.value % 2;
			let data = new RiffChunkHeader(this.endianness);
			cursor += await data.load(cursor, dataProvider);
			assert.identical(data.id.value, "data");
			this.buffer = new ArrayBuffer(data.size.value);
			length += await dataProvider.read(cursor, this.buffer);
			cursor += format.size.value % 2;
		}
		return this;
	}

	async play(): Promise<void> {
		let channels = this.header.numChannels.value;
		let samples = this.buffer.byteLength / this.header.blockAlign.value;
		let sampleRate = this.header.sampleRate.value;
		let context = new AudioContext();
		let buffer = context.createBuffer(channels, samples, sampleRate);
		let dataProvider = new BufferDataProvider(this.buffer);
		let cursor = 0;
		if (this.header.bitsPerSample.value === 8) {
			let sample = new ui08(this.endianness);
			for (let s = 0; s < samples; s++) {
				for (let c = 0; c < channels; c++) {
					cursor += await sample.load(cursor, dataProvider);
					let value = ((sample.value + 0) / 255) * 2.0 - 1.0;
					buffer.getChannelData(c)[s] = value;
				}
			}
		} else if (this.header.bitsPerSample.value === 16) {
			let sample = new si16(this.endianness);
			for (let s = 0; s < samples; s++) {
				for (let c = 0; c < channels; c++) {
					cursor += await sample.load(cursor, dataProvider);
					let value = ((sample.value + 32768) / 65535) * 2.0 - 1.0;
					buffer.getChannelData(c)[s] = value;
				}
			}
		} else {
			throw `Expected 8 or 16 bits per sample!`;
		}
		let source = context.createBufferSource();
		source.buffer = buffer;
		source.connect(context.destination);
		source.start();
	}
}

namespace wc1 {
	export class MicrotileHeader {
		private buffer: ArrayBuffer;
		readonly inverted: pi16;
		readonly mirrored: pi16;
		readonly index: pi16;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(2);
			let integer = new ui16(endianness, this.buffer);
			this.inverted = new pi16(integer, 0, 1);
			this.mirrored = new pi16(integer, 1, 1);
			this.index = new pi16(integer, 5, 11);
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			length += await dataProvider.read(cursor + length, this.buffer);
			return length;
		}
	};

	export class TileHeader {
		readonly layout: [
			[MicrotileHeader, MicrotileHeader],
			[MicrotileHeader, MicrotileHeader]
		];

		constructor(endianness: Endianness) {
			let a = new MicrotileHeader(endianness);
			let b = new MicrotileHeader(endianness);
			let c = new MicrotileHeader(endianness);
			let d = new MicrotileHeader(endianness);
			this.layout = [
				[a, b],
				[c, d]
			];
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			for (let y = 0; y < this.layout.length; y++) {
				for (let x = 0; x < this.layout[y].length; x++) {
					length += await this.layout[y][x].load(cursor + length, dataProvider);
				}
			}
			return length;
		}
	};

	export class UnitScriptHeader {
		private buffer: ArrayBuffer;
		readonly spawnOffset: ui16;
		readonly deathOffset: ui16;
		readonly idleOffset: ui16;
		readonly movementOffset: ui16;
		readonly actionOffset: ui16;
		readonly trainOffset: ui16;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(12);
			this.spawnOffset = new ui16(endianness, this.buffer, 0);
			this.deathOffset = new ui16(endianness, this.buffer, 2);
			this.idleOffset = new ui16(endianness, this.buffer, 4);
			this.movementOffset = new ui16(endianness, this.buffer, 6);
			this.actionOffset = new ui16(endianness, this.buffer, 8);
			this.trainOffset = new ui16(endianness, this.buffer, 10);
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			length += await dataProvider.read(cursor + length, this.buffer);
			return length;
		}
	};

	export class ParticleScriptHeader {
		private buffer: ArrayBuffer;
		readonly spawnOffset: ui16;
		readonly movementOffset: ui16;
		readonly hitOffset: ui16;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(6);
			this.spawnOffset = new ui16(endianness, this.buffer, 0);
			this.movementOffset = new ui16(endianness, this.buffer, 2);
			this.hitOffset = new ui16(endianness, this.buffer, 4);
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			length += await dataProvider.read(cursor + length, this.buffer);
			return length;
		}
	};

	export class ScriptHeader {
		private buffer: ArrayBuffer;
		readonly headerOffset: ui16;
		readonly unitScriptCount: ui16;
		readonly particleScriptCount: ui16;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(6);
			this.headerOffset = new ui16(endianness, this.buffer, 0);
			this.unitScriptCount = new ui16(endianness, this.buffer, 2);
			this.particleScriptCount = new ui16(endianness, this.buffer, 4);
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			length += await dataProvider.read(cursor + length, this.buffer);
			return length;
		}
	};

	export class Script {
		private endianness: Endianness;
		private header: ScriptHeader;
		private unitScriptHeaders: Array<UnitScriptHeader>;
		private particleScriptHeaders: Array<ParticleScriptHeader>;
		private buffer: ArrayBuffer;

		constructor(endianness: Endianness) {
			this.endianness = endianness;
			this.header = new ScriptHeader(endianness);
			this.unitScriptHeaders = new Array<UnitScriptHeader>();
			this.particleScriptHeaders = new Array<ParticleScriptHeader>();
			this.buffer = new ArrayBuffer(0);
		}

		async load(dataProvider: DataProvider): Promise<this> {
			this.unitScriptHeaders.splice(0, this.unitScriptHeaders.length);
			this.particleScriptHeaders.splice(0, this.particleScriptHeaders.length);
			let cursor = 0;
			let offsets = new Array<number>();
			let offset = new ui16(this.endianness);
			while (true) {
				cursor += await offset.load(cursor, dataProvider);
				if (cursor - 2 === offset.value) {
					cursor -= 2;
					break;
				}
				offsets.push(offset.value);
			}
			cursor += await this.header.load(cursor, dataProvider);
			for (let i = 0; i < this.header.unitScriptCount.value; i++) {
				let offset = offsets[i];
				let unitScriptHeader = new UnitScriptHeader(this.endianness);
				await unitScriptHeader.load(offset, dataProvider);
				this.unitScriptHeaders.push(unitScriptHeader);
			}
			for (let i = 0; i < this.header.particleScriptCount.value; i++) {
				let offset = offsets[this.header.unitScriptCount.value + i];
				let particleScriptHeader = new ParticleScriptHeader(this.endianness);
				await particleScriptHeader.load(offset, dataProvider);
				this.particleScriptHeaders.push(particleScriptHeader);
			}
			this.buffer = new ArrayBuffer(dataProvider.size());
			await dataProvider.read(0, this.buffer);
			return this;
		}

		getUnitScript(index: number): { header: UnitScriptHeader, buffer: ArrayBuffer } {
			assert.between(0, index, this.unitScriptHeaders.length - 1);
			let header = this.unitScriptHeaders[index];
			let buffer = this.buffer;
			return {
				header,
				buffer
			};
		}

		getParticle(index: number): { header: ParticleScriptHeader, buffer: ArrayBuffer } {
			assert.between(0, index, this.particleScriptHeaders.length - 1);
			let header = this.particleScriptHeaders[index];
			let buffer = this.buffer;
			return {
				header,
				buffer
			};
		}
	}

	export class SpriteFrameHeader {
		private buffer: ArrayBuffer;
		readonly x: ui08;
		readonly y: ui08;
		readonly w: ui08;
		readonly h: ui08;
		readonly offset: ui32;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(8);
			this.x = new ui08(endianness, this.buffer, 0);
			this.y = new ui08(endianness, this.buffer, 1);
			this.w = new ui08(endianness, this.buffer, 2);
			this.h = new ui08(endianness, this.buffer, 3);
			this.offset = new ui32(endianness, this.buffer, 4);
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			length += await dataProvider.read(cursor + length, this.buffer);
			return length;
		}
	};

	export class SpriteFrame {
		private header: SpriteFrameHeader;
		private buffer: ArrayBuffer;

		constructor(endianness: Endianness) {
			this.header = new SpriteFrameHeader(endianness);
			this.buffer = new ArrayBuffer(0);
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			length += await this.header.load(cursor + length, dataProvider);
			this.buffer = new ArrayBuffer(this.header.w.value * this.header.h.value);
			await dataProvider.read(this.header.offset.value, this.buffer);
			return length;
		}

		makeTexture(context: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
			let x = this.header.x.value;
			let y = this.header.y.value;
			let w = this.header.w.value;
			let h = this.header.h.value;
			let texture = context.createTexture();
			if (is.absent(texture)) {
				throw `Expected a texture!`;
			}
			context.activeTexture(context.TEXTURE0);
			context.bindTexture(context.TEXTURE_2D, texture);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
			context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, width, height, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
			context.texSubImage2D(context.TEXTURE_2D, 0, x, y, w, h, context.LUMINANCE, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
			return texture;
		}
	};

	export class SpriteHeader {
		private buffer: ArrayBuffer;
		readonly spriteCount: ui16;
		readonly w: ui08;
		readonly h: ui08;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(4);
			this.spriteCount = new ui16(endianness, this.buffer, 0);
			this.w = new ui08(endianness, this.buffer, 2);
			this.h = new ui08(endianness, this.buffer, 3);
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			length += await dataProvider.read(cursor + length, this.buffer);
			return length;
		}
	};

	export class Sprite {
		private endianness: Endianness;
		private header: SpriteHeader;
		private frames: Array<SpriteFrame>;

		constructor(endianness: Endianness) {
			this.endianness = endianness;
			this.header = new SpriteHeader(endianness);
			this.frames = new Array<SpriteFrame>();
		}

		async load(dataProvider: DataProvider): Promise<this> {
			this.frames.splice(0, this.frames.length);
			let cursor = 0;
			cursor += await this.header.load(cursor, dataProvider);
			for (let i = 0; i < this.header.spriteCount.value; i++) {
				let frame = new SpriteFrame(this.endianness);
				cursor += await frame.load(cursor, dataProvider);
				this.frames.push(frame);
			}
			return this;
		}

		makeTextures(context: WebGL2RenderingContext): Array<WebGLTexture> {
			let w = this.header.w.value;
			let h = this.header.h.value;
			let textures = new Array<WebGLTexture>();
			for (let frame of this.frames) {
				let texture = frame.makeTexture(context, w, h);
				textures.push(texture);
			}
			return textures;
		}
	};

	export class Map {
		private buffer: ArrayBuffer;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(0);
		}

		async load(dataProvider: DataProvider): Promise<this> {
			let cursor = 0;
			this.buffer = new ArrayBuffer(64 * 64 * 2);
			cursor += await dataProvider.read(cursor, this.buffer);
			return this;
		}
	};

	export class CursorHeader {
		private buffer: ArrayBuffer;
		readonly x: ui16;
		readonly y: ui16;
		readonly w: ui16;
		readonly h: ui16;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(8);
			this.x = new ui16(endianness, this.buffer, 0);
			this.y = new ui16(endianness, this.buffer, 2);
			this.w = new ui16(endianness, this.buffer, 4);
			this.h = new ui16(endianness, this.buffer, 6);
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			length += await dataProvider.read(cursor + length, this.buffer);
			return length;
		}
	};

	export class Cursor {
		private header: CursorHeader;
		private buffer: ArrayBuffer;

		constructor(endianness: Endianness) {
			this.header = new CursorHeader(endianness);
			this.buffer = new ArrayBuffer(0);
		}

		async load(dataProvider: DataProvider): Promise<this> {
			let cursor = 0;
			cursor += await this.header.load(cursor, dataProvider);
			this.buffer = new ArrayBuffer(this.header.w.value * this.header.h.value);
			cursor += await dataProvider.read(cursor, this.buffer);
			return this;
		}

		makeTexture(context: WebGL2RenderingContext): WebGLTexture {
			let w = this.header.w.value;
			let h = this.header.h.value;
			let texture = context.createTexture();
			if (is.absent(texture)) {
				throw `Expected a texture!`;
			}
			context.activeTexture(context.TEXTURE0);
			context.bindTexture(context.TEXTURE_2D, texture);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
			context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, w, h, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
			context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, w, h, context.LUMINANCE, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
			return texture;
		}
	};

	export class Palette {
		private buffer: ArrayBuffer;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(0);
		}

		async load(dataProvider: DataProvider): Promise<this> {
			assert.between(0, dataProvider.size() % 3, 0);
			let cursor = 0;
			this.buffer = new ArrayBuffer(dataProvider.size());
			cursor += await dataProvider.read(cursor, this.buffer);
			return this;
		}

		makeTexture(context: WebGL2RenderingContext): WebGLTexture {
			let w = this.buffer.byteLength / 3;
			let h = 1;
			let texture = context.createTexture();
			if (is.absent(texture)) {
				throw `Expected a texture!`;
			}
			context.activeTexture(context.TEXTURE0);
			context.bindTexture(context.TEXTURE_2D, texture);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
			context.texImage2D(context.TEXTURE_2D, 0, context.RGB, 256, 1, 0, context.RGB, context.UNSIGNED_BYTE, null);
			context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, w, h, context.RGB, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
			return texture;
		}

		updateTexture(texture: WebGLTexture, start: number): this {
			let w = this.buffer.byteLength / 3;
			let h = 1;
			context.activeTexture(context.TEXTURE0);
			context.bindTexture(context.TEXTURE_2D, texture);
			context.texSubImage2D(context.TEXTURE_2D, 0, start, 0, w, h, context.RGB, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
			return this;
		}
	};

	export class BitmapHeader {
		private buffer: ArrayBuffer;
		readonly w: ui16;
		readonly h: ui16;

		constructor(endianness: Endianness) {
			this.buffer = new ArrayBuffer(4);
			this.w = new ui16(endianness, this.buffer, 0);
			this.h = new ui16(endianness, this.buffer, 2);
		}

		async load(cursor: number, dataProvider: DataProvider): Promise<number> {
			let length = 0;
			length += await dataProvider.read(cursor + length, this.buffer);
			return length;
		}
	};

	export class Bitmap {
		private header: BitmapHeader;
		private buffer: ArrayBuffer;

		constructor(endianness: Endianness) {
			this.header = new BitmapHeader(endianness);
			this.buffer = new ArrayBuffer(0);
		}

		async load(dataProvider: DataProvider): Promise<this> {
			let cursor = 0;
			cursor += await this.header.load(cursor, dataProvider);
			this.buffer = new ArrayBuffer(this.header.w.value * this.header.h.value);
			cursor += await dataProvider.read(cursor, this.buffer);
			return this;
		}

		makeTexture(context: WebGL2RenderingContext): WebGLTexture {
			let w = this.header.w.value;
			let h = this.header.h.value;
			let texture = context.createTexture();
			if (is.absent(texture)) {
				throw `Expected a texture!`;
			}
			context.activeTexture(context.TEXTURE0);
			context.bindTexture(context.TEXTURE_2D, texture);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
			context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
			context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, w, h, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
			context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, w, h, context.LUMINANCE, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
			return texture;
		}
	};
}

// ============================================================================

let audio_context: AudioContext | undefined;
let synth: WavetableSynth | undefined;
let canvas = document.createElement("canvas");
let context = canvas.getContext("webgl2", { antialias: false }) as WebGL2RenderingContext;
if (is.absent(context)) {
	throw `Expected a context!`;
}
context.clearColor(0.0, 0.0, 0.0, 1.0);
context.pixelStorei(context.UNPACK_ALIGNMENT, 1);
let program = context.createProgram();
if (is.absent(program)) {
	throw `Expected a program!`;
}
let vertexShader = context.createShader(context.VERTEX_SHADER);
if (is.absent(vertexShader)) {
	throw `Expected a shader!`;
}
context.shaderSource(vertexShader, `#version 300 es
	uniform ivec2 viewport;
	uniform bvec2 scaling;
	uniform vec2 anchor;
	uniform vec2 quad;
	uniform sampler2D paletteSampler;
	uniform sampler2D textureSampler;
	in vec2 vertexPosition;
	in vec2 vertexTexture;
	out vec2 textureCoordinates;
	void main() {
		float zoom = ${ZOOM}.0;
		textureCoordinates = vertexTexture;
		if (scaling.x) {
			textureCoordinates.x = 1.0 - textureCoordinates.x;
		}
		if (scaling.y) {
			textureCoordinates.y = 1.0 - textureCoordinates.y;
		}
		ivec2 texSize = textureSize(textureSampler, 0);
		vec2 vvpos = vec2(quad) + (vertexPosition - anchor) * vec2(texSize);
		mat3x3 transform = mat3x3(vec3(2.0 / float(viewport.x), 0.0, 0.0), vec3(0.0, -2.0 / float(viewport.y), 0.0), vec3(-1.0, 1.0, 1.0));
		gl_Position = vec4((transform * vec3(vvpos * zoom, 1.0)).xy, 0.0, 1.0);
	}
`);
context.compileShader(vertexShader);
if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) {
	let info = context.getShaderInfoLog(vertexShader);
	throw `${info}`;
}
let fragmentShader = context.createShader(context.FRAGMENT_SHADER);
if (is.absent(fragmentShader)) {
	throw `Expected a shader!`;
}
context.shaderSource(fragmentShader, `#version 300 es
	precision highp float;
	uniform int textureIndex;
	uniform int transparentIndex;
	uniform sampler2D colorCycleSampler;
	uniform sampler2D paletteSampler;
	uniform sampler2D textureSampler;
	in vec2 textureCoordinates;
	out vec4 fragmentColor;
	void main() {
		float index = texture(textureSampler, textureCoordinates).x;
		int indexInt = int(index * float(textureSize(textureSampler, 0).x));
		if (indexInt == transparentIndex) {
			discard;
		}
		float shiftedIndex = texture(colorCycleSampler, vec2(index, 0.0)).x;
		vec3 color = texture(paletteSampler, vec2(shiftedIndex, 0.0)).rgb * 4.0;
		fragmentColor = vec4(color, 1.0);
	}
`);
context.compileShader(fragmentShader);
if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) {
	let info = context.getShaderInfoLog(fragmentShader);
	throw `${info}`;
}
context.attachShader(program, vertexShader);
context.attachShader(program, fragmentShader);
context.linkProgram(program);
if (!context.getProgramParameter(program, context.LINK_STATUS)) {
	let info = context.getProgramInfoLog(program);
	throw `${info}`;
}
context.useProgram(program);
let viewportLocation = context.getUniformLocation(program, "viewport");
let quadLocation = context.getUniformLocation(program, "quad");
let scalingLocation = context.getUniformLocation(program, "scaling");
let anchorLocation = context.getUniformLocation(program, "anchor");
let textureIndexLocation = context.getUniformLocation(program, "textureIndex");
context.uniform1i(textureIndexLocation, 0); // not used currently
let transparentIndexLocation = context.getUniformLocation(program, "transparentIndex");
context.uniform1i(transparentIndexLocation, 0);
let textureSamplerocation = context.getUniformLocation(program, "textureSampler");
context.uniform1i(textureSamplerocation, 0);
let paletteSamplerLocation = context.getUniformLocation(program, "paletteSampler");
context.uniform1i(paletteSamplerLocation, 1);
let colorCycleSamplerLocation = context.getUniformLocation(program, "colorCycleSampler");
context.uniform1i(colorCycleSamplerLocation, 2);
let vertexPosition = context.getAttribLocation(program, "vertexPosition");
context.enableVertexAttribArray(vertexPosition);
let vertexTexture = context.getAttribLocation(program, "vertexTexture");
context.enableVertexAttribArray(vertexTexture);
let buffer = context.createBuffer();
if (is.absent(buffer)) {
	throw `Expected a buffer!`;
}
context.bindBuffer(context.ARRAY_BUFFER, buffer);
context.bufferData(context.ARRAY_BUFFER, new Float32Array([
	0.0, 0.0,		0.0, 0.0,
	0.0, 1.0,		0.0, 1.0,
	1.0, 1.0,		1.0, 1.0,
	1.0, 0.0,		1.0, 0.0
]), context.STATIC_DRAW);
context.vertexAttribPointer(vertexPosition, 2, context.FLOAT, false, 16, 0);
context.vertexAttribPointer(vertexTexture, 2, context.FLOAT, false, 16, 8);
canvas.setAttribute("style", "height: 100%; width: 100%;");
canvas.addEventListener("dragenter", async (event) => {
	event.stopPropagation();
	event.preventDefault();
});
canvas.addEventListener("dragover", async (event) => {
	event.stopPropagation();
	event.preventDefault();
});
let endianness: Endianness = "LittleEndian";
let archive: Archive | undefined;
let xmi: XmiFile | undefined;

async function load(dataProvider: DataProvider): Promise<void> {
	if (is.absent(audio_context)) {
		audio_context = new AudioContext();
	}
	archive = new Archive(dataProvider, endianness);
	tileset = await loadTileset(context, archive, endianness, 189, 190, 191);
	//tileset = await loadTileset(context, archive, endianness, 192, 193, 194);
	//tileset = await loadTileset(context, archive, endianness, 195, 196, 197);
	map = await loadMap(archive, endianness, 47);
	try {
		await loadUnitScript(archive);
	} catch (error) {
		try {
			await loadParticleScript(archive);
		} catch (error) {}
	}
	xmi = await new XmiFile().load(await archive.getRecord(0));
	xmi_time_base = 68;
	playMusic();
	//setEntityColor("red");
}

async function loadTileset(context: WebGL2RenderingContext, archive: Archive, endianness: Endianness, tilesetIndex: number, tilesIndex: number, paletteIndex: number): Promise<Array<WebGLTexture>> {
	let base_palette = await new wc1.Palette(endianness).load(await archive.getRecord(paletteIndex));
	let paletteTexture = await base_palette.makeTexture(context);
	let palette = await new wc1.Palette(endianness).load(await archive.getRecord(210));
	palette.updateTexture(paletteTexture, 128);
	context.activeTexture(context.TEXTURE1);
	context.bindTexture(context.TEXTURE_2D, paletteTexture);
	let tiles = await archive.getRecord(tilesIndex);
	assert.assert((tiles.size() % (8 * 8)) === 0);
	let headers = await archive.getRecord(tilesetIndex);
	let cursor = 0;
	assert.assert((tiles.size() % 8) === 0);
	let textures = new Array<WebGLTexture>();
	let array = new Uint8Array(8 * 8);
	while (cursor < headers.size()) {
		let w = 2 * 8;
		let h = 2 * 8;
		let texture = context.createTexture();
		if (is.absent(texture)) {
			throw `Expected a texture!`;
		}
		context.activeTexture(context.TEXTURE0);
		context.bindTexture(context.TEXTURE_2D, texture);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
		context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, w, h, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
		let tileHeader = new wc1.TileHeader(endianness);
		cursor += await tileHeader.load(cursor, headers);
		for (let y = 0; y < tileHeader.layout.length; y++) {
			for (let x = 0; x < tileHeader.layout[y].length; x++) {
				let header = tileHeader.layout[y][x];
				await tiles.read(header.index.value * 8 * 8, array.buffer);
				if (header.inverted.value) {
					for (let y = 0; y < 8 / 2; y++) {
						for (let x = 0; x < 8; x++) {
							let indexOne = (y * 8) + x;
							let indexTwo = ((8 - y - 1) * 8) + x;
							let valueOne = array[indexOne];
							let valueTwo = array[indexTwo];
							array[indexOne] = valueTwo;
							array[indexTwo] = valueOne;
						}
					}
				}
				if (header.mirrored.value) {
					for (let y = 0; y < 8; y++) {
						for (let x = 0; x < 8 / 2; x++) {
							let indexOne = (y * 8) + x;
							let indexTwo = (y * 8) + 8 - x - 1;
							let valueOne = array[indexOne];
							let valueTwo = array[indexTwo];
							array[indexOne] = valueTwo;
							array[indexTwo] = valueOne;
						}
					}
				}
				context.texSubImage2D(context.TEXTURE_2D, 0, x * 8, y * 8, 8, 8, context.LUMINANCE, context.UNSIGNED_BYTE, array);
			}
		}
		textures.push(texture);
	}
	return textures;
}
async function loadMap(archive: Archive, endianness: Endianness, mapIndex: number): Promise<Array<number>> {
	let indices = new Array<number>();
	let integer = new ui16(endianness);
	let dataProider = await archive.getRecord(mapIndex);
	assert.assert(dataProider.size() === 64 * 64 * 2);
	let cursor = 0;
	for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
			cursor += await integer.load(cursor, dataProider);
			indices.push(integer.value);
		}
	}
	return indices;
}
type Entity = {
	name: string,
	script: number,
	type?: "effect",
	sprite: number,
	sfx: number[]
};
let selectedEntities = new Array<Entity>();
let entities: Array<Entity> = [
	{ name: "Footman", script: 0, sprite: 279, sfx: [487, 488, 489] },
	{ name: "Grunt", script: 1, sprite: 280, sfx: [487, 488, 489] },
	{ name: "Peasant", script: 2, sprite: 281, sfx: [477, 478, 479] },
	{ name: "Peon", script: 3, sprite: 282, sfx: [477, 478, 479] },
	{ name: "Catapult", script: 4, sprite: 283, sfx: [476] },
	{ name: "Catapult", script: 5, sprite: 284, sfx: [476] },
	{ name: "Knight", script: 6, sprite: 285, sfx: [487, 488, 489] },
	{ name: "Raider", script: 7, sprite: 286, sfx: [487, 488, 489] },
	{ name: "Archer", script: 8, sprite: 287, sfx: [493] },
	{ name: "Spearman", script: 9, sprite: 288, sfx: [493] },
	{ name: "Conjurer", script: 10, sprite: 289, sfx: [] },
	{ name: "Warlock", script: 11, sprite: 290, sfx: [] },
	{ name: "Cleric", script: 12, sprite: 291, sfx: [] },
	{ name: "Necrolyte", script: 13, sprite: 292, sfx: [] },
	{ name: "Medivh", script: 14, sprite: 293, sfx: [] },
	{ name: "Sir Lothar", script: 15, sprite: 294, sfx: [] },
	{ name: "Grunt (copy)", script: 16, sprite: 280, sfx: [] },
	{ name: "Griselda", script: 17, sprite: 296, sfx: [] },
	{ name: "Garona", script: 18, sprite: 296, sfx: [] },
	{ name: "Ogre", script: 19, sprite: 297, sfx: [] },
	{ name: "Ogre (copy)", script: 20, sprite: 297, sfx: [] },
	{ name: "Spider", script: 21, sprite: 298, sfx: [] },
	{ name: "Slime", script: 22, sprite: 299, sfx: [] },
	{ name: "Fire Elemental", script: 23, sprite: 300, sfx: [] },
	{ name: "Scorpion", script: 24, sprite: 301, sfx: [] },
	{ name: "Brigand", script: 25, sprite: 302, sfx: [] },
	{ name: "Skeleton", script: 26, sprite: 303, sfx: [] },
	{ name: "Skeleton", script: 27, sprite: 304, sfx: [] },
	{ name: "Daemon", script: 28, sprite: 305, sfx: [] },
	{ name: "Ogre (copy 2)", script: 29, sprite: 297, sfx: [] },
	{ name: "Ogre (copy 3)", script: 30, sprite: 297, sfx: [] },
	{ name: "Water Elemental", script: 31, sprite: 306, sfx: [] },
	{ name: "Farm", script: 32, sprite: 307, sfx: [] },
	{ name: "Farm", script: 33, sprite: 308, sfx: [] },
	{ name: "Barracks", script: 34, sprite: 309, sfx: [] },
	{ name: "Barracks", script: 35, sprite: 310, sfx: [] },
	{ name: "Church", script: 36, sprite: 311, sfx: [] },
	{ name: "Temple", script: 37, sprite: 312, sfx: [] },
	{ name: "Tower", script: 38, sprite: 313, sfx: [] },
	{ name: "Tower", script: 39, sprite: 314, sfx: [] },
	{ name: "Town Hall", script: 40, sprite: 315, sfx: [] },
	{ name: "Town Hall", script: 41, sprite: 316, sfx: [] },
	{ name: "Mill", script: 42, sprite: 317, sfx: [] },
	{ name: "Mill", script: 43, sprite: 318, sfx: [] },
	{ name: "Stables", script: 44, sprite: 319, sfx: [] },
	{ name: "Kennel", script: 45, sprite: 320, sfx: [] },
	{ name: "Blacksmith", script: 46, sprite: 321, sfx: [] },
	{ name: "Blacksmith", script: 47, sprite: 322, sfx: [] },
	{ name: "Stormwind Keep", script: 48, sprite: 323, sfx: [] },
	{ name: "Black Rock Spire", script: 49, sprite: 324, sfx: [] },
	{ name: "Gold Mine", script: 50, sprite: 325, sfx: [] },
	{ name: "Blob", script: 0, type: "effect", sprite: 347, sfx: [] },
	{ name: "Fire Ball", script: 1, type: "effect", sprite: 348, sfx: [] },
	{ name: "Spear", script: 2, type: "effect", sprite: 349, sfx: [] },
	{ name: "Poison Cloud", script: 3, type: "effect", sprite: 350, sfx: [] },
	{ name: "Catapult Projectile", script: 4, type: "effect", sprite: 351, sfx: [] },
	{ name: "Burning Small", script: 5, type: "effect", sprite: 352, sfx: [] },
	{ name: "Burning Medium", script: 6, type: "effect", sprite: 353, sfx: [] },
	{ name: "Explosion", script: 7, type: "effect", sprite: 354, sfx: [] },
	{ name: "Sparkle", script: 8, type: "effect", sprite: 355, sfx: [] },
	{ name: "Building Collapse", script: 9, type: "effect", sprite: 356, sfx: [] },
	{ name: "Water Elemental", script: 10, type: "effect", sprite: 357, sfx: [] },
	{ name: "Fire Elemental", script: 11, type: "effect", sprite: 358, sfx: [] },
];

let w = 256;
let h = 1;
let colorCycleTexture = context.createTexture();
let colorCycleBuffer = new Uint8Array(w * h);
for (let i = 0; i < 256; i++) {
	colorCycleBuffer[i] = i;
}
if (is.absent(colorCycleTexture)) {
	throw `Expected a texture!`;
}
context.activeTexture(context.TEXTURE2);
context.bindTexture(context.TEXTURE_2D, colorCycleTexture);
context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, 256, 1, 0, context.LUMINANCE, context.UNSIGNED_BYTE, colorCycleBuffer);
let cycleWait = 0;
function updateCycle() {
	if (cycleWait > 0) {
		cycleWait -= 1;
		return;
	}
	cycleWait = 15;
	function update(offset: number, length: number, direction: "forward" | "reverse"): void {
		if (direction === "forward") {
			let first = colorCycleBuffer[offset];
			for (let i = offset; i < offset + length - 1; i++) {
				colorCycleBuffer[i] = colorCycleBuffer[i+1];
			}
			colorCycleBuffer[offset + length - 1] = first;
		} else {
			let last = colorCycleBuffer[offset + length - 1];
			for (let i = offset + length - 1; i > offset; i--) {
				colorCycleBuffer[i] = colorCycleBuffer[i-1];
			}
			colorCycleBuffer[offset] = last;
		}
		context.activeTexture(context.TEXTURE2);
		context.bindTexture(context.TEXTURE_2D, colorCycleTexture);
		context.texSubImage2D(context.TEXTURE_2D, 0, offset, 0, length, 1, context.LUMINANCE, context.UNSIGNED_BYTE, colorCycleBuffer, offset);
	}
	update(114, 6, "reverse");
	update(121, 6, "reverse");
}

function setEntityColor(color: "red" | "green" | "blue" | "white"): void {
	if (color === "red") {
		for (let i = 0; i < 8; i++) {
			colorCycleBuffer[176 + i] = 176 + i;
			colorCycleBuffer[200 + i] = 176 + i;
		}
	} else if (color === "green") {
		for (let i = 0; i < 8; i++) {
			colorCycleBuffer[176 + i] = 168 + i;
			colorCycleBuffer[200 + i] = 168 + i;
		}
	} else if (color === "blue") {
		for (let i = 0; i < 8; i++) {
			colorCycleBuffer[176 + i] = 200 + i;
			colorCycleBuffer[200 + i] = 200 + i;
		}
	} else if (color === "white") {
		for (let i = 0; i < 8; i++) {
			colorCycleBuffer[176 + i] = 184 + i;
			colorCycleBuffer[200 + i] = 184 + i;
		}
	}
	context.activeTexture(context.TEXTURE2);
	context.bindTexture(context.TEXTURE_2D, colorCycleTexture);
	context.texSubImage2D(context.TEXTURE_2D, 0, 176, 0, 8, 1, context.LUMINANCE, context.UNSIGNED_BYTE, colorCycleBuffer, 176);
	context.texSubImage2D(context.TEXTURE_2D, 0, 200, 0, 8, 1, context.LUMINANCE, context.UNSIGNED_BYTE, colorCycleBuffer, 200);
}

let textures = new Array<WebGLTexture>();
let entity = 0;
let offset: number | undefined;
let delay = 0;
let direction = 0;
let frame = 0;
let view: DataView | undefined;
let sfx: Array<VocFile> = [];

async function loadUnitScript(archive: Archive): Promise<wc1.UnitScriptHeader> {
	let entitydata = entities[entity];
	let sprite = await new wc1.Sprite(endianness).load(await archive.getRecord(entitydata.sprite));
	textures = await sprite.makeTextures(context);
	let script = await new wc1.Script(endianness).load(await archive.getRecord(212));
	let us = script.getUnitScript(entitydata.script);
	console.log(JSON.stringify({
		...entitydata,
		armor: shared.armor[entity],
		armorPiercingDamage: shared.armorPiercingDamage[entity],
		damage: shared.damage[entity],
		goldCost: shared.goldCost[entity] * 10,
		health: shared.hitPoints[entity],
		timeCost: shared.timeCost[entity] * 10,
		range: shared.range[entity],
		woodCost: shared.woodCost[entity] * 10,
	}, null, "\t"));
	view = new DataView(us.buffer);
	frame = 0;
	offset = us.header.movementOffset.value;
	delay = 0;
	sfx = await Promise.all(entitydata.sfx.map(async (index) => await new VocFile().load(await archive.getRecord(index))));
	return us.header;
}
async function loadParticleScript(archive: Archive): Promise<wc1.ParticleScriptHeader> {
	let entitydata = entities[entity];
	let sprite = await new wc1.Sprite(endianness).load(await archive.getRecord(entitydata.sprite));
	textures = await sprite.makeTextures(context);
	let script = await new wc1.Script(endianness).load(await archive.getRecord(212));
	let us = script.getParticle(entitydata.script);
	console.log({
		...entitydata
	});
	view = new DataView(us.buffer);
	frame = 0;
	offset = us.header.movementOffset.value;
	delay = 0;
	return us.header;
}
let tileset: Array<WebGLTexture> | undefined;
let map: Array<number>;
let xmi_offset = 0;
let xmi_time_base = 0;
let xmi_loop: undefined | number;

let channels = new Array<Map<number, MidiChannel>>();
let instruments = new Array<[number, number]>();
let channel_mixers = new Array<GainNode>();
let channel_muters = new Array<GainNode>();

async function keyon(channel_index: number, midikey: number, velocity: number): Promise<void> {
	if (is.absent(synth) || is.absent(audio_context)) {
		return;
	}
	if (channel_muters[channel_index].gain.value === 0) {
		return;
	}
	let instrument = instruments[channel_index];
	let program = synth.banks[instrument[0]].programs[instrument[1]];
	if (is.absent(program)) {
		return;
	}
	let map = channels[channel_index];
	let channel = map.get(midikey);
	if (is.present(channel)) {
		channel.stop();
		map.delete(midikey);
	}
	let doff = 35;
	let dnames = [
		"Acoustic Bass Drum",
		"Electric Bass Drum",
		"Side Stick",
		"Acoustic Snare",
		"Hand Clap",
		"Electric Snare",
		"Low Floor Tom",
		"Closed Hi-hat",
		"High Floor Tom",
		"Pedal Hi-hat",
		"Low Tom",
		"Open Hi-hat",
		"Low-Mid Tom",
		"Hi-Mid Tom",
		"Crash Cymbal 1",
		"High Tom",
		"Ride Cymbal 1",
		"Chinese Cymbal",
		"Ride Bell",
		"Tambourine",
		"Splash Cymbal",
		"Cowbell",
		"Crash Cymbal 2",
		"Vibraslap",
		"Ride Cymbal 2",
		"High Bongo",
		"Low Bongo",
		"Mute High Conga",
		"Open High Conga",
		"Low Conga",
		"High Timbale",
		"Low Timbale",
		"High Agogô",
		"Low Agogô",
		"Cabasa",
		"Maracas",
		"Short Whistle",
		"Long Whistle",
		"Short Guiro",
		"Long Guiro",
		"Claves",
		"High Woodblock",
		"Low Woodblock",
		"Mute Cuica",
		"Open Cuica",
		"Mute Triangle",
		"Open Triangle"
	];
	try {
		channel = await program.makeChannel(audio_context, midikey, velocity, channel_mixers[channel_index], channel_index);
		map.set(midikey, channel);
		channel.start();
		let noteString = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];
		let octave = Math.floor(midikey / 12);
		let noteIndex = (midikey % 12);
		let note = noteString[noteIndex];
		if (channel_index === 9) {
			keys[channel_index].innerHTML = `[D]: ${dnames[midikey-doff]}`;
		} else {
			keys[channel_index].innerHTML = `[${channel_index}]: ${note}${octave}`;
		}
	} catch (error) {
		console.log(error);
	}
}
function keyoff(channel_index: number, midikey: number, velocity: number): void {
	let map = channels[channel_index];
	let channel = map.get(midikey);
	if (is.present(channel)) {
		channel.release(midikey, velocity);
		map.delete(midikey);
		keys[channel_index].innerHTML = `[${channel_index === 9 ? "D" : channel_index}]:`;
	}
}
function volume(channel_index: number, byte: number): void {
	// Volume is set for the loaded instrument, not the channel. Instruments loaded on multiple channels are affected.
	let ins = instruments[channel_index];
	for (let i = 0; i < 16; i++) {
		if (instruments[i] === ins) {
			channel_mixers[channel_index].gain.value = 10 ** (-960*(1 - byte/128)*(1 - byte/128)/200);
		}
	}
}

let tempo_seconds_per_beat = 0.5;
let signature_num = 4;
let signature_den = 4;
let signature_clicks = 24;
let signature_quarts = 8;
let xmi_timer: number | undefined;
function stopMusic(): void {
	if (is.present(xmi_timer)) {
		window.clearTimeout(xmi_timer);
		xmi_timer = undefined;
	}
}
function playMusic(): void {
	stopMusic();
	xmi_offset = 0;
	xmi_loop = undefined;
	tempo_seconds_per_beat = 0.5;
	signature_num = 4;
	signature_den = 4;
	signature_clicks = 24;
	signature_quarts = 8;
	soundUpdate();
}
async function soundUpdate(): Promise<void> {
	if (is.present(xmi)) {
		while (true) {
			let event = xmi.events[xmi_offset++];
			if (false) {
			} else if (event.type === XMIEventType.NOTE_OFF) {
				let a = event.data[0];
				let b = event.data[1];
				keyoff(event.channel, a, b);
			} else if (event.type === XMIEventType.NOTE_ON) {
				let a = event.data[0];
				let b = event.data[1];
				if (b === 0) {
					keyoff(event.channel, a, b);
				} else {
					await keyon(event.channel, a, b);
				}
			} else if (event.type === XMIEventType.INSTRUMENT_CHANGE) {
				let a = event.data[0];
				//console.log(`${event.channel}: instrument ${a}`);
				for (let i = 0; i < 16; i++) {
					if (instruments[i][1] === a) {
						channel_mixers[event.channel].gain.value = channel_mixers[i].gain.value;
						break;
					}
				}
				if (!OVERRIDE) {
					instruments[event.channel][1] = a;
				}
				document.querySelector(`select:nth-of-type(${event.channel}) > option:nth-of-type(${a})`)?.setAttribute("selected", "");
			} else if (event.type === XMIEventType.CONTROLLER) {
				let a = event.data[0];
				let b = event.data[1];
				if (a === 64) {
					// SUSTAIN PEDAL ON OR OFF
				} else if (a === 10) {
					// PANNING
				} else if (a === 116) {
					xmi_loop = xmi_offset;
				} else if (a === 117) {
					xmi_offset = (xmi_loop ?? 0);
					continue;
				} else if ((a === 7) || (a === 11)) {
					//console.log(`${event.channel}: volume ${a} ${b}`);
					volume(event.channel, b);
				} else {
					//console.log(XMIEventType[event.type], a, b);
				}
			} else if (event.type === XMIEventType.PITCH_BEND) {
				let a = event.data[0];
				let b = event.data[1];
				let value = ((a & 0x7F) << 7) | ((b & 0x7F) << 0);
				let o = channels[event.channel];
				//console.log(XMIEventType[event.type], event);
			} else if (event.type === XMIEventType.SYSEX) {
				if (event.channel === 15) {
					let type = event.data[0];
					if (type === 0x51) {
						let a = event.data[1];
						let b = event.data[2];
						let c = event.data[3];
						let tempo = (a << 16) | (b << 8) | (c << 0);
						tempo_seconds_per_beat = tempo / 1000000;
					} else
					if (type === 0x58) {
						let numerator = event.data[1];
						let denominator = (1 << event.data[2]);
						let clocks_per_metronome_click = event.data[3];
						let quarter_32nd_notes = event.data[4];
						signature_num = numerator;
						signature_den = denominator;
						signature_clicks = clocks_per_metronome_click;
						signature_quarts = quarter_32nd_notes;
					}
				}
			} else {
				//console.log(XMIEventType[event.type], event);
			}
			if (xmi_offset < xmi.events.length) {
				let xmi_delay = xmi.events[xmi_offset].time;
				if (xmi_delay > 0) {
					// works nicely
					//let delay_s = (xmi_delay / xmi_time_base) * tempo_seconds_per_beat;
					let delay_s = (xmi_delay / xmi_time_base) * tempo_seconds_per_beat * signature_num / signature_den * 96 / signature_clicks * signature_quarts / 32;
					//console.log({xmi_delay, xmi_time_base, tempo_seconds_per_beat, signature_num, signature_den, signature_clicks, signature_quarts});
					//console.log(delay_s);
					xmi_timer = window.setTimeout(soundUpdate, delay_s * 1000);
					break;
				}
			} else {
				xmi = undefined;
				break;
			}
		}
	}
}

const YELLOW = 221;
const RED = 222;
const GREEN = 223;

function getRectangleFromEntity(e: Entity): Rectangle {
	let index = entities.indexOf(e) ?? entity;
	let x = 12 * 16;
	let y = 12 * 16;
	let w = shared.rectangles[index*2+0];
	let h = shared.rectangles[index*2+1];
	return {
		x,
		y,
		w,
		h
	};
}

async function render(ms: number): Promise<void> {
	context.clear(context.COLOR_BUFFER_BIT);
	updateCycle();
	if (is.present(map) && is.present(tileset)) {
		for (let y = 0; y < 64; y++) {
			for (let x = 0; x < 64; x++) {
				context.uniform1i(textureIndexLocation, 0);
				context.uniform1i(transparentIndexLocation, 256);
				context.uniform2f(anchorLocation, 0.0, 0.0);
				context.uniform2f(quadLocation, x * 16, y * 16);
				context.uniform2i(scalingLocation, 0, 0);
				context.activeTexture(context.TEXTURE0);
				context.bindTexture(context.TEXTURE_2D, tileset[map[y*64 + x]]);
				context.bindBuffer(context.ARRAY_BUFFER, buffer);
				context.drawArrays(context.TRIANGLE_FAN, 0, 4);
			}
		}
	}
	if (is.present(offset) && is.present(view)) {
		if (delay > 0) {
			delay -= 1;
		} else {
			let opcode = view.getUint8(offset++);
			if (opcode === 0) {
			} else if (opcode === 1) {
				delay = view.getUint8(offset++);
			} else if (opcode === 2) {
				throw "";
			} else if (opcode === 3) {
				offset = view.getUint16(offset, true);
			} else if (opcode === 4) {
				frame = view.getUint8(offset++);
			} else if (opcode === 5) {
				let movement = view.getUint8(offset++);
			} else if (opcode === 6) {
				let movement = view.getUint8(offset++);
				frame = view.getUint8(offset++);
			} else if (opcode === 7) {
				delay = view.getUint8(offset++);
			} else if (opcode === 8) {
				setTimeout(() => {
					if (sfx.length > 0) {
						sfx[Math.floor(Math.random() * sfx.length)].play();
					}
				});
			} else if (opcode === 9) {
				console.log("damage!");
			} else if (opcode === 10) {
				delay = view.getUint8(offset++);
			} else {
				throw `Invalid opcode ${opcode}!`;
			}
		}
		let index = direction < 5 ? frame + direction : frame + 8 - direction;
		if (index >= textures.length) {
			//console.log({index, unit: entity});
		}
		context.uniform1i(textureIndexLocation, 0);
		context.uniform1i(transparentIndexLocation, 0);
		context.uniform2f(anchorLocation, 0.0, 0.0);
		context.uniform2f(quadLocation, 192, 192);
		context.uniform2i(scalingLocation, direction < 5 ? 0 : 1, 0);
		context.activeTexture(context.TEXTURE0);
		context.bindTexture(context.TEXTURE_2D, textures[index]);
		context.bindBuffer(context.ARRAY_BUFFER, buffer);
		context.drawArrays(context.TRIANGLE_FAN, 0, 4);
	}
	for (let entity of selectedEntities) {
		drawRectangle(getRectangleFromEntity(entity), GREEN);
	}
	if (is.present(dragStart) && is.present(dragEnd)) {
		drawRectangle(makeRectangleFromPoints(dragStart, dragEnd), GREEN);
	}
	window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);
let keymap: Record<string, number> = {
	z: 48,
	x: 49,
	c: 50,
	v: 51,
	b: 52,
	n: 53,
	m: 54,

	a: 36,
	s: 37,
	d: 38,
	f: 39,
	g: 40,
	h: 41,
	j: 42,
	k: 43,
	l: 44,

	q: 24,
	w: 25,
	e: 26,
	r: 27,
	t: 28,
	y: 29,
	u: 30,
	i: 31,
	o: 32,
	p: 33
};
let current_channel = 0;
let keysdown: Record<string, boolean | undefined> = {};
window.addEventListener("keydown", async (event) => {
	if (!(event.key in keymap)) {
		return;
	}
	if (keysdown[event.key]) {
		return;
	}
	keysdown[event.key] = true;
	await keyon(current_channel, keymap[event.key], 127);
});
window.addEventListener("keyup", async (event) => {
	if (!(event.key in keymap)) {
		return;
	}
	delete keysdown[event.key];
	keyoff(current_channel, keymap[event.key], 127);
});
window.addEventListener("keyup", async (event) => {

	if (false) {
	} else if (event.key === "0") {
		channel_muters[0].gain.value = channel_muters[0].gain.value > 0 ? 0 : 1;
	} else if (event.key === "1") {
		channel_muters[1].gain.value = channel_muters[1].gain.value > 0 ? 0 : 1;
	} else if (event.key === "2") {
		channel_muters[2].gain.value = channel_muters[2].gain.value > 0 ? 0 : 1;
	} else if (event.key === "3") {
		channel_muters[3].gain.value = channel_muters[3].gain.value > 0 ? 0 : 1;
	} else if (event.key === "4") {
		channel_muters[4].gain.value = channel_muters[4].gain.value > 0 ? 0 : 1;
	} else if (event.key === "5") {
		channel_muters[5].gain.value = channel_muters[5].gain.value > 0 ? 0 : 1;
	} else if (event.key === "6") {
		channel_muters[6].gain.value = channel_muters[6].gain.value > 0 ? 0 : 1;
	} else if (event.key === "7") {
		channel_muters[7].gain.value = channel_muters[7].gain.value > 0 ? 0 : 1;
	} else if (event.key === "8") {
		channel_muters[8].gain.value = channel_muters[8].gain.value > 0 ? 0 : 1;
	} else if (event.key === "9") {
		channel_muters[9].gain.value = channel_muters[9].gain.value > 0 ? 0 : 1;
	}

	if (false) {
	} else if (event.key === "8") {
		direction = 0;
	} else if (event.key === "9") {
		direction = 1;
	} else if (event.key === "6") {
		direction = 2;
	} else if (event.key === "3") {
		direction = 3;
	} else if (event.key === "2") {
		direction = 4;
	} else if (event.key === "1") {
		direction = 5;
	} else if (event.key === "4") {
		direction = 6;
	} else if (event.key === "7") {
		direction = 7;
	}
	if (is.present(archive)) {
		try {
			if (false) {
			} else if (event.key === "a") {
				offset = (await loadUnitScript(archive)).actionOffset.value;
			} else if (event.key === "d") {
				offset = (await loadUnitScript(archive)).deathOffset.value;
			} else if (event.key === "i") {
				offset = (await loadUnitScript(archive)).idleOffset.value;
			} else if (event.key === "m") {
				offset = (await loadUnitScript(archive)).movementOffset.value;
			} else if (event.key === "s") {
				offset = (await loadUnitScript(archive)).spawnOffset.value;
			} else if (event.key === "t") {
				offset = (await loadUnitScript(archive)).trainOffset.value;
			} else if (event.key === "z") {
				offset = (await loadParticleScript(archive)).spawnOffset.value;
			} else if (event.key === "x") {
				offset = (await loadParticleScript(archive)).movementOffset.value;
			} else if (event.key === "c") {
				offset = (await loadParticleScript(archive)).hitOffset.value;
			} else if (event.key === "ArrowUp") {
				entity = (((entity - 1) % entities.length) + entities.length) % entities.length;
				let ed = entities[entity];
				if (ed.type === "effect") {
					await loadParticleScript(archive);
				} else {
					await loadUnitScript(archive);
				}
			} else if (event.key === "ArrowDown") {
				entity = (((entity + 1) % entities.length) + entities.length) % entities.length;
				let ed = entities[entity];
				if (ed.type === "effect") {
					await loadParticleScript(archive);
				} else {
					await loadUnitScript(archive);
				}
			}
		} catch (error) {}
	}
});

function makeSingleColoredTexture(w: number, h: number, colorIndex: number): WebGLTexture {
	let texture = context.createTexture();
	if (is.absent(texture)) {
		throw `Expected a texture!`;
	}
	context.activeTexture(context.TEXTURE0);
	context.bindTexture(context.TEXTURE_2D, texture);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
	context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, w, h, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
	let array = new Uint8Array(w * h);
	for (let i = 0; i < w * h; i++) {
		array[i] = colorIndex;
	}
	context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, w, h, context.LUMINANCE, context.UNSIGNED_BYTE, array);
	return texture;
}

function drawRectangle(rectangle: Rectangle, colorIndex: number): void {
	context.uniform1i(textureIndexLocation, colorIndex);
	context.uniform1i(transparentIndexLocation, 256);
	context.uniform2f(anchorLocation, 0.0, 0.0);
	context.uniform2f(quadLocation, rectangle.x, rectangle.y);
	context.uniform2i(scalingLocation, 0, 0);
	context.activeTexture(context.TEXTURE0);
	context.bindTexture(context.TEXTURE_2D, makeSingleColoredTexture(rectangle.w, rectangle.h, colorIndex));
	context.bindBuffer(context.ARRAY_BUFFER, buffer);
	context.drawArrays(context.LINE_LOOP, 0, 4);
}

type Point = {
	x: number;
	y: number;
};

type Rectangle = {
	 x: number;
	 y: number;
	 w: number;
	 h: number;
};

function makeRectangleFromPoints(one: Point, two: Point): Rectangle {
	let w = two.x - one.x + 1;
	if (w < 0) {
		w = 0 - w;
	}
	let h = two.y - one.y + 1;
	if (h < 0) {
		h = 0 - h;
	}
	let x = Math.min(one.x, two.x);
	let y = Math.min(one.y, two.y);
	return {
		x,
		y,
		w,
		h
	};
}

function getEntitiesWithinRange(rectangle: Rectangle): Array<Entity> {
	let e = new Array<any>();
	e.push(entities[entity]);
	return e;
}

function setSelection(entities: Array<Entity>): void {
	selectedEntities = entities.slice(0, 9);
}

let dragStart: { x: number, y: number } | undefined;
let dragEnd: { x: number, y: number } | undefined;
function beginInteraction(x: number, y: number): void {
	dragStart = { x: Math.floor(x / ZOOM), y: Math.floor(y / ZOOM) };
}
function continueInteraction(x: number, y: number): void {
	dragEnd = { x: Math.floor(x / ZOOM), y: Math.floor(y / ZOOM) };
}
function completeInteraction(x: number, y: number): void {
	continueInteraction(x, y);
	if (is.present(dragStart) && is.present(dragEnd)) {
		let rect = makeRectangleFromPoints(dragStart, dragEnd);
		let entities = getEntitiesWithinRange(rect);
		setSelection(entities);
	}
	cancelInteraction(x, y);
}
function cancelInteraction(x: number, y: number): void {
	dragStart = undefined;
	dragEnd = undefined;
}
window.addEventListener("pointerdown", async (event) => {
	let x = event.pageX;
	let y = event.pageY;
	beginInteraction(x, y);
});
window.addEventListener("pointermove", async (event) => {
	let x = event.pageX;
	let y = event.pageY;
	continueInteraction(x, y);
});
window.addEventListener("pointerup", async (event) => {
	let x = event.pageX;
	let y = event.pageY;
	completeInteraction(x, y);
});
window.addEventListener("pointercancel", async (event) => {
	let x = event.pageX;
	let y = event.pageY;
	cancelInteraction(x, y);
});
function unlock_context(): void {
	if (is.absent(audio_context)) {
		audio_context = new AudioContext();
		for (let i = channels.length; i < 16; i++) {
			channels[i] = new Map<number, MidiChannel>();
		}
		for (let i = instruments.length; i < 16; i++) {
			instruments[i] = i === 9 ? [128, 0] : [0, 0];
		}
		for (let i = channel_muters.length; i < 16; i++) {
			channel_muters[i] = audio_context.createGain();
			channel_muters[i].connect(audio_context.destination);
		}
		for (let i = channel_mixers.length; i < 16; i++) {
			channel_mixers[i] = audio_context.createGain();
			channel_mixers[i].connect(channel_muters[i]);
		}
	}
}
function reset_synth(): void {
	for (let [i, instrument] of instruments.entries()) {
			instruments[i] = i === 9 ? [128, 0] : [0, 0];
	}
	for (let [i, channel_mixer] of channel_mixers.entries()) {
			channel_mixer.gain.value = 1;
	}
	for (let channel of channels) {
		for (let mc of channel.values()) {
			mc.stop();
		}
	}
	if (OVERRIDE) {
		let square: [number, number] = [0, 80];
		let saw: [number, number] = [0, 81];
		let fifth_saw: [number, number] = [0, 86];
		let powerdrums: [number, number] = [128, 16];
		instruments[0] = square;
		instruments[1] = square;
		instruments[2] = saw;
		instruments[3] = saw;
		instruments[4] = saw;
		instruments[5] = square;
		instruments[6] = square;
		instruments[7] = square;
		instruments[8] = square;
		instruments[9] = powerdrums;
		instruments[10] = saw;
		instruments[11] = saw;
		instruments[12] = saw;
		instruments[13] = saw;
		instruments[14] = saw;
		instruments[15] = saw;
	}
}

window.addEventListener("keydown", () => {
	unlock_context();
});
fetch("gm.sf2").then(async (response) => {
	let array_buffer = await response.arrayBuffer()
	let cursor = new binary.Cursor();
	let reader = new binary.BufferReader({
		buffer: new binary.Buffer(array_buffer)
	});
	let sf = new shared.formats.soundfont.File();
	await sf.load(cursor, reader);
	synth = await WavetableSynth.fromSoundfont(sf);
	console.log("synth initialized");
	for (let chan = 0; chan < 16; chan++) {
		let select = document.createElement("select");
		select.style.setProperty("font-size", "20px");
		for (let [bank_index, bank] of synth.banks.entries()) {
			for (let [program_index, program] of bank.programs.entries()) {
				if (is.present(program)) {
					let option = document.createElement("option");
					option.style.setProperty("font-size", "20px");
					option.textContent = bank_index + ":" + program_index + " - " + program.name;
					option.value = "" + bank_index + ":" + program_index;
					select.appendChild(option);
				}
			}
		}
		select.addEventListener("change", (event) => {
			let parts = select.value.split(":");
			let b = Number.parseInt(parts[0]);
			let i = Number.parseInt(parts[1]);
			instruments[chan] = [b, i];
		});
		document.body.appendChild(select);
	}
});
canvas.addEventListener("drop", async (event) => {
	event.stopPropagation();
	event.preventDefault();
	unlock_context();
	reset_synth();
	let dataTransfer = event.dataTransfer;
	if (is.present(dataTransfer)) {
		let files = dataTransfer.files;
		for (let file of files) {
			let dataProvider = await new FileDataProvider(file).buffer();
			if (/[.]xmi$/i.test(file.name)) {
				xmi = await new XmiFile().load(dataProvider);
				xmi_time_base = 68; // 15ms interrupts
				playMusic();
			} else
			if (/[.]mid$/i.test(file.name)) {
				let array_buffer = await file.arrayBuffer()
				let cursor = new binary.Cursor();
				let reader = new binary.BufferReader({
					buffer: new binary.Buffer(array_buffer)
				});
				let midifile = await midi.File.fromReader(cursor, reader);
				xmi = new XmiFile();
				for (let track of midifile.tracks) {
					let tc = 0;
					for (let event of track.events) {
						tc += event.delay;
						let data = (() => {
							let data = new Uint8Array(event.data.size());
							event.data.copy(new binary.Buffer(data.buffer));
							if (event.type === midi.Type.SYSEX) {
								if (event.channel < 15) {
									return data.slice(1);
								} else {
									return Uint8Array.of(data[0], ...data.slice(2));
								}
							} else {
								return data;
							}
						})();
						xmi.events.push({
							index: xmi.events.length,
							time: tc,
							type: event.type + 8,
							channel: event.channel,
							data: data
						});
					}
				}
				xmi.events.sort((one, two) => {
					if (one.time < two.time) {
						return -1;
					}
					if (one.time > two.time) {
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
				let time = 0;
				for (let event of xmi.events) {
					let delay = event.time - time;
					time = event.time;
					event.time = delay;
				}
				xmi_time_base = midifile.header.ticks_per_qn.value;
				playMusic();
			} else {
				await load(dataProvider);
			}
		}
	}
});
async function resize(): Promise<void> {
	let w = canvas.offsetWidth * window.devicePixelRatio;
	let h = canvas.offsetHeight * window.devicePixelRatio;
	canvas.setAttribute("width", `${w}px`);
	canvas.setAttribute("height", `${h}px`);
	context.viewport(0, 0, w, h);
	context.uniform2i(viewportLocation, w, h);
}
document.body.appendChild(canvas);
window.addEventListener("resize", () => {
	resize();
});
resize();
