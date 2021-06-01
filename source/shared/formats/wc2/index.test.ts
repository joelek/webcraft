import { Buffer, Cursor, Reader } from "../../binary";
import { Integer1, Integer2, PackedInteger2 } from "../../binary/chunks";
import { NodeFileReader, NodeFileWriter } from "../../binary.node";
import * as wc2 from "./";

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
}

(async () => {
	let reader = new NodeFileReader("./private/records2/167");
	let sprite = await wc2.Sprite.parse(reader, new Cursor());
	let writer = new NodeFileWriter("./private/test.img");
	await writer.write(new Cursor(), sprite.frames[0].image);
})();
