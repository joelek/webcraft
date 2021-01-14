import { Buffer } from "../buffer";
import { Chunk } from "../chunk";

export class ByteString extends Chunk {
	private getContinuationByte(index: number): number {
		let byte = this.buffer.get(index);
		if ((byte & 0b11000000) !== 0b10000000) {
			throw `Expected ${byte} to be a continuation byte!`;
		}
		return byte & 0b00111111;
	}

	private encode(value: string, write: (byte: number) => void): void {
		let i = 0;
		while (i < value.length) {
			let cp = value.codePointAt(i++) ?? 0;
			if (cp >= 0xD800 && cp <= 0xDFFF) {
				throw `Expected ${cp} to be a non-surrogate code point!`;
			}
			if (cp < 0x0080) {
				write(((cp >>  0) & 0b01111111) | 0b00000000);
			} else if (cp < 0x0800) {
				write(((cp >>  6) & 0b00011111) | 0b11000000);
				write(((cp >>  0) & 0b00111111) | 0b10000000);
			} else if (cp < 0x10000) {
				write(((cp >> 12) & 0b00001111) | 0b11100000);
				write(((cp >>  6) & 0b00111111) | 0b10000000);
				write(((cp >>  0) & 0b00111111) | 0b10000000);
			} else {
				i += 1;
				write(((cp >> 18) & 0b00000111) | 0b11110000);
				write(((cp >> 12) & 0b00111111) | 0b10000000);
				write(((cp >>  6) & 0b00111111) | 0b10000000);
				write(((cp >>  0) & 0b00111111) | 0b10000000);
			}
		}
	}

	get value(): string {
		let value = "";
		let i = 0;
		while (i < this.buffer.size()) {
			let byte = this.buffer.get(i++);
			let cp = 0;
			if ((byte & 0b10000000) === 0b00000000) {
				let a = byte & 0b01111111;
				cp = (a << 0);
			} else if ((byte & 0b11100000) === 0b11000000) {
				let a = byte & 0b00011111;
				let b = this.getContinuationByte(i++);
				cp = (a << 6) | (b << 0);
			} else if ((byte & 0b11110000) === 0b11100000) {
				let a = byte & 0b00001111;
				let b = this.getContinuationByte(i++);
				let c = this.getContinuationByte(i++);
				cp = (a << 12) | (b << 6) | (c << 0);
			} else if ((byte & 0b11111000) === 0b11110000) {
				let a = byte & 0b00000111;
				let b = this.getContinuationByte(i++);
				let c = this.getContinuationByte(i++);
				let d = this.getContinuationByte(i++);
				cp = (a << 18) | (b << 12) | (c << 6) | (d << 0);
			} else {
				throw `Expected ${byte} to be a starting byte!`;
			}
			if (cp === 0) {
				break;
			}
			value += String.fromCodePoint(cp);
		}
		return value;
	}

	set value(value: string) {
		let length = 0;
		this.encode(value, (byte) => {
			length += 1;
		});
		if (length > this.buffer.size()) {
			throw `Expected "${value}" to be encoded using at most ${this.buffer.size()} bytes!`;
		}
		let i = 0;
		this.encode(value, (byte) => {
			this.buffer.set(i++, byte);
		});
		while (i < this.buffer.size()) {
			this.buffer.set(i++, 0);
		}
	}

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(0);
		super(buffer);
	}
};
