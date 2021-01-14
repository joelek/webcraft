import { IntegerAssert } from "../../asserts";
import { Buffer } from "../buffer";
import { Chunk } from "../chunk";
import { Complement } from "../complement";
import { Endian } from "../endian";

export class Integer1 extends Chunk {
	private complement: Complement;

	get value(): number {
		let value = this.buffer.get(0);
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value > 0x7F) {
				value -= 0xFF;
			}
		} else if (this.complement === "twos") {
			if (value > 0x7F) {
				value -= 0xFF + 1;
			}
		}
		return value;
	}

	set value(value: number) {
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value < 0) {
				value += 0xFF;
			}
		} else if (this.complement === "twos") {
			if (value < 0) {
				value += 0xFF + 1;
			}
		}
		IntegerAssert.between(0, value, 0xFF);
		this.buffer.set(0, value);
	}

	constructor(options?: Partial<{ buffer: Buffer, complement: Complement }>) {
		let buffer = options?.buffer ?? Buffer.alloc(1);
		let complement = options?.complement ?? "none";
		IntegerAssert.exactly(buffer.size(), 1);
		super(buffer);
		this.complement = complement;
	}
};
