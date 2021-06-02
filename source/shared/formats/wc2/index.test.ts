import { Buffer, Cursor, Reader } from "../../binary";
import { Integer1, Integer2, PackedInteger2 } from "../../binary/chunks";
import { NodeFileReader, NodeFileWriter } from "../../binary.node";
import * as wc2 from "./";
import { bmp } from "..";

async function decompress(cursor: Cursor, reader: Reader): Promise<Buffer> {
	let archiveRecordHeader = new wc2.ArchiveRecordHeader({ endian: "big" });
	await archiveRecordHeader.load(cursor, reader);
	let decompressed = Buffer.alloc(archiveRecordHeader.uncompressedSize.value);
	if (archiveRecordHeader.isCompressed.value) {
		let shift = 8;
		let bytesWritten = 0;
		let control = new Integer1();
		let byte = new Integer1();
		let history = Buffer.alloc(1 << 12);
		let historyPosition = 0;
		function append(byte: number): void {
			history.set(historyPosition, byte);
			historyPosition += 1;
			historyPosition %= (1 << 12);
			decompressed.set(bytesWritten, byte);
			bytesWritten += 1;
		}
		let data = new Integer2();
		let dataOffset = new PackedInteger2(data, {
			offset: 0,
			length: 12
		});
		let dataLength = new PackedInteger2(data, {
			offset: 12,
			length: 4
		});
		while (bytesWritten < decompressed.size()) {
			if (shift >= 8) {
				control.load(cursor, reader);
				shift = 0;
			}
			let bit = (control.value >> shift) & 0x01;
			shift += 1;
			if (bit) {
				byte.load(cursor, reader);
				append(byte.value);
			} else {
				await data.load(cursor, reader);
				let offset = dataOffset.value;
				let length = dataLength.value + 3;
				for (let i = offset; i < offset + length; i++) {
					append(history.get(i % (1 << 12)));
				}
			}
		}
	} else {
		reader.read(cursor, decompressed);
	}
	return decompressed;
};

const MAINDAT = {
	"LUMBER_MILL_A": 175,
	"LUMBER_MILL_H": 176,
	"OIL_PLATFORM_A": 177,
	"OIL_PLATFORM_H": 178,
	"GOLD_MINE": 179,
	"OIL_PATCH": 180,
	"RUNE_STONE": 181
};

async function loadPalette(string: string): Promise<wc2.Palette> {
	let reader = new NodeFileReader(string);
	return wc2.Palette.load(reader, new Cursor());
};

(async () => {
	let palette = await loadPalette("./private/records2/010.pal");
	let reader = new NodeFileReader("./private/records2/175");
	let sprite = await wc2.Sprite.load(reader, new Cursor());
	for (let [index, frame] of sprite.frames.entries()) {
		let writer = new NodeFileWriter("./private/frame[" + index.toString().padStart(3, "0") + "].bmp");
		let bitmap: bmp.Bitmap = {
			w: frame.header.w.value,
			h: frame.header.h.value,
			image: frame.image,
			palette: palette
		};
		await bmp.Bitmap.save(bitmap, new Cursor(), writer);
	}
})();
