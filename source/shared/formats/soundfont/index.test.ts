import { Buffer, Chunk, Cursor } from "../../binary";
import { ByteString } from "../../binary/chunks";
import { NodeFileReader, NodeFileWriter } from "../../binary.node";
import * as soundfont from "./";
import * as riff from "../riff";
import * as wave from "../wave";

async function dump(sf: soundfont.File, target: string): Promise<void> {
	for (let sample of sf.shdr) {
		let header = new wave.Header();
		header.audio_format.value = 1;
		header.channel_count.value = [0x0008, 0x8008].includes(sample.type.value) ? 2 : 1;
		header.sample_rate.value = sample.sample_rate.value;
		header.bits_per_sample.value = 16;
		header.byte_rate.value = header.sample_rate.value * header.channel_count.value * header.bits_per_sample.value / 8;
		header.block_align.value = header.channel_count.value * header.bits_per_sample.value / 8;
		let buffer = Buffer.alloc((sample.end.value - sample.start.value + 1) * 2);
		await sf.smpl.read({ offset: sample.start.value * 2 }, buffer);
		let riff_header = new riff.Header();
		riff_header.type.value = "RIFF";
		riff_header.size.value = 4 + 8 + 16 + 8 + buffer.size();
		let format = new ByteString({
			buffer: Buffer.alloc(4)
		});
		format.value = "WAVE";
		let format_riff_header = new riff.Header();
		format_riff_header.type.value = "fmt ";
		format_riff_header.size.value = 16;
		let data_riff_header = new riff.Header();
		data_riff_header.type.value = "data";
		data_riff_header.size.value = buffer.size();
		let writer = new NodeFileWriter(`./private/samples/${sample.name.value}.wav`);
		let cursor = new Cursor();
		await riff_header.save(cursor, writer);
		await format.save(cursor, writer);
		await format_riff_header.save(cursor, writer);
		await header.save(cursor, writer);
		await data_riff_header.save(cursor, writer);
		await new Chunk(buffer).save(cursor, writer);
		writer.close();
	}
};

(async () => {
	let reader = new NodeFileReader("./dist/static/gm.sf2");
	let cursor = new Cursor();
	let sf = await new soundfont.File().load(cursor, reader);
	await dump(sf, "./private/samples/");
})();
