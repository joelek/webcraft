import { Integer4 } from "./integer4";
import { IntegerAssert } from "../../asserts";

export class PackedInteger4 {
	private integer: Integer4;
	private offset: number;
	private length: number;

	get value(): number {
		let a = 32 - this.offset - this.length;
		let b = 32 - this.length;
		return (this.integer.value << a) >>> b;
	}

	set value(value: number) {
		let a = this.offset;
		let b = 32 - this.length;
		let c = 32 - this.offset - this.length;
		let m = ((0xFFFFFFFF >> a) << b) >>> c;
		IntegerAssert.between(0, value, m >>> a);
		this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
	}

	constructor(integer: Integer4, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? 32 - offset;
		IntegerAssert.between(0, offset, 32);
		IntegerAssert.between(0, length, 32 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
};
