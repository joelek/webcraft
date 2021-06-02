import { IntegerAssert, StringAssert } from "../../asserts";
import { Buffer, Chunk, Cursor, Reader, Writer } from "../../binary";
import { ByteString, Integer2, Integer4 } from "../../binary/chunks";
import { DEBUG } from "../config";

export class BitmapHeader extends Chunk {
	readonly fileIdentifier: ByteString;
	readonly fileLength: Integer4;
	readonly reservedOne: Integer2;
	readonly reservedTwo: Integer2;
	readonly pixelDataOffset: Integer4;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(14);
		if (DEBUG) IntegerAssert.exactly(buffer.size(), 14);
		super(buffer);
		this.fileIdentifier = new ByteString({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.fileLength = new Integer4({
			buffer: buffer.window({
				offset: 2,
				length: 4
			})
		});
		this.reservedOne = new Integer2({
			buffer: buffer.window({
				offset: 6,
				length: 2
			})
		});
		this.reservedTwo = new Integer2({
			buffer: buffer.window({
				offset: 8,
				length: 2
			})
		});
		this.pixelDataOffset = new Integer4({
			buffer: buffer.window({
				offset: 10,
				length: 4
			})
		});
	}
};

export class BitmapInfoHeader extends Chunk {
	readonly headerLength: Integer4;
	readonly imageWidth: Integer4;
	readonly imageHeight: Integer4;
	readonly colorPlaneCount: Integer2;
	readonly bitsPerPixel: Integer2;
	readonly compressionMethod: Integer4;
	readonly pixelArrayLength: Integer4;
	readonly horizontalResolution: Integer4;
	readonly verticalResolution: Integer4;
	readonly paletteEntryCount: Integer4;
	readonly importantColorCount: Integer4;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(40);
		if (DEBUG) IntegerAssert.exactly(buffer.size(), 40);
		super(buffer);
		this.headerLength = new Integer4({
			buffer: buffer.window({
				offset: 0,
				length: 4
			})
		});
		this.imageWidth = new Integer4({
			buffer: buffer.window({
				offset: 4,
				length: 4
			}),
			complement: "twos"
		});
		this.imageHeight = new Integer4({
			buffer: buffer.window({
				offset: 8,
				length: 4
			}),
			complement: "twos"
		});
		this.colorPlaneCount = new Integer2({
			buffer: buffer.window({
				offset: 12,
				length: 2
			})
		});
		this.bitsPerPixel = new Integer2({
			buffer: buffer.window({
				offset: 14,
				length: 2
			})
		});
		this.compressionMethod = new Integer4({
			buffer: buffer.window({
				offset: 16,
				length: 4
			})
		});
		this.pixelArrayLength = new Integer4({
			buffer: buffer.window({
				offset: 20,
				length: 4
			})
		});
		this.horizontalResolution = new Integer4({
			buffer: buffer.window({
				offset: 24,
				length: 4
			}),
			complement: "twos"
		});
		this.verticalResolution = new Integer4({
			buffer: buffer.window({
				offset: 28,
				length: 4
			}),
			complement: "twos"
		});
		this.paletteEntryCount = new Integer4({
			buffer: buffer.window({
				offset: 32,
				length: 4
			})
		});
		this.importantColorCount = new Integer4({
			buffer: buffer.window({
				offset: 36,
				length: 4
			})
		});
	}
};

export type Bitmap = {
	w: number;
	h: number;
	image: Buffer;
	palette: Buffer;
};

export function computeRowStride(bitsPerPixel: number, imageWidth: number): number {
	return ((bitsPerPixel * imageWidth + 31) >> 5) << 2;
};

export function makeGrayscalePalette(): Buffer {
	let palette = Buffer.alloc(256 * 4);
	for (let i = 0, o = 0; i < 256; i++) {
		palette.set(o++, i);
		palette.set(o++, i);
		palette.set(o++, i);
		palette.set(o++, 255);
	}
	return palette;
};

export const Bitmap = {
	async load(cursor: Cursor, reader: Reader): Promise<Bitmap> {
		let header = new BitmapHeader();
		await header.load(cursor, reader);
		if (DEBUG) StringAssert.identical(header.fileIdentifier.value, "BM");
		let infoHeader = new BitmapInfoHeader();
		await infoHeader.load(cursor, reader);
		if (DEBUG) IntegerAssert.exactly(infoHeader.headerLength.value, 40);
		let w = Math.abs(infoHeader.imageWidth.value);
		let h = Math.abs(infoHeader.imageHeight.value);
		let bitsPerPixel = infoHeader.bitsPerPixel.value;
		if (DEBUG) IntegerAssert.exactly(infoHeader.colorPlaneCount.value, 1);
		if (DEBUG) IntegerAssert.exactly(infoHeader.bitsPerPixel.value, 8);
		if (DEBUG) IntegerAssert.exactly(infoHeader.compressionMethod.value, 0);
		let palette = Buffer.alloc(256 * 4);
		await reader.read(cursor, palette);
		let image = Buffer.alloc(w * h);
		let rowStride = computeRowStride(bitsPerPixel, w);
		let pixelDataOffset = header.pixelDataOffset.value;
		if (infoHeader.imageWidth.value >= 0) {
			for (let y = 0; y < h; y++) {
				let imageRow = image.window({
					offset: y * w,
					length: w
				});
				await reader.read({ offset: pixelDataOffset + rowStride * y }, imageRow);
			}
		} else {
			for (let y = h - 1; y >= 0; y--) {
				let imageRow = image.window({
					offset: y * w,
					length: w
				});
				await reader.read({ offset: pixelDataOffset + rowStride * (h - 1 - y) }, imageRow);
			}
		}
		return {
			w,
			h,
			image,
			palette
		};
	},
	async save(bitmap: Bitmap, cursor: Cursor, writer: Writer): Promise<void> {
		let rowStride = computeRowStride(8, bitmap.w);
		let header = new BitmapHeader();
		let infoHeader = new BitmapInfoHeader();
		header.fileIdentifier.value = "BM";
		header.fileLength.value = header.sizeOf() + infoHeader.sizeOf() + bitmap.palette.size() / 3 * 4 + rowStride * bitmap.h;
		header.reservedOne.value = 0;
		header.reservedTwo.value = 0;
		header.pixelDataOffset.value = header.sizeOf() + infoHeader.sizeOf() + bitmap.palette.size() / 3 * 4;
		infoHeader.headerLength.value = 40;
		infoHeader.imageWidth.value = bitmap.w;
		infoHeader.imageHeight.value = bitmap.h;
		infoHeader.colorPlaneCount.value = 1;
		infoHeader.bitsPerPixel.value = 8;
		infoHeader.compressionMethod.value = 0;
		infoHeader.pixelArrayLength.value = rowStride * bitmap.h;
		infoHeader.horizontalResolution.value = 2835;
		infoHeader.verticalResolution.value = 2835;
		infoHeader.paletteEntryCount.value = bitmap.palette.size() / 3;
		infoHeader.importantColorCount.value = 0;
		await header.save(cursor, writer);
		await infoHeader.save(cursor, writer);
		let paletteEntryStrided = Buffer.alloc(4);
		for (let i = 0, o = 0; i < bitmap.palette.size() / 3; i++) {
			paletteEntryStrided.set(2, bitmap.palette.get(o)); o += 1
			paletteEntryStrided.set(1, bitmap.palette.get(o)); o += 1
			paletteEntryStrided.set(0, bitmap.palette.get(o)); o += 1
			paletteEntryStrided.set(3, 255);
			await writer.write(cursor, paletteEntryStrided);
		}
		let imageRowStrided = Buffer.alloc(rowStride);
		for (let y = bitmap.h - 1; y >= 0; y--) {
			let imageRow = bitmap.image.window({
				offset: y * bitmap.w,
				length: bitmap.w
			});
			imageRow.copy(imageRowStrided);
			await writer.write(cursor, imageRowStrided);
		}
	}
};
