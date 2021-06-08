import { IntegerAssert } from "../../asserts";
import { Buffer, Chunk, Cursor, Endian, Reader, WindowedReader } from "../../binary";
import { ByteString, Integer1, Integer4 } from "../../binary/chunks";
import { DEBUG } from "../config";

export class FrameHeader extends Chunk {
	readonly endOffset: Integer4;
	readonly unknown0: Integer4;
	readonly canvasWidth: Integer4;
	readonly canvasHeight: Integer4;
	readonly w: Integer4;
	readonly h: Integer4;
	readonly x: Integer4;
	readonly y: Integer4;

	constructor(options?: Partial<{ buffer: Buffer, endian: Endian }>) {
		let buffer = options?.buffer ?? Buffer.alloc(32);
		let endian = options?.endian;
		if (DEBUG) IntegerAssert.exactly(buffer.size(), 32);
		super(buffer);
		this.endOffset = new Integer4({
			buffer: buffer.window({
				offset: 0,
				length: 4
			}),
			endian
		});
		this.unknown0 = new Integer4({
			buffer: buffer.window({
				offset: 4,
				length: 4
			}),
			endian
		});
		this.canvasWidth = new Integer4({
			buffer: buffer.window({
				offset: 8,
				length: 4
			}),
			endian
		});
		this.canvasHeight = new Integer4({
			buffer: buffer.window({
				offset: 12,
				length: 4
			}),
			endian
		});
		this.w = new Integer4({
			buffer: buffer.window({
				offset: 16,
				length: 4
			}),
			endian
		});
		this.h = new Integer4({
			buffer: buffer.window({
				offset: 20,
				length: 4
			}),
			endian
		});
		this.x = new Integer4({
			buffer: buffer.window({
				offset: 24,
				length: 4
			}),
			endian
		});
		this.y = new Integer4({
			buffer: buffer.window({
				offset: 28,
				length: 4
			}),
			endian
		});
	}
};

export type Frame = {
	header: FrameHeader;
	filename: ByteString;
	image: Chunk;
};

export async function decodeLine(cursor: Cursor, reader: Reader, line: Buffer): Promise<void> {
	let x = 0;
	let one = new Integer1();
	let two = new Integer1();
	while (x !== line.size()) {
		await one.load(cursor, reader);
		await two.load(cursor, reader);
		let length = two.value + 1;
		if (one.value === 0xFF) {
			let span = line.window({
				offset: x,
				length: length
			});
			await reader.read(cursor, span);
		} else {
			let span = line.window({
				offset: x,
				length: length
			});
			span.fill(one.value);
		}
		x += length;
	}
};

export const Frame = {
	async parse(cursor: Cursor, reader: Reader, options?: Partial<{ filename: ByteString }>): Promise<Frame> {
		let header = new FrameHeader();
		await header.load(cursor, reader);
		let w = header.w.value;
		let h = header.h.value;
		let filename = options?.filename ?? new ByteString();
		let image = Chunk.alloc(w * h);
		let offsets = new Array<Integer4>();
		for (let y = 0; y < h; y++) {
			let offset = new Integer4();
			await offset.load(cursor, reader);
			offsets.push(offset);
		}
		offsets.push(header.endOffset);
		for (let y = 0; y < h; y++) {
			let line = image.buffer.window({
				offset: y * w,
				length: w
			});
			await decodeLine({ offset: 0 }, new WindowedReader(reader, {
				offset: offsets[y].value + header.sizeOf(),
				length: offsets[y+1].value - offsets[y].value
			}), line);
		}
		return {
			header,
			filename,
			image
		};
	}
};
export class AnimationHeader extends Chunk {
	readonly index: Integer4;
	readonly frameCount: Integer4;
	readonly unknown0: Integer4;
	readonly unknown1: Integer4;

	constructor(options?: Partial<{ buffer: Buffer, endian: Endian }>) {
		let buffer = options?.buffer ?? Buffer.alloc(16);
		let endian = options?.endian;
		if (DEBUG) IntegerAssert.exactly(buffer.size(), 16);
		super(buffer);
		this.index = new Integer4({
			buffer: buffer.window({
				offset: 0,
				length: 4
			}),
			endian
		});
		this.frameCount = new Integer4({
			buffer: buffer.window({
				offset: 4,
				length: 4
			}),
			endian
		});
		this.unknown0 = new Integer4({
			buffer: buffer.window({
				offset: 8,
				length: 4
			}),
			endian
		});
		this.unknown1 = new Integer4({
			buffer: buffer.window({
				offset: 12,
				length: 4
			}),
			endian
		});
	}
};

export type Animation = {
	header: AnimationHeader;
	frames: Array<Frame>;
};

export const Animation = {
	async parse(cursor: Cursor, reader: Reader): Promise<Animation> {
		let header = new AnimationHeader();
		await header.load(cursor, reader);
		let filenames = new Array<ByteString>();
		for (let i = 0; i < header.frameCount.value; i++) {
			let filename = new ByteString({
				buffer: Buffer.alloc(13)
			});
			await filename.load(cursor, reader);
			filenames.push(filename);
		}
		let offsets = new Array<Integer4>();
		for (let i = 0; i < header.frameCount.value; i++) {
			let offset = new Integer4();
			await offset.load(cursor, reader);
			offsets.push(offset);
		}
		let frames = new Array<Frame>();
		for (let i = 0; i < header.frameCount.value; i++) {
			let frame = await Frame.parse({ offset: 0 }, new WindowedReader(reader, {
				offset: offsets[i].value
			}), {
				filename: filenames[i]
			});
			frames.push(frame);
		}
		return {
			header,
			frames
		};
	}
};

export class SpriteHeader extends Chunk {
	readonly type: Integer4;
	readonly width: Integer4;
	readonly height: Integer4;
	readonly animationCount: Integer4;

	constructor(options?: Partial<{ buffer: Buffer, endian: Endian }>) {
		let buffer = options?.buffer ?? Buffer.alloc(16);
		let endian = options?.endian;
		if (DEBUG) IntegerAssert.exactly(buffer.size(), 16);
		super(buffer);
		this.type = new Integer4({
			buffer: buffer.window({
				offset: 0,
				length: 4
			}),
			endian
		});
		this.width = new Integer4({
			buffer: buffer.window({
				offset: 4,
				length: 4
			}),
			endian
		});
		this.height = new Integer4({
			buffer: buffer.window({
				offset: 8,
				length: 4
			}),
			endian
		});
		this.animationCount = new Integer4({
			buffer: buffer.window({
				offset: 12,
				length: 4
			}),
			endian
		});
	}
};

export type Sprite = {
	header: SpriteHeader;
	palette: Chunk;
	animations: Array<Animation>;
};

export const Sprite = {
	async parse(cursor: Cursor, reader: Reader): Promise<Sprite> {
		let header = new SpriteHeader();
		await header.load(cursor, reader);
		let palette = Chunk.alloc(768);
		await palette.load(cursor, reader);
		let animations = new Array<Animation>();
		for (let i = 0; i < header.animationCount.value; i++) {
			let animation = await Animation.parse(cursor, reader);
			animations.push(animation);
		}
		return {
			header,
			palette,
			animations
		};
	}
};
