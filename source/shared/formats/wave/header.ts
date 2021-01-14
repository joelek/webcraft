import { IntegerAssert } from "../../asserts";
import { Buffer, Chunk } from "../../binary";
import { Integer2, Integer4 } from "../../binary/chunks";

export class Header extends Chunk {
	readonly audio_format: Integer2;
	readonly channel_count: Integer2;
	readonly sample_rate: Integer4;
	readonly byte_rate: Integer4;
	readonly block_align: Integer2;
	readonly bits_per_sample: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(16);
		IntegerAssert.exactly(buffer.size(), 16);
		super(buffer);
		this.audio_format = new Integer2({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.channel_count = new Integer2({
			buffer: buffer.window({
				offset: 2,
				length: 2
			})
		});
		this.sample_rate = new Integer4({
			buffer: buffer.window({
				offset: 4,
				length: 4
			})
		});
		this.byte_rate = new Integer4({
			buffer: buffer.window({
				offset: 8,
				length: 4
			})
		});
		this.block_align = new Integer2({
			buffer: buffer.window({
				offset: 12,
				length: 2
			})
		});
		this.bits_per_sample = new Integer2({
			buffer: buffer.window({
				offset: 14,
				length: 2
			})
		});
	}
};
