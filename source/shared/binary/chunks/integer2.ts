import { IntegerAssert } from "../../asserts";
import { Buffer } from "../buffer";
import { Chunk } from "../chunk";
import { Complement } from "../complement";
import { Endian } from "../endian";

export class Integer2 extends Chunk {
	private complement: Complement;
	private endian: Endian;

	get value(): number {
		let a = this.buffer.get(0);
		let b = this.buffer.get(1);
		let value = 0;
		if (false) {
		} else if (this.endian === "big") {
			value = ((a << 8) | (b << 0)) >>> 0;
		} else if (this.endian === "little") {
			value = ((b << 8) | (a << 0)) >>> 0;
		}
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value > 0x7FFF) {
				value -= 0xFFFF;
			}
		} else if (this.complement === "twos") {
			if (value > 0x7FFF) {
				value -= 0xFFFF + 1;
			}
		}
		return value;
	}

	set value(value: number) {
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value < 0) {
				value += 0xFFFF;
			}
		} else if (this.complement === "twos") {
			if (value < 0) {
				value += 0xFFFF + 1;
			}
		}
		IntegerAssert.between(0, value, 0xFFFF);
		if (false) {
		} else if (this.endian === "big") {
			this.buffer.set(0, (value >>>  8) & 0xFF);
			this.buffer.set(1, (value >>>  0) & 0xFF);
		} else if (this.endian === "little") {
			this.buffer.set(0, (value >>>  0) & 0xFF);
			this.buffer.set(1, (value >>>  8) & 0xFF);
		}
	}

	constructor(options?: Partial<{ buffer: Buffer, complement: Complement, endian: Endian }>) {
		let buffer = options?.buffer ?? Buffer.alloc(2);
		let complement = options?.complement ?? "none";
		let endian = options?.endian ?? "little";
		IntegerAssert.exactly(buffer.size(), 2);
		super(buffer);
		this.complement = complement;
		this.endian = endian;
	}
};
