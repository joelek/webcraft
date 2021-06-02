import { IntegerAssert } from "../../asserts";
import { Buffer, Chunk, Cursor, Endian, Reader } from "../../binary";
import { Integer1, Integer2, Integer4, PackedInteger1, PackedInteger4 } from "../../binary/chunks";
import { DEBUG } from "../config";

export class ArchiveRecordHeader extends Chunk {
	readonly uncompressedSize: PackedInteger4;
	readonly isCompressed: PackedInteger4;

	constructor(options?: Partial<{ buffer: Buffer, endian: Endian }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		let endian = options?.endian;
		if (DEBUG) IntegerAssert.exactly(buffer.size(), 4);
		super(buffer);
		let integer = new Integer4({ buffer, endian });
		this.uncompressedSize = new PackedInteger4(integer, {
			offset: 0,
			length: 24
		});
		this.isCompressed = new PackedInteger4(integer, {
			offset: 29,
			length: 1
		});
	}
};

export class SpriteFrameHeader extends Chunk {
	readonly x: Integer1;
	readonly y: Integer1;
	readonly w: Integer1;
	readonly h: Integer1;
	readonly offset: Integer4;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(8);
		if (DEBUG) IntegerAssert.exactly(buffer.size(), 8);
		super(buffer);
		this.x = new Integer1({
			buffer: buffer.window({
				offset: 0,
				length: 1
			})
		});
		this.y = new Integer1({
			buffer: buffer.window({
				offset: 1,
				length: 1
			})
		});
		this.w = new Integer1({
			buffer: buffer.window({
				offset: 2,
				length: 1
			})
		});
		this.h = new Integer1({
			buffer: buffer.window({
				offset: 3,
				length: 1
			})
		});
		this.offset = new Integer4({
			buffer: buffer.window({
				offset: 4,
				length: 4
			})
		});
	}
};

export class SpriteHeader extends Chunk {
	readonly spriteCount: Integer2;
	readonly w: Integer2;
	readonly h: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(6);
		if (DEBUG) IntegerAssert.exactly(buffer.size(), 6);
		super(buffer);
		this.spriteCount = new Integer2({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.w = new Integer2({
			buffer: buffer.window({
				offset: 2,
				length: 2
			})
		});
		this.h = new Integer2({
			buffer: buffer.window({
				offset: 4,
				length: 2
			})
		});
	}
};

export type SpriteFrame = {
	header: SpriteFrameHeader;
	image: Buffer;
};

export const SpriteFrame = {
	async decodeImageRow(imageRow: Buffer, cursor: Cursor, reader: Reader): Promise<Buffer> {
		let control = new Integer1();
		let operand = new PackedInteger1(control, {
			offset: 0,
			length: 6
		});
		let opcode = new PackedInteger1(control, {
			offset: 6,
			length: 2
		});
		let byte = new Integer1();
		let x = 0;
		while (x !== imageRow.size()) {
			await control.load(cursor, reader);
			let imageRowSlice = imageRow.window({
				offset: x,
				length: operand.value
			});
			if (opcode.value === 0b00) {
				await reader.read(cursor, imageRowSlice);
				x += operand.value;
			} else if (opcode.value === 0b10) {
				x += operand.value;
			} else if (opcode.value === 0b01) {
				await byte.load(cursor, reader);
				imageRowSlice.fill(byte.value);
				x += operand.value;
			} else if (opcode.value === 0b11) {
				x += operand.value + 64;
			}
		}
		return imageRow;
	},
	async parse(header: SpriteFrameHeader, cursor: Cursor, reader: Reader): Promise<SpriteFrame> {
		let image = Buffer.alloc(header.w.value * header.h.value);
		let offset = cursor.offset;
		let delta = new Integer2();
		for (let y = 0; y < header.h.value; y++) {
			await delta.load(cursor, reader);
			let imageRow = image.window({
				offset: y * header.w.value,
				length: header.w.value
			});
			await this.decodeImageRow(imageRow, { offset: offset + delta.value }, reader);
		}
		return {
			header,
			image
		};
	}
}

export type Sprite = {
	frames: Array<SpriteFrame>;
};

export const Sprite = {
	async load(reader: Reader, cursor: Cursor): Promise<Sprite> {
		let spriteHeader = new SpriteHeader();
		await spriteHeader.load(cursor, reader);
		let frames = new Array<SpriteFrame>();
		for (let i = 0; i < spriteHeader.spriteCount.value; i++) {
			let spriteFrameHeader = new SpriteFrameHeader();
			await spriteFrameHeader.load(cursor, reader);
			let frame = await SpriteFrame.parse(spriteFrameHeader, { offset: spriteFrameHeader.offset.value}, reader);
			frames.push(frame);
		}
		return {
			frames
		};
	}
};

export type Palette = Buffer;

export const Palette = {
	async load(reader: Reader, cursor: Cursor): Promise<Palette> {
		let buffer = Buffer.alloc(256 * 3);
		await reader.read(cursor, buffer);
		for (let i = 0, o1 = 0; i < 256; i++) {
			buffer.set(o1, buffer.get(o1) << 2); o1 += 1;
			buffer.set(o1, buffer.get(o1) << 2); o1 += 1;
			buffer.set(o1, buffer.get(o1) << 2); o1 += 1;
		}
		return buffer;
	}
};
