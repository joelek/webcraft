import { Integer2 } from "./integer2";
import { IntegerAssert } from "../../asserts";

export class PackedInteger2 {
	private integer: Integer2;
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
		let m = ((0xFFFF >> a) << b) >>> c;
		IntegerAssert.between(0, value, m >>> a);
		this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
	}

	constructor(integer: Integer2, options?: Partial<{ offset: number, length: number }>) {
		let offset = options?.offset ?? 0;
		let length = options?.length ?? 16 - offset;
		IntegerAssert.between(0, offset, 16);
		IntegerAssert.between(0, length, 16 - offset);
		this.integer = integer;
		this.offset = offset;
		this.length = length;
	}
};
