import { IntegerAssert } from "../../asserts";
import { Buffer, Chunk } from "../../binary";
import { ByteString, Integer4 } from "../../binary/chunks";

export class Header extends Chunk {
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
			buffer: buffer.window({ offset: 4, length: 4 })
		});
	}
};
