namespace is {
	export function absent<A>(subject: A | null | undefined): subject is null | undefined {
		return subject == null;
	};

	export function present<A>(subject: A | null | undefined): subject is A {
		return subject != null;
	};
};

namespace assert {
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
		let a = 8 - (this.offset + this.length);
		let b = 8 - (this.length);
		return (this.integer.value << a) >>> b;
	}

	set value(next: number) {
		let last = this.integer.value;
		let a = this.offset;
		let b = 8 - (this.length);
		let c = 8 - (this.offset + this.length);
		let m = ((0xFF >> a) << b) >>> c;
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
		let a = 16 - (this.offset + this.length);
		let b = 16 - (this.length);
		return (this.integer.value << a) >>> b;
	}

	set value(next: number) {
		let last = this.integer.value;
		let a = this.offset;
		let b = 16 - (this.length);
		let c = 16 - (this.offset + this.length);
		let m = ((0xFFFF >> a) << b) >>> c;
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
		let a = 24 - (this.offset + this.length);
		let b = 24 - (this.length);
		return (this.integer.value << a) >>> b;
	}

	set value(next: number) {
		let last = this.integer.value;
		let a = this.offset;
		let b = 24 - (this.length);
		let c = 24 - (this.offset + this.length);
		let m = ((0xFFFFFF >> a) << b) >>> c;
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
		let context = new AudioContext();
		let buffer = context.createBuffer(channels, samples, sampleRate);
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
		let source = context.createBufferSource();
		source.buffer = buffer;
		source.connect(context.destination);
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

		makeTexture(context: WebGLRenderingContext, width: number, height: number): WebGLTexture {
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

		makeTextures(context: WebGLRenderingContext): Array<WebGLTexture> {
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

		makeTexture(context: WebGLRenderingContext): WebGLTexture {
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

		makeTexture(context: WebGLRenderingContext): WebGLTexture {
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

		updateTexture(texture: WebGLTexture): this {
			let w = this.buffer.byteLength / 3;
			let h = 1;
			context.activeTexture(context.TEXTURE0);
			context.bindTexture(context.TEXTURE_2D, texture);
			context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, w, h, context.RGB, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
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

		makeTexture(context: WebGLRenderingContext): WebGLTexture {
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

let canvas = document.createElement("canvas");
let context = canvas.getContext("webgl2") as WebGL2RenderingContext;
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
		float zoom = 4.0;
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
	uniform int transparentIndex;
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
		vec3 color = texture(paletteSampler, vec2(index, 0.0)).rgb * 4.0;
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
let transparentIndexLocation = context.getUniformLocation(program, "transparentIndex");
context.uniform1i(transparentIndexLocation, 0);
let textureSamplerocation = context.getUniformLocation(program, "textureSampler");
context.uniform1i(textureSamplerocation, 0);
let paletteSamplerLocation = context.getUniformLocation(program, "paletteSampler");
context.uniform1i(paletteSamplerLocation, 1);
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
	0.0, 0.0,		0.0, 0.0,
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
async function load(dataProvider: DataProvider): Promise<void> {
	archive = new Archive(dataProvider, endianness);
	let base_palette = await new wc1.Palette(endianness).load(await archive.getRecord(217));
	let paletteTexture = await base_palette.makeTexture(context);
	let palette = await new wc1.Palette(endianness).load(await archive.getRecord(191));
	palette.updateTexture(paletteTexture);
	context.activeTexture(context.TEXTURE1);
	context.bindTexture(context.TEXTURE_2D, paletteTexture);
/* 			let voc = await new VocFile().load(await archive.getRecord(503));
	await voc.play(); */
/* 			let wave = await new WavFile().load(await archive.getRecord(504));
	await wave.play(); */
}
type Entity = {
	name: string,
	script: number,
	sprite: number
};
let entities: Array<Entity> = [
	{ name: "Footman", script: 0, sprite: 279 },
	{ name: "Grunt", script: 1, sprite: 280 },
	{ name: "Peasant", script: 2, sprite: 281 },
	{ name: "Peasant", script: 2, sprite: 327 },
	{ name: "Peasant", script: 2, sprite: 329 },
	{ name: "Peon", script: 3, sprite: 282 },
	{ name: "Peon", script: 3, sprite: 328 },
	{ name: "Peon", script: 3, sprite: 330 },
	{ name: "Catapult", script: 4, sprite: 283 },
	{ name: "Catapult", script: 5, sprite: 284 },
	{ name: "Knight", script: 6, sprite: 285 },
	{ name: "Raider", script: 7, sprite: 286 },
	{ name: "Archer", script: 8, sprite: 287 },
	{ name: "Spearman", script: 9, sprite: 288 },
	{ name: "Conjurer", script: 10, sprite: 289 },
	{ name: "Warlock", script: 11, sprite: 290 },
	{ name: "Cleric", script: 12, sprite: 291 },
	{ name: "Necrolyte", script: 13, sprite: 292 },
	{ name: "Medivh", script: 14, sprite: 293 },
	{ name: "Sir Lothar", script: 15, sprite: 294 },
	{ name: "Wounded", script: 16, sprite: 295 }, // broken
	{ name: "Griselda", script: 17, sprite: 296 }, // ok at 18, 17

	{ name: "Ogre", script: 19, sprite: 297 },

	{ name: "Spider", script: 21, sprite: 298 },
	{ name: "Slime", script: 22, sprite: 299 },
	{ name: "Fire Elemental", script: 23, sprite: 300 }, // broken?
	{ name: "Scorpion", script: 24, sprite: 301 },
	{ name: "Brigand", script: 25, sprite: 302 },
	{ name: "Skeleton", script: 26, sprite: 303 },
	{ name: "Skeleton", script: 27, sprite: 304 },
	{ name: "Daemon", script: 28, sprite: 305 },


	{ name: "Water Elemental", script: 31, sprite: 306 },
	{ name: "Farm", script: 32, sprite: 307 },
	{ name: "Farm", script: 33, sprite: 308 },
	{ name: "Barracks", script: 34, sprite: 309 },
	{ name: "Barracks", script: 35, sprite: 310 },
	{ name: "Church", script: 36, sprite: 311 },
	{ name: "Temple", script: 37, sprite: 312 },
	{ name: "Tower", script: 38, sprite: 313 },
	{ name: "Tower", script: 39, sprite: 314 },
	{ name: "Town Hall", script: 40, sprite: 315 },
	{ name: "Town Hall", script: 41, sprite: 316 },
	{ name: "Mill", script: 42, sprite: 317 },
	{ name: "Mill", script: 43, sprite: 318 },
	{ name: "Stables", script: 44, sprite: 319 },
	{ name: "Kennel", script: 45, sprite: 320 },
	{ name: "Blacksmith", script: 46, sprite: 321 },
	{ name: "Blacksmith", script: 47, sprite: 322 },
	{ name: "Stormwind Keep", script: 48, sprite: 323 },
	{ name: "Black Rock Spire", script: 49, sprite: 324 },
	{ name: "Gold Mine", script: 50, sprite: 325 },
];
let textures = new Array<WebGLTexture>();
let unit = 0;
let offset: number | undefined;
let delay = 0;
let direction = 0;
let frame = 0;
let animation: { header: wc1.UnitScriptHeader, buffer: ArrayBuffer };
function render(ms: number): void {
	context.clear(context.COLOR_BUFFER_BIT);
	if (is.present(offset)) {
		if (delay > 0) {
			delay -= 1;
		} else {
			let view = new DataView(animation.buffer);
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
				// play sound
			} else if (opcode === 9) {
				// deal damage
			} else if (opcode === 10) {
				delay = view.getUint8(offset++);
			} else {
				throw `Invalid opcode ${opcode}!`;
			}
		}
		let index = direction < 5 ? frame + direction : frame + 8 - direction;
		if (index >= textures.length) {
			console.log({index, unit});
		}
		context.uniform2f(anchorLocation, 0.5, 0.5);
		context.uniform2f(quadLocation, 48, 48);
		context.uniform2i(scalingLocation, direction < 5 ? 0 : 1, 0);
		context.activeTexture(context.TEXTURE0);
		context.bindTexture(context.TEXTURE_2D, textures[index]);
		context.bindBuffer(context.ARRAY_BUFFER, buffer);
		context.drawArrays(context.TRIANGLES, 0, 6);
	}
	window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);
window.addEventListener("keyup", async (event) => {
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
	if (is.present(animation)) {
		if (false) {
		} else if (event.key === "a") {
			offset = animation.header.actionOffset.value;
			delay = 0;
		} else if (event.key === "d") {
			offset = animation.header.deathOffset.value;
			delay = 0;
		} else if (event.key === "i") {
			offset = animation.header.idleOffset.value;
			delay = 0;
		} else if (event.key === "m") {
			offset = animation.header.movementOffset.value;
			delay = 0;
		} else if (event.key === "s") {
			offset = animation.header.spawnOffset.value;
			delay = 0;
		} else if (event.key === "t") {
			offset = animation.header.trainOffset.value;
			delay = 0;
		}
	}
	if (is.present(archive)) {
		if (false) {
		} else if (event.key === "ArrowUp") {
			unit = (((unit - 1) % entities.length) + entities.length) % entities.length;
			let entity = entities[unit];
			let sprite = await new wc1.Sprite(endianness).load(await archive.getRecord(entity.sprite));
			textures = await sprite.makeTextures(context);
			let script = await new wc1.Script(endianness).load(await archive.getRecord(212));
			animation = script.getUnitScript(entity.script);
			offset = animation.header.idleOffset.value;
			delay = 0;
		} else if (event.key === "ArrowDown") {
			unit = (((unit + 1) % entities.length) + entities.length) % entities.length;
			let entity = entities[unit];
			let sprite = await new wc1.Sprite(endianness).load(await archive.getRecord(entity.sprite));
			textures = await sprite.makeTextures(context);
			let script = await new wc1.Script(endianness).load(await archive.getRecord(212));
			animation = script.getUnitScript(entity.script);
			offset = animation.header.idleOffset.value;
			delay = 0;
		}
	}
});
canvas.addEventListener("drop", async (event) => {
	event.stopPropagation();
	event.preventDefault();
	let dataTransfer = event.dataTransfer;
	if (is.present(dataTransfer)) {
		let files = dataTransfer.files;
		for (let file of files) {
			let dataProvider = await new FileDataProvider(file).buffer();
			await load(dataProvider);
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