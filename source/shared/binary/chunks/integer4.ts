import { IntegerAssert } from "../../asserts";
import { Buffer } from "../buffer";
import { Chunk } from "../chunk";
import { Complement } from "../complement";
import { Endian } from "../endian";

export class Integer4 extends Chunk {
	private complement: Complement;
	private endian: Endian;

	get value(): number {
		let a = this.buffer.get(0);
		let b = this.buffer.get(1);
		let c = this.buffer.get(2);
		let d = this.buffer.get(3);
		let value = 0;
		if (false) {
		} else if (this.endian === "big") {
			value = ((a << 24) | (b << 16) | (c << 8) | (d << 0)) >>> 0;
		} else if (this.endian === "little") {
			value = ((d << 24) | (c << 16) | (b << 8) | (a << 0)) >>> 0;
		}
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value > 0x7FFFFFFF) {
				value -= 0xFFFFFFFF;
			}
		} else if (this.complement === "twos") {
			if (value > 0x7FFFFFFF) {
				value -= 0xFFFFFFFF + 1;
			}
		}
		return value;
	}

	set value(value: number) {
		if (false) {
		} else if (this.complement === "none") {
		} else if (this.complement === "ones") {
			if (value < 0) {
				value += 0xFFFFFFFF;
			}
		} else if (this.complement === "twos") {
			if (value < 0) {
				value += 0xFFFFFFFF + 1;
			}
		}
		IntegerAssert.between(0, value, 0xFFFFFFFF);
		if (false) {
		} else if (this.endian === "big") {
			this.buffer.set(0, (value >>> 24) & 0xFF);
			this.buffer.set(1, (value >>> 16) & 0xFF);
			this.buffer.set(2, (value >>>  8) & 0xFF);
			this.buffer.set(3, (value >>>  0) & 0xFF);
		} else if (this.endian === "little") {
			this.buffer.set(0, (value >>>  0) & 0xFF);
			this.buffer.set(1, (value >>>  8) & 0xFF);
			this.buffer.set(2, (value >>> 16) & 0xFF);
			this.buffer.set(3, (value >>> 24) & 0xFF);
		}
	}

	constructor(options?: Partial<{ buffer: Buffer, complement: Complement, endian: Endian }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		let complement = options?.complement ?? "none";
		let endian = options?.endian ?? "little";
		IntegerAssert.exactly(buffer.size(), 4);
		super(buffer);
		this.complement = complement;
		this.endian = endian;
	}
};
