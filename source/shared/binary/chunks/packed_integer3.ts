import { Integer3 } from "./integer3";
import { IntegerAssert } from "../../asserts";

export class PackedInteger3 {
	private integer: Integer3;
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
		let m = ((0xFFFFFF >> a) << b) >>> c;
		IntegerAssert.between(0, value, m >>> a);
		this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
	}

	constructor(integer: Integer3, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? 24 - offset;
		IntegerAssert.between(0, offset, 24);
		IntegerAssert.between(0, length, 24 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
};
