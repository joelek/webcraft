import { IntegerAssert } from "../asserts";

export class Cursor {
	offset: number;

	constructor(options?: Partial<{ offset: number }>) {
		let offset = options?.offset ?? 0;
		IntegerAssert.atLeast(0, offset);
		this.offset = offset;
	}
};
