var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
define("shared/asserts/integer", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IntegerAssert = void 0;
    class IntegerAssert {
        constructor() { }
        static atLeast(min, value) {
            this.integer(min);
            this.integer(value);
            if (value < min) {
                throw `Expected ${value} to be at least ${min}!`;
            }
        }
        static atMost(max, value) {
            this.integer(value);
            this.integer(max);
            if (value > max) {
                throw `Expected ${value} to be at most ${max}!`;
            }
        }
        static between(min, value, max) {
            this.atLeast(min, value);
            this.atMost(max, value);
        }
        static exactly(value, expected) {
            this.integer(expected);
            this.integer(value);
            if (value !== expected) {
                throw `Expected ${value} to be exactly ${expected}!`;
            }
        }
        static integer(value) {
            if (!Number.isInteger(value)) {
                throw `Expected ${value} to be an integer!`;
            }
        }
    }
    exports.IntegerAssert = IntegerAssert;
    ;
});
define("shared/asserts/string", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StringAssert = void 0;
    class StringAssert {
        constructor() { }
        static identical(value, expected) {
            if (value !== expected) {
                throw `Expected "${value}" to be identical to ${expected}!`;
            }
        }
    }
    exports.StringAssert = StringAssert;
    ;
});
define("shared/asserts/index", ["require", "exports", "shared/asserts/integer", "shared/asserts/string"], function (require, exports, integer_1, string_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    }));
    var __exportStar = (this && this.__exportStar) || function (m, exports) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
                __createBinding(exports, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(integer_1, exports);
    __exportStar(string_1, exports);
});
define("shared/binary/buffer", ["require", "exports", "shared/asserts/index"], function (require, exports, asserts_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Buffer = void 0;
    class Buffer {
        array;
        constructor(buffer, options) {
            let offset = options?.offset ?? 0;
            let length = options?.length ?? buffer.byteLength - offset;
            asserts_1.IntegerAssert.between(0, offset, buffer.byteLength);
            asserts_1.IntegerAssert.between(0, length, buffer.byteLength - offset);
            this.array = new Uint8Array(buffer, offset, length);
        }
        copy(target) {
            asserts_1.IntegerAssert.atLeast(this.size(), target.size());
            target.array.set(this.array);
            return target;
        }
        fill(value) {
            asserts_1.IntegerAssert.between(0, value, 255);
            this.array.fill(value);
        }
        get(index) {
            asserts_1.IntegerAssert.between(0, index, this.array.length - 1);
            return this.array[index];
        }
        place(array) {
            asserts_1.IntegerAssert.atMost(this.array.length, array.length);
            this.array.set(array);
        }
        set(index, value) {
            asserts_1.IntegerAssert.between(0, index, this.array.length - 1);
            asserts_1.IntegerAssert.between(0, value, 255);
            return this.array[index] = value;
        }
        size() {
            return this.array.length;
        }
        window(options) {
            let offset = options?.offset ?? 0;
            let length = options?.length ?? this.array.length - offset;
            return new Buffer(this.array.buffer, {
                offset: this.array.byteOffset + offset,
                length: length
            });
        }
        static alloc(length) {
            asserts_1.IntegerAssert.atLeast(0, length);
            let buffer = new ArrayBuffer(length);
            return new Buffer(buffer);
        }
    }
    exports.Buffer = Buffer;
    ;
});
define("shared/binary/chunk", ["require", "exports", "shared/asserts/index", "shared/binary/buffer"], function (require, exports, asserts_1, buffer_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Chunk = void 0;
    class Chunk {
        buffer;
        constructor(buffer) {
            this.buffer = buffer;
        }
        async load(cursor, reader) {
            await reader.read(cursor, this.buffer);
            return this;
        }
        async save(cursor, writer) {
            await writer.write(cursor, this.buffer);
            return this;
        }
        sizeOf() {
            return this.buffer.size();
        }
        static alloc(length) {
            asserts_1.IntegerAssert.atLeast(0, length);
            let buffer = new ArrayBuffer(length);
            return new Chunk(new buffer_1.Buffer(buffer));
        }
    }
    exports.Chunk = Chunk;
    ;
});
define("shared/binary/chunks/bytestring", ["require", "exports", "shared/binary/buffer", "shared/binary/chunk"], function (require, exports, buffer_1, chunk_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ByteString = void 0;
    class ByteString extends chunk_1.Chunk {
        getContinuationByte(index) {
            let byte = this.buffer.get(index);
            if ((byte & 0b11000000) !== 0b10000000) {
                throw `Expected ${byte} to be a continuation byte!`;
            }
            return byte & 0b00111111;
        }
        encode(value, write) {
            let i = 0;
            while (i < value.length) {
                let cp = value.codePointAt(i++) ?? 0;
                if (cp >= 0xD800 && cp <= 0xDFFF) {
                    throw `Expected ${cp} to be a non-surrogate code point!`;
                }
                if (cp < 0x0080) {
                    write(((cp >> 0) & 0b01111111) | 0b00000000);
                }
                else if (cp < 0x0800) {
                    write(((cp >> 6) & 0b00011111) | 0b11000000);
                    write(((cp >> 0) & 0b00111111) | 0b10000000);
                }
                else if (cp < 0x10000) {
                    write(((cp >> 12) & 0b00001111) | 0b11100000);
                    write(((cp >> 6) & 0b00111111) | 0b10000000);
                    write(((cp >> 0) & 0b00111111) | 0b10000000);
                }
                else {
                    i += 1;
                    write(((cp >> 18) & 0b00000111) | 0b11110000);
                    write(((cp >> 12) & 0b00111111) | 0b10000000);
                    write(((cp >> 6) & 0b00111111) | 0b10000000);
                    write(((cp >> 0) & 0b00111111) | 0b10000000);
                }
            }
        }
        get value() {
            let value = "";
            let i = 0;
            while (i < this.buffer.size()) {
                let byte = this.buffer.get(i++);
                let cp = 0;
                if ((byte & 0b10000000) === 0b00000000) {
                    let a = byte & 0b01111111;
                    cp = (a << 0);
                }
                else if ((byte & 0b11100000) === 0b11000000) {
                    let a = byte & 0b00011111;
                    let b = this.getContinuationByte(i++);
                    cp = (a << 6) | (b << 0);
                }
                else if ((byte & 0b11110000) === 0b11100000) {
                    let a = byte & 0b00001111;
                    let b = this.getContinuationByte(i++);
                    let c = this.getContinuationByte(i++);
                    cp = (a << 12) | (b << 6) | (c << 0);
                }
                else if ((byte & 0b11111000) === 0b11110000) {
                    let a = byte & 0b00000111;
                    let b = this.getContinuationByte(i++);
                    let c = this.getContinuationByte(i++);
                    let d = this.getContinuationByte(i++);
                    cp = (a << 18) | (b << 12) | (c << 6) | (d << 0);
                }
                else {
                    throw `Expected ${byte} to be a starting byte!`;
                }
                if (cp === 0) {
                    break;
                }
                value += String.fromCodePoint(cp);
            }
            return value;
        }
        set value(value) {
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
        constructor(options) {
            let buffer = options?.buffer ?? buffer_1.Buffer.alloc(0);
            super(buffer);
        }
    }
    exports.ByteString = ByteString;
    ;
});
define("shared/binary/chunks/integer1", ["require", "exports", "shared/asserts/index", "shared/binary/buffer", "shared/binary/chunk"], function (require, exports, asserts_1, buffer_1, chunk_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Integer1 = void 0;
    class Integer1 extends chunk_1.Chunk {
        complement;
        get value() {
            let value = this.buffer.get(0);
            if (false) {
            }
            else if (this.complement === "none") {
            }
            else if (this.complement === "ones") {
                if (value > 0x7F) {
                    value -= 0xFF;
                }
            }
            else if (this.complement === "twos") {
                if (value > 0x7F) {
                    value -= 0xFF + 1;
                }
            }
            return value;
        }
        set value(value) {
            if (false) {
            }
            else if (this.complement === "none") {
            }
            else if (this.complement === "ones") {
                if (value < 0) {
                    value += 0xFF;
                }
            }
            else if (this.complement === "twos") {
                if (value < 0) {
                    value += 0xFF + 1;
                }
            }
            asserts_1.IntegerAssert.between(0, value, 0xFF);
            this.buffer.set(0, value);
        }
        constructor(options) {
            let buffer = options?.buffer ?? buffer_1.Buffer.alloc(1);
            let complement = options?.complement ?? "none";
            asserts_1.IntegerAssert.exactly(buffer.size(), 1);
            super(buffer);
            this.complement = complement;
        }
    }
    exports.Integer1 = Integer1;
    ;
});
define("shared/binary/chunks/integer2", ["require", "exports", "shared/asserts/index", "shared/binary/buffer", "shared/binary/chunk"], function (require, exports, asserts_1, buffer_1, chunk_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Integer2 = void 0;
    class Integer2 extends chunk_1.Chunk {
        complement;
        endian;
        get value() {
            let a = this.buffer.get(0);
            let b = this.buffer.get(1);
            let value = 0;
            if (false) {
            }
            else if (this.endian === "big") {
                value = ((a << 8) | (b << 0)) >>> 0;
            }
            else if (this.endian === "little") {
                value = ((b << 8) | (a << 0)) >>> 0;
            }
            if (false) {
            }
            else if (this.complement === "none") {
            }
            else if (this.complement === "ones") {
                if (value > 0x7FFF) {
                    value -= 0xFFFF;
                }
            }
            else if (this.complement === "twos") {
                if (value > 0x7FFF) {
                    value -= 0xFFFF + 1;
                }
            }
            return value;
        }
        set value(value) {
            if (false) {
            }
            else if (this.complement === "none") {
            }
            else if (this.complement === "ones") {
                if (value < 0) {
                    value += 0xFFFF;
                }
            }
            else if (this.complement === "twos") {
                if (value < 0) {
                    value += 0xFFFF + 1;
                }
            }
            asserts_1.IntegerAssert.between(0, value, 0xFFFF);
            if (false) {
            }
            else if (this.endian === "big") {
                this.buffer.set(0, (value >>> 8) & 0xFF);
                this.buffer.set(1, (value >>> 0) & 0xFF);
            }
            else if (this.endian === "little") {
                this.buffer.set(0, (value >>> 0) & 0xFF);
                this.buffer.set(1, (value >>> 8) & 0xFF);
            }
        }
        constructor(options) {
            let buffer = options?.buffer ?? buffer_1.Buffer.alloc(2);
            let complement = options?.complement ?? "none";
            let endian = options?.endian ?? "little";
            asserts_1.IntegerAssert.exactly(buffer.size(), 2);
            super(buffer);
            this.complement = complement;
            this.endian = endian;
        }
    }
    exports.Integer2 = Integer2;
    ;
});
define("shared/binary/chunks/integer3", ["require", "exports", "shared/asserts/index", "shared/binary/buffer", "shared/binary/chunk"], function (require, exports, asserts_1, buffer_1, chunk_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Integer3 = void 0;
    class Integer3 extends chunk_1.Chunk {
        complement;
        endian;
        get value() {
            let a = this.buffer.get(0);
            let b = this.buffer.get(1);
            let c = this.buffer.get(2);
            let value = 0;
            if (false) {
            }
            else if (this.endian === "big") {
                value = ((a << 16) | (b << 8) | (c << 0)) >>> 0;
            }
            else if (this.endian === "little") {
                value = ((c << 16) | (b << 8) | (a << 0)) >>> 0;
            }
            if (false) {
            }
            else if (this.complement === "none") {
            }
            else if (this.complement === "ones") {
                if (value > 0x7FFFFF) {
                    value -= 0xFFFFFF;
                }
            }
            else if (this.complement === "twos") {
                if (value > 0x7FFFFF) {
                    value -= 0xFFFFFF + 1;
                }
            }
            return value;
        }
        set value(value) {
            if (false) {
            }
            else if (this.complement === "none") {
            }
            else if (this.complement === "ones") {
                if (value < 0) {
                    value += 0xFFFFFF;
                }
            }
            else if (this.complement === "twos") {
                if (value < 0) {
                    value += 0xFFFFFF + 1;
                }
            }
            asserts_1.IntegerAssert.between(0, value, 0xFFFFFF);
            if (false) {
            }
            else if (this.endian === "big") {
                this.buffer.set(0, (value >>> 16) & 0xFF);
                this.buffer.set(1, (value >>> 8) & 0xFF);
                this.buffer.set(2, (value >>> 0) & 0xFF);
            }
            else if (this.endian === "little") {
                this.buffer.set(0, (value >>> 0) & 0xFF);
                this.buffer.set(1, (value >>> 8) & 0xFF);
                this.buffer.set(2, (value >>> 16) & 0xFF);
            }
        }
        constructor(options) {
            let buffer = options?.buffer ?? buffer_1.Buffer.alloc(3);
            let complement = options?.complement ?? "none";
            let endian = options?.endian ?? "little";
            asserts_1.IntegerAssert.exactly(buffer.size(), 3);
            super(buffer);
            this.complement = complement;
            this.endian = endian;
        }
    }
    exports.Integer3 = Integer3;
    ;
});
define("shared/binary/chunks/integer4", ["require", "exports", "shared/asserts/index", "shared/binary/buffer", "shared/binary/chunk"], function (require, exports, asserts_1, buffer_1, chunk_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Integer4 = void 0;
    class Integer4 extends chunk_1.Chunk {
        complement;
        endian;
        get value() {
            let a = this.buffer.get(0);
            let b = this.buffer.get(1);
            let c = this.buffer.get(2);
            let d = this.buffer.get(3);
            let value = 0;
            if (false) {
            }
            else if (this.endian === "big") {
                value = ((a << 24) | (b << 16) | (c << 8) | (d << 0)) >>> 0;
            }
            else if (this.endian === "little") {
                value = ((d << 24) | (c << 16) | (b << 8) | (a << 0)) >>> 0;
            }
            if (false) {
            }
            else if (this.complement === "none") {
            }
            else if (this.complement === "ones") {
                if (value > 0x7FFFFFFF) {
                    value -= 0xFFFFFFFF;
                }
            }
            else if (this.complement === "twos") {
                if (value > 0x7FFFFFFF) {
                    value -= 0xFFFFFFFF + 1;
                }
            }
            return value;
        }
        set value(value) {
            if (false) {
            }
            else if (this.complement === "none") {
            }
            else if (this.complement === "ones") {
                if (value < 0) {
                    value += 0xFFFFFFFF;
                }
            }
            else if (this.complement === "twos") {
                if (value < 0) {
                    value += 0xFFFFFFFF + 1;
                }
            }
            asserts_1.IntegerAssert.between(0, value, 0xFFFFFFFF);
            if (false) {
            }
            else if (this.endian === "big") {
                this.buffer.set(0, (value >>> 24) & 0xFF);
                this.buffer.set(1, (value >>> 16) & 0xFF);
                this.buffer.set(2, (value >>> 8) & 0xFF);
                this.buffer.set(3, (value >>> 0) & 0xFF);
            }
            else if (this.endian === "little") {
                this.buffer.set(0, (value >>> 0) & 0xFF);
                this.buffer.set(1, (value >>> 8) & 0xFF);
                this.buffer.set(2, (value >>> 16) & 0xFF);
                this.buffer.set(3, (value >>> 24) & 0xFF);
            }
        }
        constructor(options) {
            let buffer = options?.buffer ?? buffer_1.Buffer.alloc(4);
            let complement = options?.complement ?? "none";
            let endian = options?.endian ?? "little";
            asserts_1.IntegerAssert.exactly(buffer.size(), 4);
            super(buffer);
            this.complement = complement;
            this.endian = endian;
        }
    }
    exports.Integer4 = Integer4;
    ;
});
define("shared/binary/chunks/packed_integer1", ["require", "exports", "shared/asserts/index"], function (require, exports, asserts_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PackedInteger1 = void 0;
    class PackedInteger1 {
        integer;
        offset;
        length;
        get value() {
            let a = 32 - this.offset - this.length;
            let b = 32 - this.length;
            return (this.integer.value << a) >>> b;
        }
        set value(value) {
            let a = this.offset;
            let b = 32 - this.length;
            let c = 32 - this.offset - this.length;
            let m = ((0xFF >> a) << b) >>> c;
            asserts_1.IntegerAssert.between(0, value, m >>> a);
            this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
        }
        constructor(integer, options) {
            let offset = options?.offset ?? 0;
            let length = options?.length ?? 8 - offset;
            asserts_1.IntegerAssert.between(0, offset, 8);
            asserts_1.IntegerAssert.between(0, length, 8 - offset);
            this.integer = integer;
            this.offset = offset;
            this.length = length;
        }
    }
    exports.PackedInteger1 = PackedInteger1;
    ;
});
define("shared/binary/chunks/packed_integer2", ["require", "exports", "shared/asserts/index"], function (require, exports, asserts_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PackedInteger2 = void 0;
    class PackedInteger2 {
        integer;
        offset;
        length;
        get value() {
            let a = 32 - this.offset - this.length;
            let b = 32 - this.length;
            return (this.integer.value << a) >>> b;
        }
        set value(value) {
            let a = this.offset;
            let b = 32 - this.length;
            let c = 32 - this.offset - this.length;
            let m = ((0xFFFF >> a) << b) >>> c;
            asserts_1.IntegerAssert.between(0, value, m >>> a);
            this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
        }
        constructor(integer, options) {
            let offset = options?.offset ?? 0;
            let length = options?.length ?? 16 - offset;
            asserts_1.IntegerAssert.between(0, offset, 16);
            asserts_1.IntegerAssert.between(0, length, 16 - offset);
            this.integer = integer;
            this.offset = offset;
            this.length = length;
        }
    }
    exports.PackedInteger2 = PackedInteger2;
    ;
});
define("shared/binary/chunks/packed_integer3", ["require", "exports", "shared/asserts/index"], function (require, exports, asserts_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PackedInteger3 = void 0;
    class PackedInteger3 {
        integer;
        offset;
        length;
        get value() {
            let a = 32 - this.offset - this.length;
            let b = 32 - this.length;
            return (this.integer.value << a) >>> b;
        }
        set value(value) {
            let a = this.offset;
            let b = 32 - this.length;
            let c = 32 - this.offset - this.length;
            let m = ((0xFFFFFF >> a) << b) >>> c;
            asserts_1.IntegerAssert.between(0, value, m >>> a);
            this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
        }
        constructor(integer, options) {
            let offset = options?.offset ?? 0;
            let length = options?.length ?? 24 - offset;
            asserts_1.IntegerAssert.between(0, offset, 24);
            asserts_1.IntegerAssert.between(0, length, 24 - offset);
            this.integer = integer;
            this.offset = offset;
            this.length = length;
        }
    }
    exports.PackedInteger3 = PackedInteger3;
    ;
});
define("shared/binary/chunks/packed_integer4", ["require", "exports", "shared/asserts/index"], function (require, exports, asserts_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PackedInteger4 = void 0;
    class PackedInteger4 {
        integer;
        offset;
        length;
        get value() {
            let a = 32 - this.offset - this.length;
            let b = 32 - this.length;
            return (this.integer.value << a) >>> b;
        }
        set value(value) {
            let a = this.offset;
            let b = 32 - this.length;
            let c = 32 - this.offset - this.length;
            let m = ((0xFFFFFFFF >> a) << b) >>> c;
            asserts_1.IntegerAssert.between(0, value, m >>> a);
            this.integer.value = ((this.integer.value & ~m) | ((value << a) & m)) >>> 0;
        }
        constructor(integer, options) {
            let offset = options?.offset ?? 0;
            let length = options?.length ?? 32 - offset;
            asserts_1.IntegerAssert.between(0, offset, 32);
            asserts_1.IntegerAssert.between(0, length, 32 - offset);
            this.integer = integer;
            this.offset = offset;
            this.length = length;
        }
    }
    exports.PackedInteger4 = PackedInteger4;
    ;
});
define("shared/binary/chunks/index", ["require", "exports", "shared/binary/chunks/bytestring", "shared/binary/chunks/integer1", "shared/binary/chunks/integer2", "shared/binary/chunks/integer3", "shared/binary/chunks/integer4", "shared/binary/chunks/packed_integer1", "shared/binary/chunks/packed_integer2", "shared/binary/chunks/packed_integer3", "shared/binary/chunks/packed_integer4"], function (require, exports, bytestring_1, integer1_1, integer2_1, integer3_1, integer4_1, packed_integer1_1, packed_integer2_1, packed_integer3_1, packed_integer4_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    }));
    var __exportStar = (this && this.__exportStar) || function (m, exports) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
                __createBinding(exports, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(bytestring_1, exports);
    __exportStar(integer1_1, exports);
    __exportStar(integer2_1, exports);
    __exportStar(integer3_1, exports);
    __exportStar(integer4_1, exports);
    __exportStar(packed_integer1_1, exports);
    __exportStar(packed_integer2_1, exports);
    __exportStar(packed_integer3_1, exports);
    __exportStar(packed_integer4_1, exports);
});
define("shared/binary/complement", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("shared/binary/cursor", ["require", "exports", "shared/asserts/index"], function (require, exports, asserts_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Cursor = void 0;
    class Cursor {
        offset;
        constructor(options) {
            let offset = options?.offset ?? 0;
            asserts_1.IntegerAssert.atLeast(0, offset);
            this.offset = offset;
        }
    }
    exports.Cursor = Cursor;
    ;
});
define("shared/binary/endian", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("shared/binary/loadable", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ;
});
define("shared/is", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.is = void 0;
    var is;
    (function (is) {
        function absent(subject) {
            return subject == null;
        }
        is.absent = absent;
        ;
        function present(subject) {
            return subject != null;
        }
        is.present = present;
        ;
    })(is = exports.is || (exports.is = {}));
    ;
});
define("shared/binary/reader", ["require", "exports", "shared/asserts/index", "shared/is", "shared/binary/buffer", "shared/binary/cursor"], function (require, exports, asserts_1, is_1, buffer_1, cursor_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WindowedReader = exports.CachedReader = exports.BufferReader = void 0;
    ;
    class BufferReader {
        buffer;
        constructor(options) {
            let buffer = options?.buffer ?? buffer_1.Buffer.alloc(0);
            this.buffer = buffer;
        }
        async read(cursor, target) {
            let window = this.buffer.window({
                offset: cursor.offset,
                length: target.size()
            });
            window.copy(target);
            cursor.offset += target.size();
            return target;
        }
        size() {
            return this.buffer.size();
        }
    }
    exports.BufferReader = BufferReader;
    ;
    class CachedReader {
        reader;
        cached;
        constructor(reader) {
            this.reader = reader;
            this.cached = undefined;
        }
        async read(cursor, target) {
            if (is_1.is.absent(this.cached)) {
                let buffer = buffer_1.Buffer.alloc(this.reader.size());
                this.reader.read(new cursor_1.Cursor(), buffer);
                this.cached = new BufferReader({
                    buffer: buffer
                });
            }
            return this.cached.read(cursor, target);
        }
        size() {
            return this.reader.size();
        }
    }
    exports.CachedReader = CachedReader;
    ;
    class WindowedReader {
        reader;
        offset;
        length;
        constructor(reader, options) {
            let offset = options?.offset ?? 0;
            let length = options?.length ?? reader.size() - offset;
            asserts_1.IntegerAssert.between(0, offset, reader.size());
            asserts_1.IntegerAssert.between(0, length, reader.size() - offset);
            this.reader = reader;
            this.offset = offset;
            this.length = length;
        }
        async read(cursor, buffer) {
            let offset = cursor.offset;
            let length = buffer.size();
            asserts_1.IntegerAssert.between(0, offset, this.length);
            asserts_1.IntegerAssert.between(0, length, this.length);
            await this.reader.read({ offset: this.offset + offset }, buffer);
            cursor.offset += length;
            return buffer;
        }
        size() {
            return this.length;
        }
    }
    exports.WindowedReader = WindowedReader;
    ;
});
define("shared/binary/saveable", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ;
});
define("shared/binary/writer", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ;
});
define("shared/binary/index", ["require", "exports", "shared/binary/chunks/index", "shared/binary/buffer", "shared/binary/chunk", "shared/binary/complement", "shared/binary/cursor", "shared/binary/endian", "shared/binary/loadable", "shared/binary/reader", "shared/binary/saveable", "shared/binary/writer"], function (require, exports, chunks, buffer_1, chunk_1, complement_1, cursor_1, endian_1, loadable_1, reader_1, saveable_1, writer_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.chunks = void 0;
    var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    }));
    var __exportStar = (this && this.__exportStar) || function (m, exports) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
                __createBinding(exports, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.chunks = void 0;
    exports.chunks = chunks;
    __exportStar(buffer_1, exports);
    __exportStar(chunk_1, exports);
    __exportStar(complement_1, exports);
    __exportStar(cursor_1, exports);
    __exportStar(endian_1, exports);
    __exportStar(loadable_1, exports);
    __exportStar(reader_1, exports);
    __exportStar(saveable_1, exports);
    __exportStar(writer_1, exports);
});
define("shared/formats/config", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEBUG = void 0;
    exports.DEBUG = false;
});
define("shared/formats/bmp/index", ["require", "exports", "shared/asserts/index", "shared/binary/index", "shared/binary/chunks/index", "shared/formats/config"], function (require, exports, asserts_1, binary_1, chunks_1, config_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Bitmap = exports.makeGrayscalePalette = exports.computeRowStride = exports.BitmapInfoHeader = exports.BitmapHeader = void 0;
    class BitmapHeader extends binary_1.Chunk {
        fileIdentifier;
        fileLength;
        reservedOne;
        reservedTwo;
        pixelDataOffset;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(14);
            if (config_1.DEBUG)
                asserts_1.IntegerAssert.exactly(buffer.size(), 14);
            super(buffer);
            this.fileIdentifier = new chunks_1.ByteString({
                buffer: buffer.window({
                    offset: 0,
                    length: 2
                })
            });
            this.fileLength = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 2,
                    length: 4
                })
            });
            this.reservedOne = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 6,
                    length: 2
                })
            });
            this.reservedTwo = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 8,
                    length: 2
                })
            });
            this.pixelDataOffset = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 10,
                    length: 4
                })
            });
        }
    }
    exports.BitmapHeader = BitmapHeader;
    ;
    class BitmapInfoHeader extends binary_1.Chunk {
        headerLength;
        imageWidth;
        imageHeight;
        colorPlaneCount;
        bitsPerPixel;
        compressionMethod;
        pixelArrayLength;
        horizontalResolution;
        verticalResolution;
        paletteEntryCount;
        importantColorCount;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(40);
            if (config_1.DEBUG)
                asserts_1.IntegerAssert.exactly(buffer.size(), 40);
            super(buffer);
            this.headerLength = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 0,
                    length: 4
                })
            });
            this.imageWidth = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 4,
                    length: 4
                }),
                complement: "twos"
            });
            this.imageHeight = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 8,
                    length: 4
                }),
                complement: "twos"
            });
            this.colorPlaneCount = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 12,
                    length: 2
                })
            });
            this.bitsPerPixel = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 14,
                    length: 2
                })
            });
            this.compressionMethod = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 16,
                    length: 4
                })
            });
            this.pixelArrayLength = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 20,
                    length: 4
                })
            });
            this.horizontalResolution = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 24,
                    length: 4
                }),
                complement: "twos"
            });
            this.verticalResolution = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 28,
                    length: 4
                }),
                complement: "twos"
            });
            this.paletteEntryCount = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 32,
                    length: 4
                })
            });
            this.importantColorCount = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 36,
                    length: 4
                })
            });
        }
    }
    exports.BitmapInfoHeader = BitmapInfoHeader;
    ;
    function computeRowStride(bitsPerPixel, imageWidth) {
        return ((bitsPerPixel * imageWidth + 31) >> 5) << 2;
    }
    exports.computeRowStride = computeRowStride;
    ;
    function makeGrayscalePalette() {
        let palette = binary_1.Buffer.alloc(256 * 4);
        for (let i = 0, o = 0; i < 256; i++) {
            palette.set(o++, i);
            palette.set(o++, i);
            palette.set(o++, i);
            palette.set(o++, 255);
        }
        return palette;
    }
    exports.makeGrayscalePalette = makeGrayscalePalette;
    ;
    exports.Bitmap = {
        async load(cursor, reader) {
            let header = new BitmapHeader();
            await header.load(cursor, reader);
            if (config_1.DEBUG)
                asserts_1.StringAssert.identical(header.fileIdentifier.value, "BM");
            let infoHeader = new BitmapInfoHeader();
            await infoHeader.load(cursor, reader);
            if (config_1.DEBUG)
                asserts_1.IntegerAssert.exactly(infoHeader.headerLength.value, 40);
            let w = Math.abs(infoHeader.imageWidth.value);
            let h = Math.abs(infoHeader.imageHeight.value);
            let bitsPerPixel = infoHeader.bitsPerPixel.value;
            if (config_1.DEBUG)
                asserts_1.IntegerAssert.exactly(infoHeader.colorPlaneCount.value, 1);
            if (config_1.DEBUG)
                asserts_1.IntegerAssert.exactly(infoHeader.bitsPerPixel.value, 8);
            if (config_1.DEBUG)
                asserts_1.IntegerAssert.exactly(infoHeader.compressionMethod.value, 0);
            let palette = binary_1.Buffer.alloc(256 * 4);
            await reader.read(cursor, palette);
            let image = binary_1.Buffer.alloc(w * h);
            let rowStride = computeRowStride(bitsPerPixel, w);
            let pixelDataOffset = header.pixelDataOffset.value;
            if (infoHeader.imageWidth.value >= 0) {
                for (let y = 0; y < h; y++) {
                    let imageRow = image.window({
                        offset: y * w,
                        length: w
                    });
                    await reader.read({ offset: pixelDataOffset + rowStride * y }, imageRow);
                }
            }
            else {
                for (let y = h - 1; y >= 0; y--) {
                    let imageRow = image.window({
                        offset: y * w,
                        length: w
                    });
                    await reader.read({ offset: pixelDataOffset + rowStride * (h - 1 - y) }, imageRow);
                }
            }
            return {
                w,
                h,
                image,
                palette
            };
        },
        async save(bitmap, cursor, writer) {
            let rowStride = computeRowStride(8, bitmap.w);
            let header = new BitmapHeader();
            let infoHeader = new BitmapInfoHeader();
            header.fileIdentifier.value = "BM";
            header.fileLength.value = header.sizeOf() + infoHeader.sizeOf() + bitmap.palette.size() / 3 * 4 + rowStride * bitmap.h;
            header.reservedOne.value = 0;
            header.reservedTwo.value = 0;
            header.pixelDataOffset.value = header.sizeOf() + infoHeader.sizeOf() + bitmap.palette.size() / 3 * 4;
            infoHeader.headerLength.value = 40;
            infoHeader.imageWidth.value = bitmap.w;
            infoHeader.imageHeight.value = bitmap.h;
            infoHeader.colorPlaneCount.value = 1;
            infoHeader.bitsPerPixel.value = 8;
            infoHeader.compressionMethod.value = 0;
            infoHeader.pixelArrayLength.value = rowStride * bitmap.h;
            infoHeader.horizontalResolution.value = 2835;
            infoHeader.verticalResolution.value = 2835;
            infoHeader.paletteEntryCount.value = bitmap.palette.size() / 3;
            infoHeader.importantColorCount.value = 0;
            await header.save(cursor, writer);
            await infoHeader.save(cursor, writer);
            let paletteEntryStrided = binary_1.Buffer.alloc(4);
            for (let i = 0, o = 0; i < bitmap.palette.size() / 3; i++) {
                paletteEntryStrided.set(2, bitmap.palette.get(o));
                o += 1;
                paletteEntryStrided.set(1, bitmap.palette.get(o));
                o += 1;
                paletteEntryStrided.set(0, bitmap.palette.get(o));
                o += 1;
                paletteEntryStrided.set(3, 255);
                await writer.write(cursor, paletteEntryStrided);
            }
            let imageRowStrided = binary_1.Buffer.alloc(rowStride);
            for (let y = bitmap.h - 1; y >= 0; y--) {
                let imageRow = bitmap.image.window({
                    offset: y * bitmap.w,
                    length: bitmap.w
                });
                imageRow.copy(imageRowStrided);
                await writer.write(cursor, imageRowStrided);
            }
        }
    };
});
define("shared/formats/midi/index", ["require", "exports", "shared/asserts/index", "shared/binary/index", "shared/binary/chunks/index", "shared/is"], function (require, exports, asserts_1, binary_1, chunks_1, is_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.File = exports.Track = exports.Control = exports.readVarlen = exports.Type = exports.Header = exports.ChunkHeader = void 0;
    class ChunkHeader extends binary_1.Chunk {
        type;
        size;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(8);
            asserts_1.IntegerAssert.exactly(buffer.size(), 8);
            super(buffer);
            this.type = new chunks_1.ByteString({
                buffer: buffer.window({ offset: 0, length: 4 })
            });
            this.size = new chunks_1.Integer4({
                buffer: buffer.window({ offset: 4, length: 4 }),
                endian: "big"
            });
        }
    }
    exports.ChunkHeader = ChunkHeader;
    ;
    class Header extends binary_1.Chunk {
        version;
        track_count;
        ticks_per_qn;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(6);
            asserts_1.IntegerAssert.exactly(buffer.size(), 6);
            super(buffer);
            this.version = new chunks_1.Integer2({
                buffer: buffer.window({ offset: 0, length: 2 }),
                endian: "big"
            });
            this.track_count = new chunks_1.Integer2({
                buffer: buffer.window({ offset: 2, length: 2 }),
                endian: "big"
            });
            this.ticks_per_qn = new chunks_1.Integer2({
                buffer: buffer.window({ offset: 4, length: 2 }),
                endian: "big"
            });
            asserts_1.IntegerAssert.atMost(0x7FFF, this.ticks_per_qn.value);
        }
    }
    exports.Header = Header;
    ;
    var Type;
    (function (Type) {
        Type[Type["NOTE_OFF"] = 0] = "NOTE_OFF";
        Type[Type["NOTE_ON"] = 1] = "NOTE_ON";
        Type[Type["KEY_PRESSURE"] = 2] = "KEY_PRESSURE";
        Type[Type["CONTROL_CHANGE"] = 3] = "CONTROL_CHANGE";
        Type[Type["PROGRAM_CHANGE"] = 4] = "PROGRAM_CHANGE";
        Type[Type["CHANNEL_PRESSURE"] = 5] = "CHANNEL_PRESSURE";
        Type[Type["PITCH_CHANGE"] = 6] = "PITCH_CHANGE";
        Type[Type["SYSEX"] = 7] = "SYSEX";
    })(Type = exports.Type || (exports.Type = {}));
    ;
    async function readVarlen(cursor, reader) {
        let value = 0;
        let buffer = binary_1.Buffer.alloc(1);
        for (let i = 0; i < 4; i++) {
            await reader.read(cursor, buffer);
            let byte = buffer.get(0);
            value = (value << 7) | (byte & 0x7F);
            if (byte > 0x7F) {
                continue;
            }
            break;
        }
        return value;
    }
    exports.readVarlen = readVarlen;
    ;
    class Control extends chunks_1.Integer1 {
        channel;
        type;
        marker;
        constructor(options) {
            super(options);
            this.channel = new chunks_1.PackedInteger1(this, {
                offset: 0,
                length: 4
            });
            this.type = new chunks_1.PackedInteger1(this, {
                offset: 4,
                length: 3
            });
            this.marker = new chunks_1.PackedInteger1(this, {
                offset: 7,
                length: 1
            });
        }
    }
    exports.Control = Control;
    ;
    ;
    ;
    class Track {
        constructor() { }
        static async fromReader(cursor, reader) {
            let events = new Array();
            let last_control;
            last_control = new Control();
            while (cursor.offset < reader.size()) {
                let delay = await readVarlen(cursor, reader);
                let control = await new Control().load(cursor, reader);
                if (control.marker.value === 0) {
                    if (is_1.is.absent(last_control)) {
                        throw `Expected last control byte to be set!`;
                    }
                    control = last_control;
                    cursor.offset -= 1;
                }
                let type = control.type.value;
                let channel = control.channel.value;
                let length = await (async () => {
                    if (type === Type.NOTE_OFF) {
                        return 2;
                    }
                    else if (type === Type.NOTE_ON) {
                        return 2;
                    }
                    else if (type === Type.KEY_PRESSURE) {
                        return 2;
                    }
                    else if (type === Type.CONTROL_CHANGE) {
                        return 2;
                    }
                    else if (type === Type.PROGRAM_CHANGE) {
                        return 1;
                    }
                    else if (type === Type.CHANNEL_PRESSURE) {
                        return 1;
                    }
                    else if (type === Type.PITCH_CHANGE) {
                        return 2;
                    }
                    else if (type === Type.SYSEX) {
                        let length = binary_1.Buffer.alloc(1);
                        if (channel < 15) {
                            await new binary_1.Chunk(length).load({
                                offset: cursor.offset
                            }, reader);
                            return length.get(0) + 1;
                        }
                        else {
                            await new binary_1.Chunk(length).load({
                                offset: cursor.offset + 1
                            }, reader);
                            return length.get(0) + 2;
                        }
                    }
                    throw `Expected code to be unreachable!`;
                })();
                let data = binary_1.Buffer.alloc(length);
                await new binary_1.Chunk(data).load(cursor, reader);
                let event = {
                    delay,
                    type,
                    channel,
                    data,
                };
                events.push(event);
                if (type === Type.SYSEX) {
                    if (channel === 15 && data.get(0) === 0x2F) {
                        break;
                    }
                    last_control = new Control();
                }
                else {
                    last_control = control;
                }
            }
            return {
                events
            };
        }
    }
    exports.Track = Track;
    ;
    ;
    class File {
        constructor() { }
        static async fromReader(cursor, reader) {
            let chunk_header = await new ChunkHeader().load(cursor, reader);
            asserts_1.StringAssert.identical(chunk_header.type.value, "MThd");
            let header = await new Header().load(cursor, reader);
            let tracks = new Array();
            for (let i = 0; i < header.track_count.value; i++) {
                let chunk_header = await new ChunkHeader().load(cursor, reader);
                asserts_1.StringAssert.identical(chunk_header.type.value, "MTrk");
                let data = new binary_1.WindowedReader(reader, {
                    offset: cursor.offset,
                    length: chunk_header.size.value
                });
                let track = await Track.fromReader(new binary_1.Cursor(), data);
                tracks.push(track);
                cursor.offset += chunk_header.size.value;
            }
            return {
                header,
                tracks
            };
        }
    }
    exports.File = File;
    ;
});
define("shared/formats/riff/header", ["require", "exports", "shared/asserts/index", "shared/binary/index", "shared/binary/chunks/index"], function (require, exports, asserts_1, binary_1, chunks_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Header = void 0;
    class Header extends binary_1.Chunk {
        type;
        size;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(8);
            asserts_1.IntegerAssert.exactly(buffer.size(), 8);
            super(buffer);
            this.type = new chunks_1.ByteString({
                buffer: buffer.window({ offset: 0, length: 4 })
            });
            this.size = new chunks_1.Integer4({
                buffer: buffer.window({ offset: 4, length: 4 })
            });
        }
    }
    exports.Header = Header;
    ;
});
define("shared/formats/riff/file", ["require", "exports", "shared/formats/riff/header", "shared/binary/index"], function (require, exports, header_1, binary_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.File = void 0;
    class File {
        constructor() { }
        static async parseChunk(cursor, reader) {
            let header = new header_1.Header();
            await header.load(cursor, reader);
            let body = new binary_1.WindowedReader(reader, { offset: cursor.offset, length: header.size.value });
            cursor.offset += header.size.value;
            cursor.offset += cursor.offset % 2;
            return {
                header,
                body
            };
        }
    }
    exports.File = File;
    ;
});
define("shared/formats/riff/index", ["require", "exports", "shared/formats/riff/file", "shared/formats/riff/header"], function (require, exports, file_1, header_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    }));
    var __exportStar = (this && this.__exportStar) || function (m, exports) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
                __createBinding(exports, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(file_1, exports);
    __exportStar(header_1, exports);
});
define("shared/formats/soundfont/index", ["require", "exports", "shared/asserts/index", "shared/binary/index", "shared/binary/chunks/index", "shared/formats/riff/index"], function (require, exports, asserts_1, binary_1, chunks_1, riff) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.File = exports.SampleHeader = exports.InstrumentGenerator = exports.InstrumentModulator = exports.InstrumentBag = exports.Instrument = exports.PresetGenerator = exports.PresetModulator = exports.PresetBag = exports.PresetHeader = exports.Transform = exports.Generator = exports.Modulator = exports.GeneratorParameters = exports.GeneratorType = exports.SampleLink = void 0;
    var SampleLink;
    (function (SampleLink) {
        SampleLink[SampleLink["MONO"] = 1] = "MONO";
        SampleLink[SampleLink["RIGHT"] = 2] = "RIGHT";
        SampleLink[SampleLink["LEFT"] = 4] = "LEFT";
        SampleLink[SampleLink["LINKED"] = 8] = "LINKED";
        SampleLink[SampleLink["ROM_MONO"] = 32769] = "ROM_MONO";
        SampleLink[SampleLink["ROM_RIGHT"] = 32770] = "ROM_RIGHT";
        SampleLink[SampleLink["ROM_LEFT"] = 32772] = "ROM_LEFT";
        SampleLink[SampleLink["ROM_LINKED"] = 32776] = "ROM_LINKED";
    })(SampleLink = exports.SampleLink || (exports.SampleLink = {}));
    ;
    var GeneratorType;
    (function (GeneratorType) {
        GeneratorType[GeneratorType["START_ADDRESS_OFFSET"] = 0] = "START_ADDRESS_OFFSET";
        GeneratorType[GeneratorType["END_ADDRESS_OFFSET"] = 1] = "END_ADDRESS_OFFSET";
        GeneratorType[GeneratorType["START_LOOP_ADDRESS_OFFSET"] = 2] = "START_LOOP_ADDRESS_OFFSET";
        GeneratorType[GeneratorType["END_LOOP_ADDRESS_OFFSET"] = 3] = "END_LOOP_ADDRESS_OFFSET";
        GeneratorType[GeneratorType["START_ADDRESS_COARSE_OFFSET"] = 4] = "START_ADDRESS_COARSE_OFFSET";
        GeneratorType[GeneratorType["MOD_LFO_TO_PITCH"] = 5] = "MOD_LFO_TO_PITCH";
        GeneratorType[GeneratorType["VIB_LFO_TO_PITCH"] = 6] = "VIB_LFO_TO_PITCH";
        GeneratorType[GeneratorType["MOD_ENV_TO_PITCH"] = 7] = "MOD_ENV_TO_PITCH";
        GeneratorType[GeneratorType["INITIAL_FILTER_FC"] = 8] = "INITIAL_FILTER_FC";
        GeneratorType[GeneratorType["INITIAL_FILTER_Q"] = 9] = "INITIAL_FILTER_Q";
        GeneratorType[GeneratorType["MOD_FLO_TO_FILTER_FC"] = 10] = "MOD_FLO_TO_FILTER_FC";
        GeneratorType[GeneratorType["MOD_ENV_TO_FILTER_FC"] = 11] = "MOD_ENV_TO_FILTER_FC";
        GeneratorType[GeneratorType["END_ADDRESS_COARSE_OFFSET"] = 12] = "END_ADDRESS_COARSE_OFFSET";
        GeneratorType[GeneratorType["MOD_LFO_TO_VOLUME"] = 13] = "MOD_LFO_TO_VOLUME";
        GeneratorType[GeneratorType["UNUSED_1"] = 14] = "UNUSED_1";
        GeneratorType[GeneratorType["CHORUS_EFFECT_SEND"] = 15] = "CHORUS_EFFECT_SEND";
        GeneratorType[GeneratorType["REVERB_EFFECT_SEND"] = 16] = "REVERB_EFFECT_SEND";
        GeneratorType[GeneratorType["PAN"] = 17] = "PAN";
        GeneratorType[GeneratorType["UNUSED_2"] = 18] = "UNUSED_2";
        GeneratorType[GeneratorType["UNUSED_3"] = 19] = "UNUSED_3";
        GeneratorType[GeneratorType["UNUSED_4"] = 20] = "UNUSED_4";
        GeneratorType[GeneratorType["MOD_LFO_DELAY"] = 21] = "MOD_LFO_DELAY";
        GeneratorType[GeneratorType["MOD_LFO_FREQ"] = 22] = "MOD_LFO_FREQ";
        GeneratorType[GeneratorType["VIB_LFO_DELAY"] = 23] = "VIB_LFO_DELAY";
        GeneratorType[GeneratorType["VIB_LFO_FREQ"] = 24] = "VIB_LFO_FREQ";
        GeneratorType[GeneratorType["MOD_ENV_DELAY"] = 25] = "MOD_ENV_DELAY";
        GeneratorType[GeneratorType["MOD_ENV_ATTACK"] = 26] = "MOD_ENV_ATTACK";
        GeneratorType[GeneratorType["MOD_ENV_HOLD"] = 27] = "MOD_ENV_HOLD";
        GeneratorType[GeneratorType["MOD_ENV_DECAY"] = 28] = "MOD_ENV_DECAY";
        GeneratorType[GeneratorType["MOD_ENV_SUSTAIN"] = 29] = "MOD_ENV_SUSTAIN";
        GeneratorType[GeneratorType["MOD_ENV_RELEASE"] = 30] = "MOD_ENV_RELEASE";
        GeneratorType[GeneratorType["MOD_ENV_KEY_TO_HOLD"] = 31] = "MOD_ENV_KEY_TO_HOLD";
        GeneratorType[GeneratorType["MOD_ENV_KEY_TO_DECAY"] = 32] = "MOD_ENV_KEY_TO_DECAY";
        GeneratorType[GeneratorType["VOL_ENV_DELAY"] = 33] = "VOL_ENV_DELAY";
        GeneratorType[GeneratorType["VOL_ENV_ATTACK"] = 34] = "VOL_ENV_ATTACK";
        GeneratorType[GeneratorType["VOL_ENV_HOLD"] = 35] = "VOL_ENV_HOLD";
        GeneratorType[GeneratorType["VOL_ENV_DECAY"] = 36] = "VOL_ENV_DECAY";
        GeneratorType[GeneratorType["VOL_ENV_SUSTAIN"] = 37] = "VOL_ENV_SUSTAIN";
        GeneratorType[GeneratorType["VOL_ENV_RELEASE"] = 38] = "VOL_ENV_RELEASE";
        GeneratorType[GeneratorType["VOL_ENV_KEY_TO_HOLD"] = 39] = "VOL_ENV_KEY_TO_HOLD";
        GeneratorType[GeneratorType["VOL_ENV_KEY_TO_DECAY"] = 40] = "VOL_ENV_KEY_TO_DECAY";
        GeneratorType[GeneratorType["INSTRUMENT"] = 41] = "INSTRUMENT";
        GeneratorType[GeneratorType["RESERVED_1"] = 42] = "RESERVED_1";
        GeneratorType[GeneratorType["KEY_RANGE"] = 43] = "KEY_RANGE";
        GeneratorType[GeneratorType["VEL_RANGE"] = 44] = "VEL_RANGE";
        GeneratorType[GeneratorType["START_LOOP_ADDRESS_COARSE_OFFSET"] = 45] = "START_LOOP_ADDRESS_COARSE_OFFSET";
        GeneratorType[GeneratorType["KEYNUM"] = 46] = "KEYNUM";
        GeneratorType[GeneratorType["VELOCITY"] = 47] = "VELOCITY";
        GeneratorType[GeneratorType["INITIAL_ATTENUATION"] = 48] = "INITIAL_ATTENUATION";
        GeneratorType[GeneratorType["RESERVED_2"] = 49] = "RESERVED_2";
        GeneratorType[GeneratorType["END_LOOP_ADDRESS_COARSE_OFFSET"] = 50] = "END_LOOP_ADDRESS_COARSE_OFFSET";
        GeneratorType[GeneratorType["COARSE_TUNE"] = 51] = "COARSE_TUNE";
        GeneratorType[GeneratorType["FINE_TUNE"] = 52] = "FINE_TUNE";
        GeneratorType[GeneratorType["SAMPLE_ID"] = 53] = "SAMPLE_ID";
        GeneratorType[GeneratorType["SAMPLE_MODES"] = 54] = "SAMPLE_MODES";
        GeneratorType[GeneratorType["RESERVED_3"] = 55] = "RESERVED_3";
        GeneratorType[GeneratorType["SCALE_TUNING"] = 56] = "SCALE_TUNING";
        GeneratorType[GeneratorType["EXCLUSIVE_CLASS"] = 57] = "EXCLUSIVE_CLASS";
        GeneratorType[GeneratorType["OVERRIDING_ROOT_KEY"] = 58] = "OVERRIDING_ROOT_KEY";
        GeneratorType[GeneratorType["UNUSED_5"] = 59] = "UNUSED_5";
        GeneratorType[GeneratorType["END_OPERATOR"] = 60] = "END_OPERATOR";
    })(GeneratorType = exports.GeneratorType || (exports.GeneratorType = {}));
    ;
    class GeneratorParameters extends binary_1.Chunk {
        first;
        second;
        signed;
        unsigned;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(2);
            asserts_1.IntegerAssert.exactly(buffer.size(), 2);
            super(buffer);
            this.first = new chunks_1.Integer1({
                buffer: buffer.window({ offset: 0, length: 1 })
            });
            this.second = new chunks_1.Integer1({
                buffer: buffer.window({ offset: 1, length: 1 })
            });
            this.signed = new chunks_1.Integer2({
                buffer: buffer.window({ offset: 0, length: 2 }),
                complement: "twos"
            });
            this.unsigned = new chunks_1.Integer2({
                buffer: buffer.window({ offset: 0, length: 2 })
            });
        }
        toJSON() {
            return {
                first: this.first.value,
                second: this.second.value,
                amount_signed: this.signed.value,
                amount: this.unsigned.value
            };
        }
    }
    exports.GeneratorParameters = GeneratorParameters;
    ;
    class Modulator extends chunks_1.Integer2 {
        index;
        continuous;
        direction;
        polarity;
        type;
        constructor(options) {
            super(options);
            this.index = new chunks_1.PackedInteger2(this, {
                offset: 0,
                length: 7
            });
            this.continuous = new chunks_1.PackedInteger2(this, {
                offset: 7,
                length: 1
            });
            this.direction = new chunks_1.PackedInteger2(this, {
                offset: 8,
                length: 1
            });
            this.polarity = new chunks_1.PackedInteger2(this, {
                offset: 9,
                length: 1
            });
            this.type = new chunks_1.PackedInteger2(this, {
                offset: 10,
                length: 6
            });
        }
        toJSON() {
            return {
                index: this.index.value,
                continuous: this.continuous.value,
                direction: this.direction.value,
                polarity: this.polarity.value,
                type: this.type.value
            };
        }
    }
    exports.Modulator = Modulator;
    ;
    // TODO: Extend from chunk?
    class Generator extends chunks_1.Integer2 {
        type;
        link;
        constructor(options) {
            super(options);
            this.type = new chunks_1.PackedInteger2(this, {
                offset: 0,
                length: 15
            });
            this.link = new chunks_1.PackedInteger2(this, {
                offset: 15,
                length: 1
            });
        }
        toJSON() {
            return {
                type: this.type.value,
                link: this.link.value
            };
        }
    }
    exports.Generator = Generator;
    ;
    class Transform extends chunks_1.Integer2 {
        index;
        constructor(options) {
            super(options);
            this.index = new chunks_1.PackedInteger2(this, {
                offset: 0,
                length: 16
            });
        }
        toJSON() {
            return {
                index: this.index.value
            };
        }
    }
    exports.Transform = Transform;
    ;
    class PresetHeader extends binary_1.Chunk {
        name;
        preset;
        bank;
        pbag_index;
        library;
        genre;
        morphology;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(38);
            asserts_1.IntegerAssert.exactly(buffer.size(), 38);
            super(buffer);
            this.name = new chunks_1.ByteString({
                buffer: buffer.window({
                    offset: 0,
                    length: 20
                })
            });
            this.preset = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 20,
                    length: 2
                })
            });
            this.bank = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 22,
                    length: 2
                })
            });
            this.pbag_index = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 24,
                    length: 2
                })
            });
            this.library = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 26,
                    length: 4
                })
            });
            this.genre = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 30,
                    length: 4
                })
            });
            this.morphology = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 34,
                    length: 4
                })
            });
        }
        toJSON() {
            return {
                name: this.name.value,
                preset: this.preset.value,
                bank: this.bank.value,
                pbag_index: this.pbag_index.value,
                library: this.library.value,
                genre: this.genre.value,
                morphology: this.morphology.value
            };
        }
    }
    exports.PresetHeader = PresetHeader;
    ;
    class PresetBag extends binary_1.Chunk {
        pgen_index;
        pmod_index;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(4);
            asserts_1.IntegerAssert.exactly(buffer.size(), 4);
            super(buffer);
            this.pgen_index = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 0,
                    length: 2
                })
            });
            this.pmod_index = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 2,
                    length: 2
                })
            });
        }
        toJSON() {
            return {
                pgen_index: this.pgen_index.value,
                pmod_index: this.pmod_index.value
            };
        }
    }
    exports.PresetBag = PresetBag;
    ;
    class PresetModulator extends binary_1.Chunk {
        modulator_source_operator;
        generator_destination_operator;
        modulator_amount;
        modulator_amount_source_operator;
        modulator_transform_operator;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(10);
            asserts_1.IntegerAssert.exactly(buffer.size(), 10);
            super(buffer);
            this.modulator_source_operator = new Modulator({
                buffer: buffer.window({
                    offset: 0,
                    length: 2
                })
            });
            this.generator_destination_operator = new Generator({
                buffer: buffer.window({
                    offset: 2,
                    length: 2
                })
            });
            this.modulator_amount = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 4,
                    length: 2
                }),
                complement: "twos"
            });
            this.modulator_amount_source_operator = new Modulator({
                buffer: buffer.window({
                    offset: 6,
                    length: 2
                })
            });
            this.modulator_transform_operator = new Transform({
                buffer: buffer.window({
                    offset: 8,
                    length: 2
                })
            });
        }
        toJSON() {
            return {
                modulator_source_operator: this.modulator_source_operator.toJSON(),
                generator_destination_operator: this.generator_destination_operator.toJSON(),
                modulator_amount: this.modulator_amount.value,
                modulator_amount_source_operator: this.modulator_amount_source_operator.toJSON(),
                modulator_transform_operator: this.modulator_transform_operator.toJSON()
            };
        }
    }
    exports.PresetModulator = PresetModulator;
    ;
    class PresetGenerator extends binary_1.Chunk {
        generator;
        parameters;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(4);
            asserts_1.IntegerAssert.exactly(buffer.size(), 4);
            super(buffer);
            this.generator = new Generator({
                buffer: buffer.window({
                    offset: 0,
                    length: 2
                })
            });
            this.parameters = new GeneratorParameters({
                buffer: buffer.window({
                    offset: 2,
                    length: 2
                })
            });
        }
        toJSON() {
            return {
                generator: this.generator.toJSON(),
                amount: this.parameters.toJSON()
            };
        }
    }
    exports.PresetGenerator = PresetGenerator;
    ;
    class Instrument extends binary_1.Chunk {
        name;
        ibag_index;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(22);
            asserts_1.IntegerAssert.exactly(buffer.size(), 22);
            super(buffer);
            this.name = new chunks_1.ByteString({
                buffer: buffer.window({
                    offset: 0,
                    length: 20
                })
            });
            this.ibag_index = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 20,
                    length: 2
                })
            });
        }
        toJSON() {
            return {
                name: this.name.value,
                ibag_index: this.ibag_index.value
            };
        }
    }
    exports.Instrument = Instrument;
    ;
    class InstrumentBag extends binary_1.Chunk {
        igen_index;
        imod_index;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(4);
            asserts_1.IntegerAssert.exactly(buffer.size(), 4);
            super(buffer);
            this.igen_index = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 0,
                    length: 2
                })
            });
            this.imod_index = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 2,
                    length: 2
                })
            });
        }
        toJSON() {
            return {
                igen_index: this.igen_index.value,
                imod_index: this.imod_index.value
            };
        }
    }
    exports.InstrumentBag = InstrumentBag;
    ;
    class InstrumentModulator extends binary_1.Chunk {
        modulator_source_operator;
        generator_destination_operator;
        modulator_amount;
        modulator_amount_source_operator;
        modulator_transform_operator;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(10);
            asserts_1.IntegerAssert.exactly(buffer.size(), 10);
            super(buffer);
            this.modulator_source_operator = new Modulator({
                buffer: buffer.window({
                    offset: 0,
                    length: 2
                })
            });
            this.generator_destination_operator = new Generator({
                buffer: buffer.window({
                    offset: 2,
                    length: 2
                })
            });
            this.modulator_amount = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 4,
                    length: 2
                }),
                complement: "twos"
            });
            this.modulator_amount_source_operator = new Modulator({
                buffer: buffer.window({
                    offset: 6,
                    length: 2
                })
            });
            this.modulator_transform_operator = new Transform({
                buffer: buffer.window({
                    offset: 8,
                    length: 2
                })
            });
        }
        toJSON() {
            return {
                modulator_source_operator: this.modulator_source_operator.toJSON(),
                generator_destination_operator: this.generator_destination_operator.toJSON(),
                modulator_amount: this.modulator_amount.value,
                modulator_amount_source_operator: this.modulator_amount_source_operator.toJSON(),
                modulator_transform_operator: this.modulator_transform_operator.toJSON()
            };
        }
    }
    exports.InstrumentModulator = InstrumentModulator;
    ;
    class InstrumentGenerator extends binary_1.Chunk {
        generator;
        parameters;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(4);
            asserts_1.IntegerAssert.exactly(buffer.size(), 4);
            super(buffer);
            this.generator = new Generator({
                buffer: buffer.window({
                    offset: 0,
                    length: 2
                })
            });
            this.parameters = new GeneratorParameters({
                buffer: buffer.window({
                    offset: 2,
                    length: 2
                })
            });
        }
        toJSON() {
            return {
                generator: this.generator.value,
                amount: this.parameters.toJSON()
            };
        }
    }
    exports.InstrumentGenerator = InstrumentGenerator;
    ;
    class SampleHeader extends binary_1.Chunk {
        name;
        start;
        end;
        loop_start;
        loop_end;
        sample_rate;
        original_key;
        correction;
        link;
        type;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(46);
            asserts_1.IntegerAssert.exactly(buffer.size(), 46);
            super(buffer);
            this.name = new chunks_1.ByteString({
                buffer: buffer.window({
                    offset: 0,
                    length: 20
                })
            });
            this.start = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 20,
                    length: 4
                })
            });
            this.end = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 24,
                    length: 4
                })
            });
            this.loop_start = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 28,
                    length: 4
                })
            });
            this.loop_end = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 32,
                    length: 4
                })
            });
            this.sample_rate = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 36,
                    length: 4
                })
            });
            this.original_key = new chunks_1.Integer1({
                buffer: buffer.window({
                    offset: 40,
                    length: 1
                })
            });
            this.correction = new chunks_1.Integer1({
                buffer: buffer.window({
                    offset: 41,
                    length: 1
                }),
                complement: "twos"
            });
            this.link = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 42,
                    length: 2
                })
            });
            this.type = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 44,
                    length: 2
                })
            });
        }
        toJSON() {
            return {
                name: this.name.value,
                start: this.start.value,
                end: this.end.value,
                loop_start: this.loop_start.value,
                loop_end: this.loop_end.value,
                sample_rate: this.sample_rate.value,
                original_key: this.original_key.value,
                correction: this.correction.value,
                link: this.link.value,
                type: this.type.value
            };
        }
    }
    exports.SampleHeader = SampleHeader;
    ;
    class File {
        smpl;
        sm24;
        phdr;
        pbag;
        pmod;
        pgen;
        inst;
        ibag;
        imod;
        igen;
        shdr;
        constructor() {
            this.smpl = new binary_1.BufferReader();
            this.sm24 = new binary_1.BufferReader();
            this.phdr = new Array();
            this.pbag = new Array();
            this.pmod = new Array();
            this.pgen = new Array();
            this.inst = new Array();
            this.ibag = new Array();
            this.imod = new Array();
            this.igen = new Array();
            this.shdr = new Array();
        }
        async load(cursor, reader) {
            // TODO: Reset state or make static.
            let chunk = await riff.File.parseChunk(cursor, reader);
            console.log("" + chunk.header.type.value + ": " + chunk.header.size.value);
            asserts_1.StringAssert.identical(chunk.header.type.value, "RIFF");
            {
                let reader = chunk.body;
                let cursor = new binary_1.Cursor();
                let type = await new chunks_1.ByteString({ buffer: binary_1.Buffer.alloc(4) }).load(cursor, reader);
                asserts_1.StringAssert.identical(type.value, "sfbk");
                while (cursor.offset < reader.size()) {
                    let chunk = await riff.File.parseChunk(cursor, reader);
                    console.log("\t" + chunk.header.type.value + ": " + chunk.header.size.value);
                    asserts_1.StringAssert.identical(chunk.header.type.value, "LIST");
                    {
                        let reader = chunk.body;
                        let cursor = new binary_1.Cursor();
                        let type = await new chunks_1.ByteString({ buffer: binary_1.Buffer.alloc(4) }).load(cursor, reader);
                        if (false) {
                        }
                        else if (type.value === "INFO") {
                            while (cursor.offset < reader.size()) {
                                let chunk = await riff.File.parseChunk(cursor, reader);
                                console.log("\t\t" + chunk.header.type.value + ": " + chunk.header.size.value);
                                if (false) {
                                }
                                else if (chunk.header.type.value === "ifil") {
                                }
                                else if (chunk.header.type.value === "INAM") {
                                }
                                else if (chunk.header.type.value === "ISFT") {
                                }
                                else if (chunk.header.type.value === "ICOP") {
                                }
                                else if (chunk.header.type.value === "IENG") {
                                }
                                else if (chunk.header.type.value === "ICMT") {
                                }
                            }
                        }
                        else if (type.value === "sdta") {
                            while (cursor.offset < reader.size()) {
                                let chunk = await riff.File.parseChunk(cursor, reader);
                                console.log("\t\t" + chunk.header.type.value + ": " + chunk.header.size.value);
                                if (false) {
                                }
                                else if (chunk.header.type.value === "smpl") {
                                    this.smpl = chunk.body;
                                }
                                else if (chunk.header.type.value === "sm24") {
                                    this.sm24 = chunk.body;
                                }
                            }
                        }
                        else if (type.value === "pdta") {
                            while (cursor.offset < reader.size()) {
                                let chunk = await riff.File.parseChunk(cursor, reader);
                                console.log("\t\t" + chunk.header.type.value + ": " + chunk.header.size.value);
                                if (false) {
                                }
                                else if (chunk.header.type.value === "phdr") {
                                    let reader = chunk.body;
                                    let cursor = new binary_1.Cursor();
                                    while (cursor.offset < reader.size()) {
                                        let header = await new PresetHeader().load(cursor, reader);
                                        this.phdr.push(header);
                                    }
                                }
                                else if (chunk.header.type.value === "pbag") {
                                    let reader = chunk.body;
                                    let cursor = new binary_1.Cursor();
                                    while (cursor.offset < reader.size()) {
                                        let header = await new PresetBag().load(cursor, reader);
                                        this.pbag.push(header);
                                    }
                                }
                                else if (chunk.header.type.value === "pmod") {
                                    let reader = chunk.body;
                                    let cursor = new binary_1.Cursor();
                                    while (cursor.offset < reader.size()) {
                                        let header = await new PresetModulator().load(cursor, reader);
                                        this.pmod.push(header);
                                    }
                                }
                                else if (chunk.header.type.value === "pgen") {
                                    let reader = chunk.body;
                                    let cursor = new binary_1.Cursor();
                                    while (cursor.offset < reader.size()) {
                                        let header = await new PresetGenerator().load(cursor, reader);
                                        this.pgen.push(header);
                                    }
                                }
                                else if (chunk.header.type.value === "inst") {
                                    let reader = chunk.body;
                                    let cursor = new binary_1.Cursor();
                                    while (cursor.offset < reader.size()) {
                                        let header = await new Instrument().load(cursor, reader);
                                        this.inst.push(header);
                                    }
                                }
                                else if (chunk.header.type.value === "ibag") {
                                    let reader = chunk.body;
                                    let cursor = new binary_1.Cursor();
                                    while (cursor.offset < reader.size()) {
                                        let header = await new InstrumentBag().load(cursor, reader);
                                        this.ibag.push(header);
                                    }
                                }
                                else if (chunk.header.type.value === "imod") {
                                    let reader = chunk.body;
                                    let cursor = new binary_1.Cursor();
                                    while (cursor.offset < reader.size()) {
                                        let header = await new InstrumentModulator().load(cursor, reader);
                                        this.imod.push(header);
                                    }
                                }
                                else if (chunk.header.type.value === "igen") {
                                    let reader = chunk.body;
                                    let cursor = new binary_1.Cursor();
                                    while (cursor.offset < reader.size()) {
                                        let header = await new InstrumentGenerator().load(cursor, reader);
                                        this.igen.push(header);
                                    }
                                }
                                else if (chunk.header.type.value === "shdr") {
                                    let reader = chunk.body;
                                    let cursor = new binary_1.Cursor();
                                    while (cursor.offset < reader.size()) {
                                        let header = await new SampleHeader().load(cursor, reader);
                                        this.shdr.push(header);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return this;
        }
    }
    exports.File = File;
    ;
});
define("shared/formats/wave/header", ["require", "exports", "shared/asserts/index", "shared/binary/index", "shared/binary/chunks/index"], function (require, exports, asserts_1, binary_1, chunks_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Header = void 0;
    class Header extends binary_1.Chunk {
        audio_format;
        channel_count;
        sample_rate;
        byte_rate;
        block_align;
        bits_per_sample;
        constructor(options) {
            let buffer = options?.buffer ?? binary_1.Buffer.alloc(16);
            asserts_1.IntegerAssert.exactly(buffer.size(), 16);
            super(buffer);
            this.audio_format = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 0,
                    length: 2
                })
            });
            this.channel_count = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 2,
                    length: 2
                })
            });
            this.sample_rate = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 4,
                    length: 4
                })
            });
            this.byte_rate = new chunks_1.Integer4({
                buffer: buffer.window({
                    offset: 8,
                    length: 4
                })
            });
            this.block_align = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 12,
                    length: 2
                })
            });
            this.bits_per_sample = new chunks_1.Integer2({
                buffer: buffer.window({
                    offset: 14,
                    length: 2
                })
            });
        }
    }
    exports.Header = Header;
    ;
});
define("shared/formats/wave/index", ["require", "exports", "shared/formats/wave/header"], function (require, exports, header_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    }));
    var __exportStar = (this && this.__exportStar) || function (m, exports) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
                __createBinding(exports, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(header_2, exports);
});
define("shared/formats/index", ["require", "exports", "shared/formats/bmp/index", "shared/formats/midi/index", "shared/formats/riff/index", "shared/formats/soundfont/index", "shared/formats/wave/index"], function (require, exports, bmp, midi, riff, soundfont, wave) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.wave = exports.soundfont = exports.riff = exports.midi = exports.bmp = void 0;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.wave = exports.soundfont = exports.riff = exports.midi = exports.bmp = void 0;
    exports.bmp = bmp;
    exports.midi = midi;
    exports.riff = riff;
    exports.soundfont = soundfont;
    exports.wave = wave;
});
define("shared/tables", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.armorPiercingDamage = exports.damage = exports.unknown2 = exports.unknown1 = exports.armor = exports.range = exports.rectangles = exports.size = exports.woodCost = exports.goldCost = exports.timeCost = exports.unkown0 = exports.hitPoints = void 0;
    // 00288956-00289060
    exports.hitPoints = new Uint16Array(new Uint8Array([
        0x3C, 0x00, 0x3C, 0x00, 0x28, 0x00, 0x28, 0x00,
        0x78, 0x00, 0x78, 0x00, 0x5A, 0x00, 0x5A, 0x00,
        0x3C, 0x00, 0x3C, 0x00, 0x28, 0x00, 0x28, 0x00,
        0x28, 0x00, 0x28, 0x00, 0x96, 0x00, 0x32, 0x00,
        0x28, 0x00, 0x1E, 0x00, 0x1E, 0x00, 0x3C, 0x00,
        0xFA, 0x00, 0x1E, 0x00, 0x96, 0x00, 0xC8, 0x00,
        0x1E, 0x00, 0x28, 0x00, 0x28, 0x00, 0x1E, 0x00,
        0x2C, 0x01, 0xFA, 0x00, 0xFA, 0x00, 0xFA, 0x00,
        0x90, 0x01, 0x90, 0x01, 0x20, 0x03, 0x20, 0x03,
        0xBC, 0x02, 0xBC, 0x02, 0x84, 0x03, 0x84, 0x03,
        0xC4, 0x09, 0xC4, 0x09, 0x58, 0x02, 0x58, 0x02,
        0xF4, 0x01, 0xF4, 0x01, 0x20, 0x03, 0x20, 0x03,
        0x88, 0x13, 0x88, 0x13, 0x9C, 0x63, 0xFF, 0x00
    ]).buffer);
    // 00289060-00289112
    exports.unkown0 = new Uint8Array([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00
    ]);
    // 00289112-00289164
    exports.timeCost = new Uint8Array([
        0x3C, 0x3C, 0x4B, 0x4B, 0x64, 0x64, 0x50, 0x50,
        0x46, 0x46, 0x5A, 0x5A, 0x50, 0x50, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x64, 0x64, 0x96, 0x96, 0xC8, 0xC8, 0xC8, 0xC8,
        0x64, 0x64, 0x96, 0x96, 0x96, 0x96, 0x96, 0x96,
        0xC8, 0xC8, 0x96, 0x00
    ]);
    /* [0x1E, 0x14, 0x1E, 0x1E] */
    // 00289168-00289220
    exports.goldCost = new Uint8Array([
        0x28, 0x28, 0x28, 0x28, 0x5A, 0x5A, 0x55, 0x55,
        0x2D, 0x2D, 0x5A, 0x5A, 0x46, 0x46, 0xFA, 0xFA,
        0xFA, 0xFA, 0xFA, 0x5A, 0x00, 0x14, 0x14, 0x96,
        0x14, 0x32, 0x0A, 0x28, 0xC8, 0x00, 0x00, 0xC8,
        0x32, 0x32, 0x3C, 0x3C, 0x50, 0x50, 0x8C, 0x8C,
        0x28, 0x28, 0x3C, 0x3C, 0x64, 0x64, 0x5A, 0x5A,
        0xFA, 0xFA, 0x00, 0x00
    ]);
    /* [0x05, 0x0A, 0x00, 0x00] */
    // 00289224-00289276
    exports.woodCost = new Uint8Array([
        0x00, 0x00, 0x00, 0x00, 0x14, 0x14, 0x00, 0x00,
        0x05, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x1E, 0x1E, 0x32, 0x32, 0x32, 0x32, 0x1E, 0x1E,
        0x28, 0x28, 0x32, 0x32, 0x28, 0x28, 0x28, 0x28,
        0xC8, 0xC8, 0x0A, 0x00
    ]);
    /* [0x00, 0x00, 0x00, 0x00] */
    // 00289280-00289504
    exports.size = new Uint16Array(new Uint8Array([
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x02, 0x00, 0x02, 0x00, 0x02, 0x00, 0x02, 0x00,
        0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00,
        0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00,
        0x02, 0x00, 0x02, 0x00, 0x02, 0x00, 0x02, 0x00,
        0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00,
        0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x03, 0x00,
        0x03, 0x00, 0x03, 0x00, 0x03, 0x00, 0x02, 0x00,
        0x02, 0x00, 0x02, 0x00, 0x02, 0x00, 0x02, 0x00,
        0x04, 0x00, 0x04, 0x00, 0x04, 0x00, 0x04, 0x00,
        0x03, 0x00, 0x03, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x03, 0x00, 0x01, 0x00, 0x01, 0x00, 0x03, 0x00,
    ]).buffer);
    // 00289504-00289712
    exports.rectangles = new Uint16Array(new Uint8Array([
        0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x15, 0x00, 0x15, 0x00, 0x15, 0x00, 0x15, 0x00,
        0x13, 0x00, 0x13, 0x00, 0x13, 0x00, 0x13, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x13, 0x00, 0x13, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x13, 0x00, 0x13, 0x00,
        0x13, 0x00, 0x13, 0x00, 0x15, 0x00, 0x15, 0x00,
        0x13, 0x00, 0x13, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x16, 0x00, 0x16, 0x00, 0x0F, 0x00, 0x0F, 0x00,
        0x0F, 0x00, 0x0F, 0x00, 0x11, 0x00, 0x11, 0x00,
        0x1F, 0x00, 0x1F, 0x00, 0x1F, 0x00, 0x1F, 0x00,
        0x2F, 0x00, 0x2F, 0x00, 0x2F, 0x00, 0x2F, 0x00,
        0x2F, 0x00, 0x2F, 0x00, 0x2F, 0x00, 0x2F, 0x00,
        0x1F, 0x00, 0x1F, 0x00, 0x1F, 0x00, 0x1F, 0x00,
        0x2F, 0x00, 0x2F, 0x00, 0x2F, 0x00, 0x2F, 0x00,
        0x2F, 0x00, 0x2F, 0x00, 0x2F, 0x00, 0x2F, 0x00,
        0x2F, 0x00, 0x2F, 0x00, 0x2F, 0x00, 0x1F, 0x00,
        0x1F, 0x00, 0x1F, 0x00, 0x1F, 0x00, 0x1F, 0x00,
        0x4B, 0x00, 0x4B, 0x00, 0x4B, 0x00, 0x4B, 0x00,
        0x2F, 0x00, 0x2F, 0x00, 0x0F, 0x00, 0x0F, 0x00
    ]).buffer);
    // 00289712-00289744
    exports.range = new Uint8Array([
        0x01, 0x01, 0x01, 0x01, 0x08, 0x08, 0x01, 0x01,
        0x05, 0x04, 0x03, 0x02, 0x01, 0x02, 0x05, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x03
    ]);
    // 00289744-00289796
    exports.armor = new Uint8Array([
        0x02, 0x02, 0x00, 0x00, 0x00, 0x00, 0x05, 0x05,
        0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05,
        0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x0A, 0x00,
        0x00, 0x04, 0x01, 0x02, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00
    ]);
    // 00289796-00289900
    exports.unknown1 = new Uint16Array(new Uint8Array([
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]).buffer);
    // 00289900-00289952
    exports.unknown2 = new Uint8Array([
        0x28, 0x28, 0x3C, 0x3C, 0x69, 0x69, 0x2D, 0x2D,
        0x28, 0x28, 0x37, 0x37, 0x32, 0x32, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x29, 0x29, 0x23, 0x29, 0x29,
        0x23, 0x29, 0x1E, 0x29, 0x46, 0x29, 0x29, 0x46,
        0x14, 0x14, 0x12, 0x12, 0x12, 0x12, 0x12, 0x12,
        0x16, 0x16, 0x08, 0x08, 0x0C, 0x0C, 0x0A, 0x0A,
        0x19, 0x19, 0x00, 0x00
    ]);
    // 00289952-00289984
    exports.damage = new Uint8Array([
        0x09, 0x09, 0x00, 0x00, 0xFF, 0xFF, 0x0D, 0x0D,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0F,
        0x00, 0x00, 0x00, 0x0C, 0x00, 0x03, 0x00, 0x28,
        0x00, 0x09, 0x04, 0x09, 0x41, 0x00, 0x00, 0x00
    ]);
    // 00289984-00290016
    exports.armorPiercingDamage = new Uint8Array([
        0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01,
        0x04, 0x05, 0x06, 0x06, 0x06, 0x06, 0x0A, 0x01,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x01, 0x00,
        0x03, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x28
    ]);
});
define("shared/index", ["require", "exports", "shared/asserts/index", "shared/binary/index", "shared/formats/index", "shared/tables", "shared/is"], function (require, exports, asserts, binary, formats, tables_1, is_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formats = exports.binary = exports.asserts = void 0;
    var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    }));
    var __exportStar = (this && this.__exportStar) || function (m, exports) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
                __createBinding(exports, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formats = exports.binary = exports.asserts = void 0;
    exports.asserts = asserts;
    exports.binary = binary;
    exports.formats = formats;
    __exportStar(tables_1, exports);
    __exportStar(is_1, exports);
});
define("shared/binary.web/index", ["require", "exports", "shared/asserts/index", "shared/binary/index"], function (require, exports, asserts_1, binary_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    }));
    var __exportStar = (this && this.__exportStar) || function (m, exports) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
                __createBinding(exports, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebFileReader = void 0;
    __exportStar(binary_1, exports);
    class WebFileReader {
        file;
        constructor(file) {
            this.file = file;
        }
        async read(cursor, target) {
            let offset = cursor.offset;
            let length = target.size();
            asserts_1.IntegerAssert.between(0, offset, this.file.size);
            asserts_1.IntegerAssert.between(0, length, this.file.size - offset);
            let blob = this.file.slice(offset, offset + length);
            let source = new Uint8Array(await blob.arrayBuffer());
            target.place(source);
            cursor.offset += length;
            return target;
        }
        size() {
            return this.file.size;
        }
    }
    exports.WebFileReader = WebFileReader;
    ;
});
define("client/synth", ["require", "exports", "shared/index", "shared/binary/index", "shared/formats/soundfont/index"], function (require, exports, shared_1, binary_1, soundfont) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WavetableSynth = exports.Bank = exports.Program = void 0;
    class Program {
        name;
        file;
        igen_indices;
        buffers;
        constructor() {
            this.name = "";
            this.file = new soundfont.File();
            this.igen_indices = new Array();
            this.buffers = new Map();
        }
        getParms(key, velocity) {
            outer: for (let igen_index of this.igen_indices) {
                let params = {
                    env: {
                        vol: {
                            delay_tc: -12000,
                            attack_tc: -12000,
                            hold_tc: -12000,
                            deacy_tc: -12000,
                            sustain_level: 1,
                            release_tc: -12000,
                            hold_time_factor: 1,
                            decay_time_factor: 1
                        },
                        mod: {
                            delay_tc: -12000,
                            attack_tc: -12000,
                            hold_tc: -12000,
                            deacy_tc: -12000,
                            sustain_level: 1,
                            release_tc: -12000,
                            hold_time_factor: 1,
                            decay_time_factor: 1,
                            to_pitch_c: 0
                        }
                    },
                    lfo: {
                        mod: {
                            delay_tc: -12000,
                            freq_hz: 8.176,
                            to_pitch_c: 0,
                            to_volume_cb: 0
                        },
                        vib: {
                            delay_tc: -12000,
                            freq_hz: 8.176
                        }
                    },
                    filter: {
                        cutoff_c: 13500,
                        q_cb: 0
                    },
                    sample: {
                        index: 0,
                        loop: false,
                        attenuation_cb: 0,
                        root_key_override: undefined
                    }
                };
                inner: for (let i = igen_index; i < this.file.igen.length; i++) {
                    let generator = this.file.igen[i];
                    if (shared_1.is.absent(generator)) {
                        throw ``;
                    }
                    let type = generator.generator.type.value;
                    if (false) {
                    }
                    else if (type === soundfont.GeneratorType.INITIAL_FILTER_FC) {
                        params.filter.cutoff_c = generator.parameters.signed.value;
                    }
                    else if (type === soundfont.GeneratorType.INITIAL_FILTER_Q) {
                        params.filter.q_cb = generator.parameters.signed.value;
                    }
                    else if (type === soundfont.GeneratorType.INITIAL_ATTENUATION) {
                        params.sample.attenuation_cb = generator.parameters.signed.value;
                    }
                    else if (type === soundfont.GeneratorType.MOD_ENV_TO_PITCH) {
                        params.env.mod.to_pitch_c = generator.parameters.signed.value;
                    }
                    else if (type === soundfont.GeneratorType.VOL_ENV_KEY_TO_HOLD) {
                        let value = Math.max(-1200, Math.min(generator.parameters.signed.value, 1200));
                        params.env.vol.hold_time_factor = 2 ** (value / 100 * (60 - key) / 12);
                    }
                    else if (type === soundfont.GeneratorType.VOL_ENV_KEY_TO_DECAY) {
                        let value = Math.max(-1200, Math.min(generator.parameters.signed.value, 1200));
                        params.env.vol.decay_time_factor = 2 ** (value / 100 * (60 - key) / 12);
                    }
                    else if (type === soundfont.GeneratorType.VOL_ENV_DELAY) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
                        params.env.vol.delay_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.VOL_ENV_ATTACK) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
                        params.env.vol.attack_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.VOL_ENV_HOLD) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
                        params.env.vol.hold_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.VOL_ENV_DECAY) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
                        params.env.vol.deacy_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.VOL_ENV_SUSTAIN) {
                        let value_cb = Math.max(0, Math.min(generator.parameters.signed.value, 1440));
                        params.env.vol.sustain_level = Math.pow(10, -value_cb / 200);
                    }
                    else if (type === soundfont.GeneratorType.VOL_ENV_RELEASE) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
                        params.env.vol.release_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.MOD_ENV_KEY_TO_HOLD) {
                        let value = Math.max(-1200, Math.min(generator.parameters.signed.value, 1200));
                        params.env.mod.hold_time_factor = 2 ** (value / 100 * (60 - key) / 12);
                    }
                    else if (type === soundfont.GeneratorType.MOD_ENV_KEY_TO_DECAY) {
                        let value = Math.max(-1200, Math.min(generator.parameters.signed.value, 1200));
                        params.env.mod.decay_time_factor = 2 ** (value / 100 * (60 - key) / 12);
                    }
                    else if (type === soundfont.GeneratorType.MOD_ENV_DELAY) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
                        params.env.mod.delay_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.MOD_ENV_ATTACK) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
                        params.env.mod.attack_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.MOD_ENV_HOLD) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
                        params.env.mod.hold_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.MOD_ENV_DECAY) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
                        params.env.mod.deacy_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.MOD_ENV_SUSTAIN) {
                        let value_pm = Math.max(0, Math.min(generator.parameters.signed.value, 1000));
                        params.env.mod.sustain_level = 1.0 - value_pm / 1000;
                    }
                    else if (type === soundfont.GeneratorType.MOD_ENV_RELEASE) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
                        params.env.mod.release_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.KEY_RANGE) {
                        let lower = generator.parameters.first.value;
                        let upper = generator.parameters.second.value;
                        if (i === igen_index) {
                            if (key < lower || key > upper) {
                                continue outer;
                            }
                        }
                    }
                    else if (type === soundfont.GeneratorType.VEL_RANGE) {
                        let lower = generator.parameters.first.value;
                        let upper = generator.parameters.second.value;
                        if (i === igen_index || i === igen_index + 1) {
                            if (velocity < lower || velocity > upper) {
                                continue outer;
                            }
                        }
                    }
                    else if (type === soundfont.GeneratorType.MOD_LFO_DELAY) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
                        params.lfo.mod.delay_tc = value;
                    }
                    else if (type === soundfont.GeneratorType.MOD_LFO_FREQ) {
                        let value = generator.parameters.signed.value;
                        params.lfo.mod.freq_hz = 8.176 * 2 ** (value / 1200);
                    }
                    else if (type === soundfont.GeneratorType.MOD_LFO_TO_PITCH) {
                        let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 12000));
                        params.lfo.mod.to_pitch_c = value;
                    }
                    else if (type === soundfont.GeneratorType.MOD_LFO_TO_VOLUME) {
                        let value = generator.parameters.signed.value;
                        params.lfo.mod.to_volume_cb = value;
                    }
                    else if (type === soundfont.GeneratorType.SAMPLE_ID) {
                        params.sample.index = generator.parameters.signed.value;
                        return params;
                    }
                    else if (type === soundfont.GeneratorType.SAMPLE_MODES) {
                        // TODO: Support loop during key depression (mode 3).
                        let value = generator.parameters.signed.value;
                        if (value >= 0 && value <= 3) {
                            params.sample.loop = value === 1;
                        }
                    }
                    else if (type === soundfont.GeneratorType.OVERRIDING_ROOT_KEY) {
                        let value = generator.parameters.signed.value;
                        if (value >= 0 && value <= 127) {
                            params.sample.root_key_override = value;
                        }
                    }
                    else if (type === soundfont.GeneratorType.START_ADDRESS_OFFSET) {
                        let value = generator.parameters.signed.value;
                    }
                    else if (type === soundfont.GeneratorType.PAN) {
                        let value = generator.parameters.signed.value;
                    }
                    else {
                        //console.log(soundfont.GeneratorType[type], generator.parameters.signed.value);
                    }
                }
            }
            throw ``;
        }
        async makeChannel(context, midikey, velocity, mixer, channel) {
            let params = this.getParms(midikey, velocity);
            let sample_header = this.file.shdr[params.sample.index];
            let buffer = this.buffers.get(params.sample.index);
            if (shared_1.is.absent(buffer)) {
                let sample_count = sample_header.end.value - sample_header.start.value;
                let reader = this.file.smpl;
                let cursor = new binary_1.Cursor({ offset: sample_header.start.value * 2 });
                buffer = context.createBuffer(1, sample_count, sample_header.sample_rate.value);
                let ab = new ArrayBuffer(sample_count * 2);
                let b = new binary_1.Buffer(ab);
                await new binary_1.Chunk(b).load(cursor, reader);
                let c = buffer.getChannelData(0);
                let v = new Int16Array(ab);
                for (let s = 0; s < sample_count; s++) {
                    let value = ((v[s] + 32768) / 65535) * 2.0 - 1.0;
                    c[s] = value;
                }
                this.buffers.set(params.sample.index, buffer);
                console.log(channel, JSON.stringify(params, null, 2));
            }
            let root_key_semitones = params.sample.root_key_override ?? sample_header.original_key.value;
            let mod_lfo_osc = context.createOscillator();
            mod_lfo_osc.type = "triangle";
            mod_lfo_osc.frequency.value = params.lfo.mod.freq_hz;
            let mod_lfo_delayed = context.createDelay(20);
            mod_lfo_delayed.delayTime.value = 2 ** (params.lfo.mod.delay_tc / 1200);
            mod_lfo_osc.connect(mod_lfo_delayed);
            let mod_lfo_gained = context.createGain();
            mod_lfo_delayed.connect(mod_lfo_gained);
            mod_lfo_gained.gain.value = 1 - Math.pow(10, (params.lfo.mod.to_volume_cb) / 200); // should not add 1.02 but 0.02
            let source = context.createBufferSource();
            //source.detune.value = -500;
            source.buffer = buffer;
            source.loopStart = (sample_header.loop_start.value - sample_header.start.value) / sample_header.sample_rate.value;
            source.loopEnd = (sample_header.loop_end.value - sample_header.start.value) / sample_header.sample_rate.value;
            source.loop = params.sample.loop;
            let initial_attenuation = context.createGain();
            source.connect(initial_attenuation);
            // OKish
            initial_attenuation.gain.value = Math.pow(10, -(params.sample.attenuation_cb + 960 * (1 - velocity / 128) * (1 - velocity / 128)) / 200);
            let lowpass_filter = context.createBiquadFilter();
            initial_attenuation.connect(lowpass_filter);
            lowpass_filter.type = "lowpass";
            // OK
            let initial_filter_cutoff_hz = 8.176 * 2 ** ((params.filter.cutoff_c - 2400 * (1 - velocity / 128)) / 1200);
            lowpass_filter.frequency.value = initial_filter_cutoff_hz;
            lowpass_filter.Q.value = params.filter.q_cb / 10;
            let amplifier = context.createGain();
            amplifier.gain.value = 0;
            lowpass_filter.connect(amplifier);
            if (params.lfo.mod.to_volume_cb > 0) {
                mod_lfo_gained.connect(amplifier.gain);
            }
            let vol_env = context.createConstantSource();
            vol_env.offset.value = 0;
            vol_env.connect(amplifier.gain);
            let mod_env = context.createConstantSource();
            mod_env.offset.value = 0;
            let modenv_to_pitch_source = context.createConstantSource();
            {
                let gain = context.createGain();
                gain.gain.value = 0;
                modenv_to_pitch_source.offset.value = params.env.mod.to_pitch_c;
                modenv_to_pitch_source.connect(gain);
                mod_env.connect(gain.gain);
                gain.connect(source.detune);
            }
            let detune_source = context.createConstantSource();
            //midikey = channel === 9 ? root_key_semitones : midikey
            let detune_cents = (midikey - root_key_semitones) * 100 + sample_header.correction.value;
            detune_source.offset.value = detune_cents;
            detune_source.connect(source.detune);
            let mod_lfo_to_pitch_const = context.createConstantSource();
            {
                let gain = context.createGain();
                gain.gain.value = 0;
                mod_lfo_to_pitch_const.offset.value = params.lfo.mod.to_pitch_c;
                mod_lfo_to_pitch_const.connect(gain);
                mod_lfo_delayed.connect(gain.gain);
                gain.connect(source.detune);
            }
            function start() {
                let t0 = context.currentTime;
                {
                    let t1 = t0 + 2 ** (params.env.mod.delay_tc / 1200);
                    let t2 = t1 + 2 ** (params.env.mod.attack_tc / 1200);
                    let t3 = t2 + (2 ** (params.env.mod.hold_tc / 1200) * params.env.mod.hold_time_factor);
                    let t4 = t3 + (2 ** (params.env.mod.deacy_tc / 1200) * params.env.mod.decay_time_factor);
                    mod_env.offset.cancelScheduledValues(t0);
                    mod_env.offset.setTargetAtTime(1.0, t1, (t2 - t1) * 2 / 3);
                    mod_env.offset.linearRampToValueAtTime(1.0, t3);
                    mod_env.offset.linearRampToValueAtTime(params.env.mod.sustain_level, t4);
                }
                {
                    let t1 = t0 + 2 ** (params.env.vol.delay_tc / 1200);
                    let t2 = t1 + 2 ** (params.env.vol.attack_tc / 1200);
                    let t3 = t2 + (2 ** (params.env.vol.hold_tc / 1200) * params.env.vol.hold_time_factor);
                    let t4 = t3 + (2 ** (params.env.vol.deacy_tc / 1200) * params.env.vol.decay_time_factor);
                    vol_env.offset.cancelScheduledValues(t0);
                    vol_env.offset.setTargetAtTime(1.0, t1, (t2 - t1) * 2 / 3);
                    vol_env.offset.linearRampToValueAtTime(1.0, t3);
                    vol_env.offset.linearRampToValueAtTime(params.env.vol.sustain_level, t4);
                }
                amplifier.connect(mixer);
                source.start();
                mod_lfo_osc.start();
                mod_env.start();
                vol_env.start();
                modenv_to_pitch_source.start();
                detune_source.start();
                mod_lfo_to_pitch_const.start();
            }
            function stop() {
                amplifier.disconnect();
                source.stop();
                mod_lfo_osc.stop();
                mod_env.stop();
                vol_env.stop();
                modenv_to_pitch_source.stop();
                detune_source.stop();
                mod_lfo_to_pitch_const.stop();
            }
            function release(midikey, velocity) {
                let t0 = context.currentTime;
                let tm = 2 ** (params.env.mod.release_tc / 1200);
                let tv = 2 ** (params.env.vol.release_tc / 1200);
                tm *= (1 - velocity / 128);
                tv *= (1 - velocity / 128);
                mod_env.offset.cancelScheduledValues(t0);
                mod_env.offset.linearRampToValueAtTime(0.0, t0 + tm);
                vol_env.offset.cancelScheduledValues(t0);
                vol_env.offset.linearRampToValueAtTime(0.0, t0 + tv);
                setTimeout(stop, (context.baseLatency + tv) * 1000);
            }
            return {
                start,
                stop,
                release
            };
        }
    }
    exports.Program = Program;
    ;
    class Bank {
        programs;
        constructor() {
            this.programs = new Array();
        }
    }
    exports.Bank = Bank;
    ;
    class WavetableSynth {
        banks;
        constructor() {
            this.banks = new Array();
            for (let i = 0; i < 255; i++) {
                this.banks.push(new Bank());
            }
        }
        static async fromSoundfont(file) {
            let synth = new WavetableSynth();
            outer: for (let preset_header of file.phdr) {
                let bank = synth.banks[preset_header.bank.value];
                if (shared_1.is.absent(bank)) {
                    continue;
                }
                let program = bank.programs[preset_header.preset.value];
                let preset_bag = file.pbag[preset_header.pbag_index.value];
                if (shared_1.is.absent(preset_bag)) {
                    continue;
                }
                let preset_generator = file.pgen[preset_bag.pgen_index.value];
                if (shared_1.is.absent(preset_generator)) {
                    continue;
                }
                let preset_generator_index = preset_generator.generator.type.value;
                if (preset_generator_index !== 41) {
                    continue;
                }
                let instrument = file.inst[preset_generator.parameters.signed.value];
                if (shared_1.is.absent(instrument)) {
                    continue;
                }
                let next_instrument = file.inst[preset_generator.parameters.signed.value + 1];
                if (shared_1.is.absent(next_instrument)) {
                    continue;
                }
                program = new Program();
                program.file = file;
                program.name = preset_header.name.value;
                for (let i = instrument.ibag_index.value; i < next_instrument.ibag_index.value; i++) {
                    let instrument_bag = file.ibag[i];
                    if (shared_1.is.absent(instrument_bag)) {
                        continue;
                    }
                    program.igen_indices.push(instrument_bag.igen_index.value);
                }
                bank.programs[preset_header.preset.value] = program;
            }
            return synth;
        }
    }
    exports.WavetableSynth = WavetableSynth;
    ;
});
define("client/index", ["require", "exports", "shared/index", "shared/binary.web/index", "shared/formats/index", "client/synth"], function (require, exports, shared, binary, formats_1, synth_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    Object.defineProperty(exports, "__esModule", { value: true });
    const OVERRIDE = false;
    const ZOOM = 1;
    let keysle = document.createElement("div");
    keysle.setAttribute("style", "position: absolute; z-index: 10; width: 100%; height: 100%; display: grid; grid-template-columns: repeat(auto-fill, 400px); pointer-events: none;");
    let keys = new Array();
    for (let i = 0; i < 16; i++) {
        let key = document.createElement("h2");
        key.setAttribute("style", "font-size: 60px; color: white; white-space: nowrap;");
        key.innerHTML = `[${i === 9 ? "D" : i}]:`;
        keysle.appendChild(key);
        keys.push(key);
    }
    if (OVERRIDE) {
        document.body.appendChild(keysle);
    }
    var is;
    (function (is) {
        function absent(subject) {
            return subject == null;
        }
        is.absent = absent;
        ;
        function present(subject) {
            return subject != null;
        }
        is.present = present;
        ;
    })(is || (is = {}));
    ;
    var assert;
    (function (assert_1) {
        function assert(assertion) {
            if (!assertion) {
                throw `Assertion failed!`;
            }
        }
        assert_1.assert = assert;
        function between(min, value, max) {
            if ((value < min) || (value > max)) {
                throw `Expected ${value} to be an integer between ${min} and ${max}!`;
            }
        }
        assert_1.between = between;
        function identical(one, two) {
            if (one !== two) {
                throw `Expected ${one} to be identical to ${two}!`;
            }
        }
        assert_1.identical = identical;
    })(assert || (assert = {}));
    class BufferLike {
        buffer;
        endianness;
        constructor(buffer, endianness = "BigEndian") {
            this.buffer = buffer;
            this.endianness = endianness;
        }
        ui16(offset, endianness = this.endianness) {
            return new ui16(endianness, this.buffer, offset);
        }
    }
    class BufferDataProvider {
        buffer;
        constructor(buffer) {
            this.buffer = buffer;
        }
        async read(cursor, buffer, offset, length) {
            offset = offset ?? 0;
            length = length ?? (buffer.byteLength - offset);
            let slice = this.buffer.slice(cursor, cursor + length);
            let source = new Uint8Array(slice);
            let target = new Uint8Array(buffer, offset, length);
            target.set(source, 0);
            return length;
        }
        size() {
            return this.buffer.byteLength;
        }
    }
    class FileDataProvider {
        file;
        constructor(file) {
            this.file = file;
        }
        async buffer() {
            let buffer = new ArrayBuffer(this.size());
            await this.read(0, buffer);
            return new BufferDataProvider(buffer);
        }
        async read(cursor, buffer, offset, length) {
            offset = offset ?? 0;
            length = length ?? (buffer.byteLength - offset);
            assert.between(0, offset, buffer.byteLength);
            assert.between(0, length, buffer.byteLength - offset);
            let blob = this.file.slice(cursor, cursor + length);
            let source = new Uint8Array(await blob.arrayBuffer());
            let target = new Uint8Array(buffer, offset, length);
            target.set(source, 0);
            return length;
        }
        size() {
            return this.file.size;
        }
    }
    class si08 {
        endianness;
        view;
        get value() {
            return this.view.getInt8(0);
        }
        set value(next) {
            let last = this.value;
            this.view.setInt8(0, next);
            if (this.value !== next) {
                this.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(endianness, buffer = new ArrayBuffer(1), offset = 0) {
            assert.between(0, offset, buffer.byteLength - 1);
            this.endianness = endianness;
            this.view = new DataView(buffer, offset, 1);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
            return length;
        }
    }
    class si16 {
        endianness;
        view;
        get value() {
            return this.view.getInt16(0, this.endianness === "LittleEndian");
        }
        set value(next) {
            let last = this.value;
            this.view.setUint16(0, next, this.endianness === "LittleEndian");
            if (this.value !== next) {
                this.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(endianness, buffer = new ArrayBuffer(2), offset = 0) {
            assert.between(0, offset, buffer.byteLength - 2);
            this.endianness = endianness;
            this.view = new DataView(buffer, offset, 2);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
            return length;
        }
    }
    class si24 {
        integer;
        get value() {
            let value = this.integer.value;
            if (value > 0x7FFFFF) {
                value -= 0x1000000;
            }
            return value;
        }
        set value(next) {
            if (next < 0) {
                next += 0x1000000;
            }
            this.integer.value = next;
        }
        constructor(endianness, buffer = new ArrayBuffer(3), offset = 0) {
            this.integer = new ui24(endianness, buffer, offset);
        }
        async load(cursor, dataProvider) {
            return this.integer.load(cursor, dataProvider);
        }
    }
    class si32 {
        endianness;
        view;
        get value() {
            return this.view.getInt32(0, this.endianness === "LittleEndian");
        }
        set value(next) {
            let last = this.value;
            this.view.setInt32(0, next, this.endianness === "LittleEndian");
            if (this.value !== next) {
                this.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(endianness, buffer = new ArrayBuffer(4), offset = 0) {
            assert.between(0, offset, buffer.byteLength - 4);
            this.endianness = endianness;
            this.view = new DataView(buffer, offset, 4);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
            return length;
        }
    }
    class ui08 {
        endianness;
        view;
        get value() {
            return this.view.getUint8(0);
        }
        set value(next) {
            let last = this.value;
            this.view.setUint8(0, next);
            if (this.value !== next) {
                this.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(endianness, buffer = new ArrayBuffer(1), offset = 0) {
            assert.between(0, offset, buffer.byteLength - 1);
            this.endianness = endianness;
            this.view = new DataView(buffer, offset, 1);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
            return length;
        }
    }
    class ui16 {
        endianness;
        view;
        get value() {
            return this.view.getUint16(0, this.endianness === "LittleEndian");
        }
        set value(next) {
            let last = this.value;
            this.view.setUint16(0, next, this.endianness === "LittleEndian");
            if (this.value !== next) {
                this.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(endianness, buffer = new ArrayBuffer(2), offset = 0) {
            assert.between(0, offset, buffer.byteLength - 2);
            this.endianness = endianness;
            this.view = new DataView(buffer, offset, 2);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
            return length;
        }
    }
    class ui24 {
        endianness;
        view;
        get value() {
            let a = this.view.getUint8(0);
            let b = this.view.getUint8(1);
            let c = this.view.getUint8(2);
            if (this.endianness === "LittleEndian") {
                return (c << 16) | (b << 8) | (a << 0);
            }
            else {
                return (a << 16) | (b << 8) | (c << 0);
            }
        }
        set value(next) {
            let last = this.value;
            let a = (next >>> 0) & 0xFF;
            let b = (next >>> 8) & 0xFF;
            let c = (next >>> 16) & 0xFF;
            if (this.endianness === "LittleEndian") {
                this.view.setUint8(0, a);
                this.view.setUint8(1, b);
                this.view.setUint8(2, c);
            }
            else {
                this.view.setUint8(0, c);
                this.view.setUint8(1, b);
                this.view.setUint8(2, a);
            }
            if (this.value !== next) {
                this.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(endianness, buffer = new ArrayBuffer(3), offset = 0) {
            assert.between(0, offset, buffer.byteLength - 3);
            this.endianness = endianness;
            this.view = new DataView(buffer, offset, 3);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
            return length;
        }
    }
    class ui32 {
        endianness;
        view;
        get value() {
            return this.view.getUint32(0, this.endianness === "LittleEndian");
        }
        set value(next) {
            let last = this.value;
            this.view.setUint32(0, next, this.endianness === "LittleEndian");
            if (this.value !== next) {
                this.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(endianness, buffer = new ArrayBuffer(4), offset = 0) {
            assert.between(0, offset, buffer.byteLength - 4);
            this.endianness = endianness;
            this.view = new DataView(buffer, offset, 4);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
            return length;
        }
    }
    class pi08 {
        integer;
        offset;
        length;
        get value() {
            let a = 32 - (this.offset + this.length);
            let b = 32 - (this.length);
            return (this.integer.value << a) >>> b;
        }
        set value(next) {
            let last = this.integer.value;
            let a = this.offset;
            let b = 32 - (this.length);
            let c = 32 - (this.offset + this.length);
            let m = ((0xFFFFFFFF >> a) << b) >>> c;
            this.integer.value = ((this.integer.value & ~m) | ((next << a) & m)) >>> 0;
            if (this.value !== next) {
                this.integer.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(integer, offset, length) {
            assert.between(0, offset, 8 - 1);
            assert.between(1, length, 8 - offset);
            this.integer = integer;
            this.offset = offset;
            this.length = length;
        }
    }
    class pi16 {
        integer;
        offset;
        length;
        get value() {
            let a = 32 - (this.offset + this.length);
            let b = 32 - (this.length);
            return (this.integer.value << a) >>> b;
        }
        set value(next) {
            let last = this.integer.value;
            let a = this.offset;
            let b = 32 - (this.length);
            let c = 32 - (this.offset + this.length);
            let m = ((0xFFFFFFFF >> a) << b) >>> c;
            this.integer.value = ((this.integer.value & ~m) | ((next << a) & m)) >>> 0;
            if (this.value !== next) {
                this.integer.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(integer, offset, length) {
            assert.between(0, offset, 16 - 1);
            assert.between(1, length, 16 - offset);
            this.integer = integer;
            this.offset = offset;
            this.length = length;
        }
    }
    class pi24 {
        integer;
        offset;
        length;
        get value() {
            let a = 32 - (this.offset + this.length);
            let b = 32 - (this.length);
            return (this.integer.value << a) >>> b;
        }
        set value(next) {
            let last = this.integer.value;
            let a = this.offset;
            let b = 32 - (this.length);
            let c = 32 - (this.offset + this.length);
            let m = ((0xFFFFFFFF >> a) << b) >>> c;
            this.integer.value = ((this.integer.value & ~m) | ((next << a) & m)) >>> 0;
            if (this.value !== next) {
                this.integer.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(integer, offset, length) {
            assert.between(0, offset, 24 - 1);
            assert.between(1, length, 24 - offset);
            this.integer = integer;
            this.offset = offset;
            this.length = length;
        }
    }
    class pi32 {
        integer;
        offset;
        length;
        get value() {
            let a = 32 - (this.offset + this.length);
            let b = 32 - (this.length);
            return (this.integer.value << a) >>> b;
        }
        set value(next) {
            let last = this.integer.value;
            let a = this.offset;
            let b = 32 - (this.length);
            let c = 32 - (this.offset + this.length);
            let m = ((0xFFFFFFFF >> a) << b) >>> c;
            this.integer.value = ((this.integer.value & ~m) | ((next << a) & m)) >>> 0;
            if (this.value !== next) {
                this.integer.value = last;
                throw `Unexpectedly encoded ${next} as ${this.value}!`;
            }
        }
        constructor(integer, offset, length) {
            assert.between(0, offset, 32 - 1);
            assert.between(1, length, 32 - offset);
            this.integer = integer;
            this.offset = offset;
            this.length = length;
        }
    }
    class text {
        decoder;
        encoder;
        view;
        get value() {
            return this.decoder.decode(this.view).replace(/([\u0000]*)$/, "");
        }
        set value(next) {
            let last = this.value;
            this.view.fill(0);
            this.encoder.encodeInto(next, this.view);
            if (this.value !== next) {
                this.value = last;
                throw `Unexpectedly encoded "${next}" as "${this.value}"!`;
            }
        }
        constructor(buffer, offset, length) {
            offset = offset ?? 0;
            length = length ?? (buffer.byteLength - offset);
            assert.between(0, offset, buffer.byteLength);
            assert.between(0, length, buffer.byteLength - offset);
            this.decoder = new TextDecoder();
            this.encoder = new TextEncoder();
            this.view = new Uint8Array(buffer, offset, length);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.view.buffer, this.view.byteOffset, this.view.byteLength);
            return length;
        }
    }
    class ArchiveHeader {
        buffer;
        version;
        recordCount;
        constructor(endianness) {
            this.buffer = new ArrayBuffer(8);
            this.version = new ui32(endianness, this.buffer, 0);
            this.recordCount = new ui32(endianness, this.buffer, 4);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.buffer);
            return length;
        }
    }
    class RecordHeader {
        buffer;
        uncompressedSize;
        isCompressed;
        constructor(endianness) {
            this.buffer = new ArrayBuffer(4);
            let integer = new ui32(endianness, this.buffer, 0);
            this.uncompressedSize = new pi32(integer, 0, 24);
            this.isCompressed = new pi32(integer, 29, 1);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.buffer);
            return length;
        }
    }
    class Archive {
        dataProvider;
        endianness;
        async decompress(cursor, buffer) {
            let array = new Uint8Array(buffer);
            let shift = 8;
            let bytesWritten = 0;
            let control = new Uint8Array(1);
            let byte = new Uint8Array(1);
            let history = new Uint8Array(1 << 12);
            let historyPosition = 0;
            function append(byte) {
                history[historyPosition] = byte;
                historyPosition += 1;
                historyPosition %= (1 << 12);
                array[bytesWritten] = byte;
                bytesWritten += 1;
            }
            let data = new ui16(this.endianness);
            let dataOffset = new pi16(data, 0, 12);
            let dataLength = new pi16(data, 12, 4);
            while (bytesWritten < buffer.byteLength) {
                if (shift >= 8) {
                    cursor += await this.dataProvider.read(cursor, control.buffer);
                    shift = 0;
                }
                let bit = (control[0] >> shift) & 0x01;
                shift += 1;
                if (bit) {
                    cursor += await this.dataProvider.read(cursor, byte.buffer);
                    append(byte[0]);
                }
                else {
                    cursor += await data.load(cursor, this.dataProvider);
                    let offset = dataOffset.value;
                    let length = dataLength.value + 3;
                    for (let i = offset; i < offset + length; i++) {
                        append(history[i % (1 << 12)]);
                    }
                }
            }
        }
        constructor(dataProvider, endianness) {
            this.dataProvider = dataProvider;
            this.endianness = endianness;
        }
        async getRecord(index) {
            let archiveHeader = new ArchiveHeader(this.endianness);
            let cursor = 0;
            cursor += await archiveHeader.load(cursor, this.dataProvider);
            assert.between(0, index, archiveHeader.recordCount.value - 1);
            cursor += index * 4;
            let offset = new ui32(this.endianness);
            cursor += await offset.load(cursor, this.dataProvider);
            let recordHeader = new RecordHeader(this.endianness);
            cursor = offset.value;
            cursor += await recordHeader.load(cursor, this.dataProvider);
            let buffer = new ArrayBuffer(recordHeader.uncompressedSize.value);
            if (recordHeader.isCompressed.value) {
                await this.decompress(cursor, buffer);
            }
            else {
                await this.dataProvider.read(cursor, buffer);
            }
            return new BufferDataProvider(buffer);
        }
    }
    class VocHeader {
        buffer;
        identifier;
        size;
        version;
        validity;
        constructor(endianness) {
            this.buffer = new ArrayBuffer(26);
            this.identifier = new text(this.buffer, 0, 20);
            this.size = new ui16(endianness, this.buffer, 20);
            this.version = new ui16(endianness, this.buffer, 22);
            this.validity = new ui16(endianness, this.buffer, 24);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.buffer);
            return length;
        }
    }
    class VocSoundDataHeader {
        buffer;
        frequency;
        codec;
        constructor(endianness) {
            this.buffer = new ArrayBuffer(2);
            this.frequency = new ui08(endianness, this.buffer, 0);
            this.codec = new ui08(endianness, this.buffer, 1);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.buffer);
            return length;
        }
    }
    var VocCodecType;
    (function (VocCodecType) {
        VocCodecType[VocCodecType["PCM_8BIT_UNSIGNED"] = 0] = "PCM_8BIT_UNSIGNED";
        VocCodecType[VocCodecType["CREATIVE_ADPCM_4BIT_8BIT"] = 1] = "CREATIVE_ADPCM_4BIT_8BIT";
        VocCodecType[VocCodecType["CREATIVE_ADPCM_3BIT_8BIT"] = 2] = "CREATIVE_ADPCM_3BIT_8BIT";
        VocCodecType[VocCodecType["CREATIVE_ADPCM_2BIT_8BIT"] = 3] = "CREATIVE_ADPCM_2BIT_8BIT";
        VocCodecType[VocCodecType["PCM_16BIT_SIGNED"] = 4] = "PCM_16BIT_SIGNED";
        VocCodecType[VocCodecType["UNKNOWN"] = 5] = "UNKNOWN";
        VocCodecType[VocCodecType["ALAW"] = 6] = "ALAW";
        VocCodecType[VocCodecType["ULAW"] = 7] = "ULAW";
    })(VocCodecType || (VocCodecType = {}));
    ;
    var VocBlockType;
    (function (VocBlockType) {
        VocBlockType[VocBlockType["TERMINATOR"] = 0] = "TERMINATOR";
        VocBlockType[VocBlockType["SOUND_DATA"] = 1] = "SOUND_DATA";
        VocBlockType[VocBlockType["CONTINUED_SOUND_DATA"] = 2] = "CONTINUED_SOUND_DATA";
        VocBlockType[VocBlockType["SILENCE"] = 3] = "SILENCE";
        VocBlockType[VocBlockType["MARKER"] = 4] = "MARKER";
        VocBlockType[VocBlockType["TEXT"] = 5] = "TEXT";
        VocBlockType[VocBlockType["REPEAT_START"] = 6] = "REPEAT_START";
        VocBlockType[VocBlockType["REPEAT_END"] = 7] = "REPEAT_END";
        VocBlockType[VocBlockType["EXTRA_INFO"] = 8] = "EXTRA_INFO";
        VocBlockType[VocBlockType["NEW_SOUND_DATA"] = 9] = "NEW_SOUND_DATA";
    })(VocBlockType || (VocBlockType = {}));
    ;
    class VocFile {
        endianness;
        header;
        blocks;
        constructor(endianness = "LittleEndian") {
            this.endianness = endianness;
            this.header = new VocHeader(endianness);
            this.blocks = new Array();
        }
        async load(dataProvider) {
            this.blocks.splice(0, this.blocks.length);
            let cursor = 0;
            cursor += await this.header.load(cursor, dataProvider);
            assert.identical(this.header.identifier.value, "Creative Voice File\x1A");
            while (cursor < dataProvider.size()) {
                let type = new ui08(this.endianness);
                cursor += await type.load(cursor, dataProvider);
                if (type.value === VocBlockType.TERMINATOR) {
                    this.blocks.push({
                        type: type.value,
                        buffer: new ArrayBuffer(0)
                    });
                    break;
                }
                else if (type.value === VocBlockType.REPEAT_END) {
                    this.blocks.push({
                        type: type.value,
                        buffer: new ArrayBuffer(0)
                    });
                }
                else {
                    let size = new ui24(this.endianness);
                    cursor += await size.load(cursor, dataProvider);
                    let buffer = new ArrayBuffer(size.value);
                    cursor += await dataProvider.read(cursor, buffer);
                    this.blocks.push({
                        type: type.value,
                        buffer: buffer
                    });
                }
            }
            return this;
        }
        async play() {
            if (is.absent(audio_context)) {
                audio_context = new AudioContext();
            }
            if (this.blocks.length === 0) {
                return;
            }
            let block = this.blocks[0];
            if (block.type !== VocBlockType.SOUND_DATA) {
                throw `Unsupported voc block!`;
            }
            let dataProvider = new BufferDataProvider(block.buffer);
            let cursor = 0;
            let header = new VocSoundDataHeader(this.endianness);
            cursor += await header.load(cursor, dataProvider);
            if (![VocCodecType.PCM_8BIT_UNSIGNED, VocCodecType.PCM_16BIT_SIGNED].includes(header.codec.value)) {
                throw `Unsupported voc codec!`;
            }
            let channels = 1;
            let bytesPerChannel = header.codec.value === VocCodecType.PCM_8BIT_UNSIGNED ? 1 : 2;
            let bytesPerFrame = bytesPerChannel * channels;
            let samples = (dataProvider.size() - cursor) / bytesPerFrame;
            let sampleRate = Math.floor(1000000 / (256 - header.frequency.value));
            let buffer = audio_context.createBuffer(channels, samples, sampleRate);
            if (bytesPerChannel === 1) {
                let sample = new ui08(this.endianness);
                for (let s = 0; s < samples; s++) {
                    for (let c = 0; c < channels; c++) {
                        cursor += await sample.load(cursor, dataProvider);
                        let value = ((sample.value + 0) / 255) * 2.0 - 1.0;
                        buffer.getChannelData(c)[s] = value;
                    }
                }
            }
            else if (bytesPerChannel === 2) {
                let sample = new si16(this.endianness);
                for (let s = 0; s < samples; s++) {
                    for (let c = 0; c < channels; c++) {
                        cursor += await sample.load(cursor, dataProvider);
                        let value = ((sample.value + 32768) / 65535) * 2.0 - 1.0;
                        buffer.getChannelData(c)[s] = value;
                    }
                }
            }
            else {
                throw `Expected 8 or 16 bits per sample!`;
            }
            let source = audio_context.createBufferSource();
            source.buffer = buffer;
            source.connect(audio_context.destination);
            source.start();
        }
    }
    class RiffChunkHeader {
        buffer;
        id;
        size;
        constructor(endianness) {
            this.buffer = new ArrayBuffer(8);
            this.id = new text(this.buffer, 0, 4);
            this.size = new ui32(endianness, this.buffer, 4);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.buffer);
            return length;
        }
    }
    class WavHeader {
        buffer;
        audioFormat;
        numChannels;
        sampleRate;
        byteRate;
        blockAlign;
        bitsPerSample;
        constructor(endianness) {
            this.buffer = new ArrayBuffer(16);
            this.audioFormat = new ui16(endianness, this.buffer, 0);
            this.numChannels = new ui16(endianness, this.buffer, 2);
            this.sampleRate = new ui32(endianness, this.buffer, 4);
            this.byteRate = new ui32(endianness, this.buffer, 8);
            this.blockAlign = new ui16(endianness, this.buffer, 12);
            this.bitsPerSample = new ui16(endianness, this.buffer, 14);
        }
        async load(cursor, dataProvider) {
            let length = 0;
            length += await dataProvider.read(cursor + length, this.buffer);
            return length;
        }
    }
    var XMIEventType;
    (function (XMIEventType) {
        XMIEventType[XMIEventType["NOTE_OFF"] = 8] = "NOTE_OFF";
        XMIEventType[XMIEventType["NOTE_ON"] = 9] = "NOTE_ON";
        XMIEventType[XMIEventType["KEY_PRESSURE"] = 10] = "KEY_PRESSURE";
        XMIEventType[XMIEventType["CONTROLLER"] = 11] = "CONTROLLER";
        XMIEventType[XMIEventType["INSTRUMENT_CHANGE"] = 12] = "INSTRUMENT_CHANGE";
        XMIEventType[XMIEventType["CHANNEL_PRESSURE"] = 13] = "CHANNEL_PRESSURE";
        XMIEventType[XMIEventType["PITCH_BEND"] = 14] = "PITCH_BEND";
        XMIEventType[XMIEventType["SYSEX"] = 15] = "SYSEX";
    })(XMIEventType || (XMIEventType = {}));
    ;
    class XmiFile {
        events;
        constructor() {
            this.events = new Array();
        }
        readVarlen(buffer, cursor) {
            let value = 0;
            for (let i = 0; i < 4; i++) {
                let byte = buffer[cursor.offset++];
                value = (value << 7) | (byte & 0x7F);
                if (byte < 128) {
                    break;
                }
            }
            return value;
        }
        async loadEvents(array) {
            this.events.splice(0, this.events.length);
            let cursor = {
                offset: 0
            };
            let timestamp = 0;
            while (cursor.offset < array.length) {
                let byte = array[cursor.offset++];
                let delay = 0;
                if (byte < 0x80) {
                    cursor.offset -= 1;
                    while (true) {
                        byte = array[cursor.offset++];
                        if (byte > 0x7F) {
                            cursor.offset -= 1;
                            break;
                        }
                        delay += byte;
                        if (byte < 0x7F) {
                            break;
                        }
                    }
                    byte = array[cursor.offset++];
                }
                timestamp += delay;
                let event = (byte >> 4) & 0x0F;
                let channel = (byte >> 0) & 0x0F;
                if (event < 0x08) {
                    throw `Invalid event!`;
                }
                else if (event === 0x8) {
                    let a = array[cursor.offset++];
                    let b = array[cursor.offset++];
                    this.events.push({
                        index: this.events.length,
                        type: XMIEventType.NOTE_OFF,
                        channel: channel,
                        time: timestamp,
                        data: Uint8Array.of(a, b)
                    });
                }
                else if (event === 0x9) {
                    let a = array[cursor.offset++];
                    let b = array[cursor.offset++];
                    let ticks = this.readVarlen(array, cursor);
                    this.events.push({
                        index: this.events.length,
                        type: XMIEventType.NOTE_ON,
                        channel: channel,
                        time: timestamp,
                        data: Uint8Array.of(a, b)
                    });
                    this.events.push({
                        index: this.events.length,
                        type: XMIEventType.NOTE_OFF,
                        channel: channel,
                        time: timestamp + ticks,
                        data: Uint8Array.of(a, b)
                    });
                }
                else if (event === 0xA) {
                    let a = array[cursor.offset++];
                    let b = array[cursor.offset++];
                    this.events.push({
                        index: this.events.length,
                        type: XMIEventType.KEY_PRESSURE,
                        channel: channel,
                        time: timestamp,
                        data: Uint8Array.of(a, b)
                    });
                }
                else if (event === 0xB) {
                    let a = array[cursor.offset++];
                    let b = array[cursor.offset++];
                    this.events.push({
                        index: this.events.length,
                        type: XMIEventType.CONTROLLER,
                        channel: channel,
                        time: timestamp,
                        data: Uint8Array.of(a, b)
                    });
                }
                else if (event === 0xC) {
                    let a = array[cursor.offset++];
                    this.events.push({
                        index: this.events.length,
                        type: XMIEventType.INSTRUMENT_CHANGE,
                        channel: channel,
                        time: timestamp,
                        data: Uint8Array.of(a)
                    });
                }
                else if (event === 0xD) {
                    let a = array[cursor.offset++];
                    this.events.push({
                        index: this.events.length,
                        type: XMIEventType.CHANNEL_PRESSURE,
                        channel: channel,
                        time: timestamp,
                        data: Uint8Array.of(a)
                    });
                }
                else if (event === 0xE) {
                    let a = array[cursor.offset++];
                    let b = array[cursor.offset++];
                    this.events.push({
                        index: this.events.length,
                        type: XMIEventType.PITCH_BEND,
                        channel: channel,
                        time: timestamp,
                        data: Uint8Array.of(a, b)
                    });
                }
                else if (event === 0xF) {
                    if (channel < 0xF) {
                        let size = this.readVarlen(array, cursor);
                        let data = array.slice(cursor.offset, cursor.offset + size);
                        cursor.offset += size;
                        this.events.push({
                            index: this.events.length,
                            type: XMIEventType.SYSEX,
                            channel: channel,
                            time: timestamp,
                            data: data
                        });
                    }
                    else {
                        let type = array[cursor.offset++];
                        let size = this.readVarlen(array, cursor);
                        let data = array.slice(cursor.offset, cursor.offset + size);
                        cursor.offset += size;
                        if (type !== 0x51 && type !== 0x58) {
                            this.events.push({
                                index: this.events.length,
                                type: XMIEventType.SYSEX,
                                channel: channel,
                                time: timestamp,
                                data: Uint8Array.of(type, ...data)
                            });
                        }
                        if (type === 0x2F) {
                            break;
                        }
                    }
                }
            }
            this.events.sort((one, two) => {
                if (one.time < two.time) {
                    return -1;
                }
                if (one.time > two.time) {
                    return 1;
                }
                if (one.index < two.index) {
                    return -1;
                }
                if (one.index > two.index) {
                    return 1;
                }
                return 0;
            });
            let time = 0;
            for (let event of this.events) {
                let delay = event.time - time;
                time = event.time;
                event.time = delay;
            }
            return this;
        }
        async load(dataProvider) {
            let cursor = 0;
            let form = new RiffChunkHeader("BigEndian");
            cursor += await form.load(cursor, dataProvider);
            assert.identical(form.id.value, "FORM");
            {
                let xdir = new text(new ArrayBuffer(4));
                cursor += await xdir.load(cursor, dataProvider);
                assert.identical(xdir.value, "XDIR");
                let info = new RiffChunkHeader("BigEndian");
                cursor += await info.load(cursor, dataProvider);
                assert.identical(info.id.value, "INFO");
                cursor += info.size.value;
                cursor += info.size.value % 2;
            }
            cursor += form.size.value % 2;
            let cat = new RiffChunkHeader("BigEndian");
            cursor += await cat.load(cursor, dataProvider);
            assert.identical(cat.id.value, "CAT ");
            {
                let xmid = new text(new ArrayBuffer(4));
                cursor += await xmid.load(cursor, dataProvider);
                assert.identical(xmid.value, "XMID");
                let form = new RiffChunkHeader("BigEndian");
                cursor += await form.load(cursor, dataProvider);
                assert.identical(form.id.value, "FORM");
                {
                    let xmid = new text(new ArrayBuffer(4));
                    cursor += await xmid.load(cursor, dataProvider);
                    assert.identical(xmid.value, "XMID");
                    let timb = new RiffChunkHeader("BigEndian");
                    cursor += await timb.load(cursor, dataProvider);
                    assert.identical(timb.id.value, "TIMB");
                    cursor += timb.size.value;
                    cursor += timb.size.value % 2;
                    let evnt = new RiffChunkHeader("BigEndian");
                    cursor += await evnt.load(cursor, dataProvider);
                    assert.identical(evnt.id.value, "EVNT");
                    let array = new Uint8Array(evnt.size.value);
                    cursor += await dataProvider.read(cursor, array.buffer);
                    cursor += evnt.size.value % 2;
                    await this.loadEvents(array);
                }
                cursor += form.size.value % 2;
            }
            cursor += cat.size.value % 2;
            return this;
        }
    }
    class WavFile {
        endianness;
        header;
        buffer;
        constructor(endianness = "LittleEndian") {
            this.endianness = endianness;
            this.header = new WavHeader(endianness);
            this.buffer = new ArrayBuffer(0);
        }
        async load(dataProvider) {
            let cursor = 0;
            let chunk = new RiffChunkHeader(this.endianness);
            cursor += await chunk.load(cursor, dataProvider);
            assert.identical(chunk.id.value, "RIFF");
            let buffer = new ArrayBuffer(chunk.size.value);
            await dataProvider.read(cursor, buffer);
            {
                let dataProvider = new BufferDataProvider(buffer);
                let cursor = 0;
                let id = new text(new ArrayBuffer(4));
                cursor += await id.load(cursor, dataProvider);
                assert.identical(id.value, "WAVE");
                let format = new RiffChunkHeader(this.endianness);
                cursor += await format.load(cursor, dataProvider);
                assert.identical(format.id.value, "fmt ");
                cursor += await this.header.load(cursor, dataProvider);
                cursor += format.size.value % 2;
                let data = new RiffChunkHeader(this.endianness);
                cursor += await data.load(cursor, dataProvider);
                assert.identical(data.id.value, "data");
                this.buffer = new ArrayBuffer(data.size.value);
                length += await dataProvider.read(cursor, this.buffer);
                cursor += format.size.value % 2;
            }
            return this;
        }
        async play() {
            let channels = this.header.numChannels.value;
            let samples = this.buffer.byteLength / this.header.blockAlign.value;
            let sampleRate = this.header.sampleRate.value;
            let context = new AudioContext();
            let buffer = context.createBuffer(channels, samples, sampleRate);
            let dataProvider = new BufferDataProvider(this.buffer);
            let cursor = 0;
            if (this.header.bitsPerSample.value === 8) {
                let sample = new ui08(this.endianness);
                for (let s = 0; s < samples; s++) {
                    for (let c = 0; c < channels; c++) {
                        cursor += await sample.load(cursor, dataProvider);
                        let value = ((sample.value + 0) / 255) * 2.0 - 1.0;
                        buffer.getChannelData(c)[s] = value;
                    }
                }
            }
            else if (this.header.bitsPerSample.value === 16) {
                let sample = new si16(this.endianness);
                for (let s = 0; s < samples; s++) {
                    for (let c = 0; c < channels; c++) {
                        cursor += await sample.load(cursor, dataProvider);
                        let value = ((sample.value + 32768) / 65535) * 2.0 - 1.0;
                        buffer.getChannelData(c)[s] = value;
                    }
                }
            }
            else {
                throw `Expected 8 or 16 bits per sample!`;
            }
            let source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.start();
        }
    }
    var wc1;
    (function (wc1) {
        class MicrotileHeader {
            buffer;
            inverted;
            mirrored;
            index;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(2);
                let integer = new ui16(endianness, this.buffer);
                this.inverted = new pi16(integer, 0, 1);
                this.mirrored = new pi16(integer, 1, 1);
                this.index = new pi16(integer, 5, 11);
            }
            async load(cursor, dataProvider) {
                let length = 0;
                length += await dataProvider.read(cursor + length, this.buffer);
                return length;
            }
        }
        wc1.MicrotileHeader = MicrotileHeader;
        ;
        class TileHeader {
            layout;
            constructor(endianness) {
                let a = new MicrotileHeader(endianness);
                let b = new MicrotileHeader(endianness);
                let c = new MicrotileHeader(endianness);
                let d = new MicrotileHeader(endianness);
                this.layout = [
                    [a, b],
                    [c, d]
                ];
            }
            async load(cursor, dataProvider) {
                let length = 0;
                for (let y = 0; y < this.layout.length; y++) {
                    for (let x = 0; x < this.layout[y].length; x++) {
                        length += await this.layout[y][x].load(cursor + length, dataProvider);
                    }
                }
                return length;
            }
        }
        wc1.TileHeader = TileHeader;
        ;
        class UnitScriptHeader {
            buffer;
            spawnOffset;
            deathOffset;
            idleOffset;
            movementOffset;
            actionOffset;
            trainOffset;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(12);
                this.spawnOffset = new ui16(endianness, this.buffer, 0);
                this.deathOffset = new ui16(endianness, this.buffer, 2);
                this.idleOffset = new ui16(endianness, this.buffer, 4);
                this.movementOffset = new ui16(endianness, this.buffer, 6);
                this.actionOffset = new ui16(endianness, this.buffer, 8);
                this.trainOffset = new ui16(endianness, this.buffer, 10);
            }
            async load(cursor, dataProvider) {
                let length = 0;
                length += await dataProvider.read(cursor + length, this.buffer);
                return length;
            }
        }
        wc1.UnitScriptHeader = UnitScriptHeader;
        ;
        class ParticleScriptHeader {
            buffer;
            spawnOffset;
            movementOffset;
            hitOffset;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(6);
                this.spawnOffset = new ui16(endianness, this.buffer, 0);
                this.movementOffset = new ui16(endianness, this.buffer, 2);
                this.hitOffset = new ui16(endianness, this.buffer, 4);
            }
            async load(cursor, dataProvider) {
                let length = 0;
                length += await dataProvider.read(cursor + length, this.buffer);
                return length;
            }
        }
        wc1.ParticleScriptHeader = ParticleScriptHeader;
        ;
        class ScriptHeader {
            buffer;
            headerOffset;
            unitScriptCount;
            particleScriptCount;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(6);
                this.headerOffset = new ui16(endianness, this.buffer, 0);
                this.unitScriptCount = new ui16(endianness, this.buffer, 2);
                this.particleScriptCount = new ui16(endianness, this.buffer, 4);
            }
            async load(cursor, dataProvider) {
                let length = 0;
                length += await dataProvider.read(cursor + length, this.buffer);
                return length;
            }
        }
        wc1.ScriptHeader = ScriptHeader;
        ;
        class Script {
            endianness;
            header;
            unitScriptHeaders;
            particleScriptHeaders;
            buffer;
            constructor(endianness) {
                this.endianness = endianness;
                this.header = new ScriptHeader(endianness);
                this.unitScriptHeaders = new Array();
                this.particleScriptHeaders = new Array();
                this.buffer = new ArrayBuffer(0);
            }
            async load(dataProvider) {
                this.unitScriptHeaders.splice(0, this.unitScriptHeaders.length);
                this.particleScriptHeaders.splice(0, this.particleScriptHeaders.length);
                let cursor = 0;
                let offsets = new Array();
                let offset = new ui16(this.endianness);
                while (true) {
                    cursor += await offset.load(cursor, dataProvider);
                    if (cursor - 2 === offset.value) {
                        cursor -= 2;
                        break;
                    }
                    offsets.push(offset.value);
                }
                cursor += await this.header.load(cursor, dataProvider);
                for (let i = 0; i < this.header.unitScriptCount.value; i++) {
                    let offset = offsets[i];
                    let unitScriptHeader = new UnitScriptHeader(this.endianness);
                    await unitScriptHeader.load(offset, dataProvider);
                    this.unitScriptHeaders.push(unitScriptHeader);
                }
                for (let i = 0; i < this.header.particleScriptCount.value; i++) {
                    let offset = offsets[this.header.unitScriptCount.value + i];
                    let particleScriptHeader = new ParticleScriptHeader(this.endianness);
                    await particleScriptHeader.load(offset, dataProvider);
                    this.particleScriptHeaders.push(particleScriptHeader);
                }
                this.buffer = new ArrayBuffer(dataProvider.size());
                await dataProvider.read(0, this.buffer);
                return this;
            }
            getUnitScript(index) {
                assert.between(0, index, this.unitScriptHeaders.length - 1);
                let header = this.unitScriptHeaders[index];
                let buffer = this.buffer;
                return {
                    header,
                    buffer
                };
            }
            getParticle(index) {
                assert.between(0, index, this.particleScriptHeaders.length - 1);
                let header = this.particleScriptHeaders[index];
                let buffer = this.buffer;
                return {
                    header,
                    buffer
                };
            }
        }
        wc1.Script = Script;
        class SpriteFrameHeader {
            buffer;
            x;
            y;
            w;
            h;
            offset;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(8);
                this.x = new ui08(endianness, this.buffer, 0);
                this.y = new ui08(endianness, this.buffer, 1);
                this.w = new ui08(endianness, this.buffer, 2);
                this.h = new ui08(endianness, this.buffer, 3);
                this.offset = new ui32(endianness, this.buffer, 4);
            }
            async load(cursor, dataProvider) {
                let length = 0;
                length += await dataProvider.read(cursor + length, this.buffer);
                return length;
            }
        }
        wc1.SpriteFrameHeader = SpriteFrameHeader;
        ;
        class SpriteFrame {
            header;
            buffer;
            constructor(endianness) {
                this.header = new SpriteFrameHeader(endianness);
                this.buffer = new ArrayBuffer(0);
            }
            async load(cursor, dataProvider) {
                let length = 0;
                length += await this.header.load(cursor + length, dataProvider);
                this.buffer = new ArrayBuffer(this.header.w.value * this.header.h.value);
                await dataProvider.read(this.header.offset.value, this.buffer);
                return length;
            }
            makeTexture(context, width, height) {
                let x = this.header.x.value;
                let y = this.header.y.value;
                let w = this.header.w.value;
                let h = this.header.h.value;
                let texture = context.createTexture();
                if (is.absent(texture)) {
                    throw `Expected a texture!`;
                }
                context.activeTexture(context.TEXTURE0);
                context.bindTexture(context.TEXTURE_2D, texture);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
                context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, width, height, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
                context.texSubImage2D(context.TEXTURE_2D, 0, x, y, w, h, context.LUMINANCE, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
                return texture;
            }
        }
        wc1.SpriteFrame = SpriteFrame;
        ;
        class SpriteHeader {
            buffer;
            spriteCount;
            w;
            h;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(4);
                this.spriteCount = new ui16(endianness, this.buffer, 0);
                this.w = new ui08(endianness, this.buffer, 2);
                this.h = new ui08(endianness, this.buffer, 3);
            }
            async load(cursor, dataProvider) {
                let length = 0;
                length += await dataProvider.read(cursor + length, this.buffer);
                return length;
            }
        }
        wc1.SpriteHeader = SpriteHeader;
        ;
        class Sprite {
            endianness;
            header;
            frames;
            constructor(endianness) {
                this.endianness = endianness;
                this.header = new SpriteHeader(endianness);
                this.frames = new Array();
            }
            async load(dataProvider) {
                this.frames.splice(0, this.frames.length);
                let cursor = 0;
                cursor += await this.header.load(cursor, dataProvider);
                for (let i = 0; i < this.header.spriteCount.value; i++) {
                    let frame = new SpriteFrame(this.endianness);
                    cursor += await frame.load(cursor, dataProvider);
                    this.frames.push(frame);
                }
                return this;
            }
            makeTextures(context) {
                let w = this.header.w.value;
                let h = this.header.h.value;
                let textures = new Array();
                for (let frame of this.frames) {
                    let texture = frame.makeTexture(context, w, h);
                    textures.push(texture);
                }
                return textures;
            }
        }
        wc1.Sprite = Sprite;
        ;
        class Map {
            buffer;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(0);
            }
            async load(dataProvider) {
                let cursor = 0;
                this.buffer = new ArrayBuffer(64 * 64 * 2);
                cursor += await dataProvider.read(cursor, this.buffer);
                return this;
            }
        }
        wc1.Map = Map;
        ;
        class CursorHeader {
            buffer;
            x;
            y;
            w;
            h;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(8);
                this.x = new ui16(endianness, this.buffer, 0);
                this.y = new ui16(endianness, this.buffer, 2);
                this.w = new ui16(endianness, this.buffer, 4);
                this.h = new ui16(endianness, this.buffer, 6);
            }
            async load(cursor, dataProvider) {
                let length = 0;
                length += await dataProvider.read(cursor + length, this.buffer);
                return length;
            }
        }
        wc1.CursorHeader = CursorHeader;
        ;
        class Cursor {
            header;
            buffer;
            constructor(endianness) {
                this.header = new CursorHeader(endianness);
                this.buffer = new ArrayBuffer(0);
            }
            async load(dataProvider) {
                let cursor = 0;
                cursor += await this.header.load(cursor, dataProvider);
                this.buffer = new ArrayBuffer(this.header.w.value * this.header.h.value);
                cursor += await dataProvider.read(cursor, this.buffer);
                return this;
            }
            makeTexture(context) {
                let w = this.header.w.value;
                let h = this.header.h.value;
                let texture = context.createTexture();
                if (is.absent(texture)) {
                    throw `Expected a texture!`;
                }
                context.activeTexture(context.TEXTURE0);
                context.bindTexture(context.TEXTURE_2D, texture);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
                context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, w, h, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
                context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, w, h, context.LUMINANCE, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
                return texture;
            }
        }
        wc1.Cursor = Cursor;
        ;
        class Palette {
            buffer;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(0);
            }
            async load(dataProvider) {
                assert.between(0, dataProvider.size() % 3, 0);
                let cursor = 0;
                this.buffer = new ArrayBuffer(dataProvider.size());
                cursor += await dataProvider.read(cursor, this.buffer);
                return this;
            }
            makeTexture(context) {
                let w = this.buffer.byteLength / 3;
                let h = 1;
                let texture = context.createTexture();
                if (is.absent(texture)) {
                    throw `Expected a texture!`;
                }
                context.activeTexture(context.TEXTURE0);
                context.bindTexture(context.TEXTURE_2D, texture);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
                context.texImage2D(context.TEXTURE_2D, 0, context.RGB, 256, 1, 0, context.RGB, context.UNSIGNED_BYTE, null);
                context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, w, h, context.RGB, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
                return texture;
            }
            updateTexture(texture, start) {
                let w = this.buffer.byteLength / 3;
                let h = 1;
                context.activeTexture(context.TEXTURE0);
                context.bindTexture(context.TEXTURE_2D, texture);
                context.texSubImage2D(context.TEXTURE_2D, 0, start, 0, w, h, context.RGB, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
                return this;
            }
        }
        wc1.Palette = Palette;
        ;
        class BitmapHeader {
            buffer;
            w;
            h;
            constructor(endianness) {
                this.buffer = new ArrayBuffer(4);
                this.w = new ui16(endianness, this.buffer, 0);
                this.h = new ui16(endianness, this.buffer, 2);
            }
            async load(cursor, dataProvider) {
                let length = 0;
                length += await dataProvider.read(cursor + length, this.buffer);
                return length;
            }
        }
        wc1.BitmapHeader = BitmapHeader;
        ;
        class Bitmap {
            header;
            buffer;
            constructor(endianness) {
                this.header = new BitmapHeader(endianness);
                this.buffer = new ArrayBuffer(0);
            }
            async load(dataProvider) {
                let cursor = 0;
                cursor += await this.header.load(cursor, dataProvider);
                this.buffer = new ArrayBuffer(this.header.w.value * this.header.h.value);
                cursor += await dataProvider.read(cursor, this.buffer);
                return this;
            }
            makeTexture(context) {
                let w = this.header.w.value;
                let h = this.header.h.value;
                let texture = context.createTexture();
                if (is.absent(texture)) {
                    throw `Expected a texture!`;
                }
                context.activeTexture(context.TEXTURE0);
                context.bindTexture(context.TEXTURE_2D, texture);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
                context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, w, h, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
                context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, w, h, context.LUMINANCE, context.UNSIGNED_BYTE, new Uint8Array(this.buffer));
                return texture;
            }
        }
        wc1.Bitmap = Bitmap;
        ;
    })(wc1 || (wc1 = {}));
    // ============================================================================
    let audio_context;
    let synth;
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("webgl2", { antialias: false });
    if (is.absent(context)) {
        throw `Expected a context!`;
    }
    context.clearColor(0.0, 0.0, 0.0, 1.0);
    context.pixelStorei(context.UNPACK_ALIGNMENT, 1);
    let program = context.createProgram();
    if (is.absent(program)) {
        throw `Expected a program!`;
    }
    let vertexShader = context.createShader(context.VERTEX_SHADER);
    if (is.absent(vertexShader)) {
        throw `Expected a shader!`;
    }
    context.shaderSource(vertexShader, `#version 300 es
	uniform ivec2 viewport;
	uniform bvec2 scaling;
	uniform vec2 anchor;
	uniform vec2 quad;
	uniform sampler2D paletteSampler;
	uniform sampler2D textureSampler;
	in vec2 vertexPosition;
	in vec2 vertexTexture;
	out vec2 textureCoordinates;
	void main() {
		float zoom = ${ZOOM}.0;
		textureCoordinates = vertexTexture;
		if (scaling.x) {
			textureCoordinates.x = 1.0 - textureCoordinates.x;
		}
		if (scaling.y) {
			textureCoordinates.y = 1.0 - textureCoordinates.y;
		}
		ivec2 texSize = textureSize(textureSampler, 0);
		vec2 vvpos = vec2(quad) + (vertexPosition - anchor) * vec2(texSize);
		mat3x3 transform = mat3x3(vec3(2.0 / float(viewport.x), 0.0, 0.0), vec3(0.0, -2.0 / float(viewport.y), 0.0), vec3(-1.0, 1.0, 1.0));
		gl_Position = vec4((transform * vec3(vvpos * zoom, 1.0)).xy, 0.0, 1.0);
	}
`);
    context.compileShader(vertexShader);
    if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) {
        let info = context.getShaderInfoLog(vertexShader);
        throw `${info}`;
    }
    let fragmentShader = context.createShader(context.FRAGMENT_SHADER);
    if (is.absent(fragmentShader)) {
        throw `Expected a shader!`;
    }
    context.shaderSource(fragmentShader, `#version 300 es
	precision highp float;
	uniform int textureIndex;
	uniform int transparentIndex;
	uniform sampler2D colorCycleSampler;
	uniform sampler2D paletteSampler;
	uniform sampler2D textureSampler;
	in vec2 textureCoordinates;
	out vec4 fragmentColor;
	void main() {
		float index = texture(textureSampler, textureCoordinates).x;
		int indexInt = int(index * float(textureSize(textureSampler, 0).x));
		if (indexInt == transparentIndex) {
			discard;
		}
		float shiftedIndex = texture(colorCycleSampler, vec2(index, 0.0)).x;
		vec3 color = texture(paletteSampler, vec2(shiftedIndex, 0.0)).rgb * 4.0;
		fragmentColor = vec4(color, 1.0);
	}
`);
    context.compileShader(fragmentShader);
    if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) {
        let info = context.getShaderInfoLog(fragmentShader);
        throw `${info}`;
    }
    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        let info = context.getProgramInfoLog(program);
        throw `${info}`;
    }
    context.useProgram(program);
    let viewportLocation = context.getUniformLocation(program, "viewport");
    let quadLocation = context.getUniformLocation(program, "quad");
    let scalingLocation = context.getUniformLocation(program, "scaling");
    let anchorLocation = context.getUniformLocation(program, "anchor");
    let textureIndexLocation = context.getUniformLocation(program, "textureIndex");
    context.uniform1i(textureIndexLocation, 0); // not used currently
    let transparentIndexLocation = context.getUniformLocation(program, "transparentIndex");
    context.uniform1i(transparentIndexLocation, 0);
    let textureSamplerocation = context.getUniformLocation(program, "textureSampler");
    context.uniform1i(textureSamplerocation, 0);
    let paletteSamplerLocation = context.getUniformLocation(program, "paletteSampler");
    context.uniform1i(paletteSamplerLocation, 1);
    let colorCycleSamplerLocation = context.getUniformLocation(program, "colorCycleSampler");
    context.uniform1i(colorCycleSamplerLocation, 2);
    let vertexPosition = context.getAttribLocation(program, "vertexPosition");
    context.enableVertexAttribArray(vertexPosition);
    let vertexTexture = context.getAttribLocation(program, "vertexTexture");
    context.enableVertexAttribArray(vertexTexture);
    let buffer = context.createBuffer();
    if (is.absent(buffer)) {
        throw `Expected a buffer!`;
    }
    context.bindBuffer(context.ARRAY_BUFFER, buffer);
    context.bufferData(context.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 0.0, 1.0, 0.0
    ]), context.STATIC_DRAW);
    context.vertexAttribPointer(vertexPosition, 2, context.FLOAT, false, 16, 0);
    context.vertexAttribPointer(vertexTexture, 2, context.FLOAT, false, 16, 8);
    canvas.setAttribute("style", "height: 100%; width: 100%;");
    canvas.addEventListener("dragenter", async (event) => {
        event.stopPropagation();
        event.preventDefault();
    });
    canvas.addEventListener("dragover", async (event) => {
        event.stopPropagation();
        event.preventDefault();
    });
    let endianness = "LittleEndian";
    let archive;
    let xmi;
    async function load(dataProvider) {
        if (is.absent(audio_context)) {
            audio_context = new AudioContext();
        }
        archive = new Archive(dataProvider, endianness);
        tileset = await loadTileset(context, archive, endianness, 189, 190, 191);
        //tileset = await loadTileset(context, archive, endianness, 192, 193, 194);
        //tileset = await loadTileset(context, archive, endianness, 195, 196, 197);
        map = await loadMap(archive, endianness, 47);
        try {
            await loadUnitScript(archive);
        }
        catch (error) {
            try {
                await loadParticleScript(archive);
            }
            catch (error) { }
        }
        xmi = await new XmiFile().load(await archive.getRecord(0));
        xmi_time_base = 68;
        playMusic();
        //setEntityColor("red");
    }
    async function loadTileset(context, archive, endianness, tilesetIndex, tilesIndex, paletteIndex) {
        let base_palette = await new wc1.Palette(endianness).load(await archive.getRecord(paletteIndex));
        let paletteTexture = await base_palette.makeTexture(context);
        let palette = await new wc1.Palette(endianness).load(await archive.getRecord(210));
        palette.updateTexture(paletteTexture, 128);
        context.activeTexture(context.TEXTURE1);
        context.bindTexture(context.TEXTURE_2D, paletteTexture);
        let tiles = await archive.getRecord(tilesIndex);
        assert.assert((tiles.size() % (8 * 8)) === 0);
        let headers = await archive.getRecord(tilesetIndex);
        let cursor = 0;
        assert.assert((tiles.size() % 8) === 0);
        let textures = new Array();
        let array = new Uint8Array(8 * 8);
        while (cursor < headers.size()) {
            let w = 2 * 8;
            let h = 2 * 8;
            let texture = context.createTexture();
            if (is.absent(texture)) {
                throw `Expected a texture!`;
            }
            context.activeTexture(context.TEXTURE0);
            context.bindTexture(context.TEXTURE_2D, texture);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
            context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, w, h, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
            let tileHeader = new wc1.TileHeader(endianness);
            cursor += await tileHeader.load(cursor, headers);
            for (let y = 0; y < tileHeader.layout.length; y++) {
                for (let x = 0; x < tileHeader.layout[y].length; x++) {
                    let header = tileHeader.layout[y][x];
                    await tiles.read(header.index.value * 8 * 8, array.buffer);
                    if (header.inverted.value) {
                        for (let y = 0; y < 8 / 2; y++) {
                            for (let x = 0; x < 8; x++) {
                                let indexOne = (y * 8) + x;
                                let indexTwo = ((8 - y - 1) * 8) + x;
                                let valueOne = array[indexOne];
                                let valueTwo = array[indexTwo];
                                array[indexOne] = valueTwo;
                                array[indexTwo] = valueOne;
                            }
                        }
                    }
                    if (header.mirrored.value) {
                        for (let y = 0; y < 8; y++) {
                            for (let x = 0; x < 8 / 2; x++) {
                                let indexOne = (y * 8) + x;
                                let indexTwo = (y * 8) + 8 - x - 1;
                                let valueOne = array[indexOne];
                                let valueTwo = array[indexTwo];
                                array[indexOne] = valueTwo;
                                array[indexTwo] = valueOne;
                            }
                        }
                    }
                    context.texSubImage2D(context.TEXTURE_2D, 0, x * 8, y * 8, 8, 8, context.LUMINANCE, context.UNSIGNED_BYTE, array);
                }
            }
            textures.push(texture);
        }
        return textures;
    }
    async function loadMap(archive, endianness, mapIndex) {
        let indices = new Array();
        let integer = new ui16(endianness);
        let dataProider = await archive.getRecord(mapIndex);
        assert.assert(dataProider.size() === 64 * 64 * 2);
        let cursor = 0;
        for (let y = 0; y < 64; y++) {
            for (let x = 0; x < 64; x++) {
                cursor += await integer.load(cursor, dataProider);
                indices.push(integer.value);
            }
        }
        return indices;
    }
    let selectedEntities = new Array();
    let entities = [
        { name: "Footman", script: 0, sprite: 279, sfx: [487, 488, 489] },
        { name: "Grunt", script: 1, sprite: 280, sfx: [487, 488, 489] },
        { name: "Peasant", script: 2, sprite: 281, sfx: [477, 478, 479] },
        { name: "Peon", script: 3, sprite: 282, sfx: [477, 478, 479] },
        { name: "Catapult", script: 4, sprite: 283, sfx: [476] },
        { name: "Catapult", script: 5, sprite: 284, sfx: [476] },
        { name: "Knight", script: 6, sprite: 285, sfx: [487, 488, 489] },
        { name: "Raider", script: 7, sprite: 286, sfx: [487, 488, 489] },
        { name: "Archer", script: 8, sprite: 287, sfx: [493] },
        { name: "Spearman", script: 9, sprite: 288, sfx: [493] },
        { name: "Conjurer", script: 10, sprite: 289, sfx: [] },
        { name: "Warlock", script: 11, sprite: 290, sfx: [] },
        { name: "Cleric", script: 12, sprite: 291, sfx: [] },
        { name: "Necrolyte", script: 13, sprite: 292, sfx: [] },
        { name: "Medivh", script: 14, sprite: 293, sfx: [] },
        { name: "Sir Lothar", script: 15, sprite: 294, sfx: [] },
        { name: "Grunt (copy)", script: 16, sprite: 280, sfx: [] },
        { name: "Griselda", script: 17, sprite: 296, sfx: [] },
        { name: "Garona", script: 18, sprite: 296, sfx: [] },
        { name: "Ogre", script: 19, sprite: 297, sfx: [] },
        { name: "Ogre (copy)", script: 20, sprite: 297, sfx: [] },
        { name: "Spider", script: 21, sprite: 298, sfx: [] },
        { name: "Slime", script: 22, sprite: 299, sfx: [] },
        { name: "Fire Elemental", script: 23, sprite: 300, sfx: [] },
        { name: "Scorpion", script: 24, sprite: 301, sfx: [] },
        { name: "Brigand", script: 25, sprite: 302, sfx: [] },
        { name: "Skeleton", script: 26, sprite: 303, sfx: [] },
        { name: "Skeleton", script: 27, sprite: 304, sfx: [] },
        { name: "Daemon", script: 28, sprite: 305, sfx: [] },
        { name: "Ogre (copy 2)", script: 29, sprite: 297, sfx: [] },
        { name: "Ogre (copy 3)", script: 30, sprite: 297, sfx: [] },
        { name: "Water Elemental", script: 31, sprite: 306, sfx: [] },
        { name: "Farm", script: 32, sprite: 307, sfx: [] },
        { name: "Farm", script: 33, sprite: 308, sfx: [] },
        { name: "Barracks", script: 34, sprite: 309, sfx: [] },
        { name: "Barracks", script: 35, sprite: 310, sfx: [] },
        { name: "Church", script: 36, sprite: 311, sfx: [] },
        { name: "Temple", script: 37, sprite: 312, sfx: [] },
        { name: "Tower", script: 38, sprite: 313, sfx: [] },
        { name: "Tower", script: 39, sprite: 314, sfx: [] },
        { name: "Town Hall", script: 40, sprite: 315, sfx: [] },
        { name: "Town Hall", script: 41, sprite: 316, sfx: [] },
        { name: "Mill", script: 42, sprite: 317, sfx: [] },
        { name: "Mill", script: 43, sprite: 318, sfx: [] },
        { name: "Stables", script: 44, sprite: 319, sfx: [] },
        { name: "Kennel", script: 45, sprite: 320, sfx: [] },
        { name: "Blacksmith", script: 46, sprite: 321, sfx: [] },
        { name: "Blacksmith", script: 47, sprite: 322, sfx: [] },
        { name: "Stormwind Keep", script: 48, sprite: 323, sfx: [] },
        { name: "Black Rock Spire", script: 49, sprite: 324, sfx: [] },
        { name: "Gold Mine", script: 50, sprite: 325, sfx: [] },
        { name: "Blob", script: 0, type: "effect", sprite: 347, sfx: [] },
        { name: "Fire Ball", script: 1, type: "effect", sprite: 348, sfx: [] },
        { name: "Spear", script: 2, type: "effect", sprite: 349, sfx: [] },
        { name: "Poison Cloud", script: 3, type: "effect", sprite: 350, sfx: [] },
        { name: "Catapult Projectile", script: 4, type: "effect", sprite: 351, sfx: [] },
        { name: "Burning Small", script: 5, type: "effect", sprite: 352, sfx: [] },
        { name: "Burning Medium", script: 6, type: "effect", sprite: 353, sfx: [] },
        { name: "Explosion", script: 7, type: "effect", sprite: 354, sfx: [] },
        { name: "Sparkle", script: 8, type: "effect", sprite: 355, sfx: [] },
        { name: "Building Collapse", script: 9, type: "effect", sprite: 356, sfx: [] },
        { name: "Water Elemental", script: 10, type: "effect", sprite: 357, sfx: [] },
        { name: "Fire Elemental", script: 11, type: "effect", sprite: 358, sfx: [] },
    ];
    let w = 256;
    let h = 1;
    let colorCycleTexture = context.createTexture();
    let colorCycleBuffer = new Uint8Array(w * h);
    for (let i = 0; i < 256; i++) {
        colorCycleBuffer[i] = i;
    }
    if (is.absent(colorCycleTexture)) {
        throw `Expected a texture!`;
    }
    context.activeTexture(context.TEXTURE2);
    context.bindTexture(context.TEXTURE_2D, colorCycleTexture);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
    context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, 256, 1, 0, context.LUMINANCE, context.UNSIGNED_BYTE, colorCycleBuffer);
    let cycleWait = 0;
    function updateCycle() {
        if (cycleWait > 0) {
            cycleWait -= 1;
            return;
        }
        cycleWait = 15;
        function update(offset, length, direction) {
            if (direction === "forward") {
                let first = colorCycleBuffer[offset];
                for (let i = offset; i < offset + length - 1; i++) {
                    colorCycleBuffer[i] = colorCycleBuffer[i + 1];
                }
                colorCycleBuffer[offset + length - 1] = first;
            }
            else {
                let last = colorCycleBuffer[offset + length - 1];
                for (let i = offset + length - 1; i > offset; i--) {
                    colorCycleBuffer[i] = colorCycleBuffer[i - 1];
                }
                colorCycleBuffer[offset] = last;
            }
            context.activeTexture(context.TEXTURE2);
            context.bindTexture(context.TEXTURE_2D, colorCycleTexture);
            context.texSubImage2D(context.TEXTURE_2D, 0, offset, 0, length, 1, context.LUMINANCE, context.UNSIGNED_BYTE, colorCycleBuffer, offset);
        }
        update(114, 6, "reverse");
        update(121, 6, "reverse");
    }
    function setEntityColor(color) {
        if (color === "red") {
            for (let i = 0; i < 8; i++) {
                colorCycleBuffer[176 + i] = 176 + i;
                colorCycleBuffer[200 + i] = 176 + i;
            }
        }
        else if (color === "green") {
            for (let i = 0; i < 8; i++) {
                colorCycleBuffer[176 + i] = 168 + i;
                colorCycleBuffer[200 + i] = 168 + i;
            }
        }
        else if (color === "blue") {
            for (let i = 0; i < 8; i++) {
                colorCycleBuffer[176 + i] = 200 + i;
                colorCycleBuffer[200 + i] = 200 + i;
            }
        }
        else if (color === "white") {
            for (let i = 0; i < 8; i++) {
                colorCycleBuffer[176 + i] = 184 + i;
                colorCycleBuffer[200 + i] = 184 + i;
            }
        }
        context.activeTexture(context.TEXTURE2);
        context.bindTexture(context.TEXTURE_2D, colorCycleTexture);
        context.texSubImage2D(context.TEXTURE_2D, 0, 176, 0, 8, 1, context.LUMINANCE, context.UNSIGNED_BYTE, colorCycleBuffer, 176);
        context.texSubImage2D(context.TEXTURE_2D, 0, 200, 0, 8, 1, context.LUMINANCE, context.UNSIGNED_BYTE, colorCycleBuffer, 200);
    }
    let textures = new Array();
    let entity = 0;
    let offset;
    let delay = 0;
    let direction = 0;
    let frame = 0;
    let view;
    let sfx = [];
    async function loadUnitScript(archive) {
        let entitydata = entities[entity];
        let sprite = await new wc1.Sprite(endianness).load(await archive.getRecord(entitydata.sprite));
        textures = await sprite.makeTextures(context);
        let script = await new wc1.Script(endianness).load(await archive.getRecord(212));
        let us = script.getUnitScript(entitydata.script);
        console.log(JSON.stringify({
            ...entitydata,
            armor: shared.armor[entity],
            armorPiercingDamage: shared.armorPiercingDamage[entity],
            damage: shared.damage[entity],
            goldCost: shared.goldCost[entity] * 10,
            health: shared.hitPoints[entity],
            timeCost: shared.timeCost[entity] * 10,
            range: shared.range[entity],
            woodCost: shared.woodCost[entity] * 10,
        }, null, "\t"));
        view = new DataView(us.buffer);
        frame = 0;
        offset = us.header.movementOffset.value;
        delay = 0;
        sfx = await Promise.all(entitydata.sfx.map(async (index) => await new VocFile().load(await archive.getRecord(index))));
        return us.header;
    }
    async function loadParticleScript(archive) {
        let entitydata = entities[entity];
        let sprite = await new wc1.Sprite(endianness).load(await archive.getRecord(entitydata.sprite));
        textures = await sprite.makeTextures(context);
        let script = await new wc1.Script(endianness).load(await archive.getRecord(212));
        let us = script.getParticle(entitydata.script);
        console.log({
            ...entitydata
        });
        view = new DataView(us.buffer);
        frame = 0;
        offset = us.header.movementOffset.value;
        delay = 0;
        return us.header;
    }
    let tileset;
    let map;
    let xmi_offset = 0;
    let xmi_time_base = 0;
    let xmi_loop;
    let channels = new Array();
    let instruments = new Array();
    let channel_mixers = new Array();
    let channel_muters = new Array();
    async function keyon(channel_index, midikey, velocity) {
        if (is.absent(synth) || is.absent(audio_context)) {
            return;
        }
        if (channel_muters[channel_index].gain.value === 0) {
            return;
        }
        let instrument = instruments[channel_index];
        let program = synth.banks[instrument[0]].programs[instrument[1]];
        if (is.absent(program)) {
            return;
        }
        let map = channels[channel_index];
        let channel = map.get(midikey);
        if (is.present(channel)) {
            channel.stop();
            map.delete(midikey);
        }
        let doff = 35;
        let dnames = [
            "Acoustic Bass Drum",
            "Electric Bass Drum",
            "Side Stick",
            "Acoustic Snare",
            "Hand Clap",
            "Electric Snare",
            "Low Floor Tom",
            "Closed Hi-hat",
            "High Floor Tom",
            "Pedal Hi-hat",
            "Low Tom",
            "Open Hi-hat",
            "Low-Mid Tom",
            "Hi-Mid Tom",
            "Crash Cymbal 1",
            "High Tom",
            "Ride Cymbal 1",
            "Chinese Cymbal",
            "Ride Bell",
            "Tambourine",
            "Splash Cymbal",
            "Cowbell",
            "Crash Cymbal 2",
            "Vibraslap",
            "Ride Cymbal 2",
            "High Bongo",
            "Low Bongo",
            "Mute High Conga",
            "Open High Conga",
            "Low Conga",
            "High Timbale",
            "Low Timbale",
            "High Agogô",
            "Low Agogô",
            "Cabasa",
            "Maracas",
            "Short Whistle",
            "Long Whistle",
            "Short Guiro",
            "Long Guiro",
            "Claves",
            "High Woodblock",
            "Low Woodblock",
            "Mute Cuica",
            "Open Cuica",
            "Mute Triangle",
            "Open Triangle"
        ];
        try {
            channel = await program.makeChannel(audio_context, midikey, velocity, channel_mixers[channel_index], channel_index);
            map.set(midikey, channel);
            channel.start();
            let noteString = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
            let octave = Math.floor(midikey / 12);
            let noteIndex = (midikey % 12);
            let note = noteString[noteIndex];
            if (channel_index === 9) {
                keys[channel_index].innerHTML = `[D]: ${dnames[midikey - doff]}`;
            }
            else {
                keys[channel_index].innerHTML = `[${channel_index}]: ${note}${octave}`;
            }
        }
        catch (error) {
            console.log(error);
        }
    }
    function keyoff(channel_index, midikey, velocity) {
        let map = channels[channel_index];
        let channel = map.get(midikey);
        if (is.present(channel)) {
            channel.release(midikey, velocity);
            map.delete(midikey);
            keys[channel_index].innerHTML = `[${channel_index === 9 ? "D" : channel_index}]:`;
        }
    }
    function volume(channel_index, byte) {
        // Volume is set for the loaded instrument, not the channel. Instruments loaded on multiple channels are affected.
        let ins = instruments[channel_index];
        for (let i = 0; i < 16; i++) {
            if (instruments[i] === ins) {
                channel_mixers[channel_index].gain.value = 10 ** (-960 * (1 - byte / 128) * (1 - byte / 128) / 200);
            }
        }
    }
    let tempo_seconds_per_beat = 0.5;
    let signature_num = 4;
    let signature_den = 4;
    let signature_clicks = 24;
    let signature_quarts = 8;
    let xmi_timer;
    function stopMusic() {
        if (is.present(xmi_timer)) {
            window.clearTimeout(xmi_timer);
            xmi_timer = undefined;
        }
    }
    function playMusic() {
        stopMusic();
        xmi_offset = 0;
        xmi_loop = undefined;
        tempo_seconds_per_beat = 0.5;
        signature_num = 4;
        signature_den = 4;
        signature_clicks = 24;
        signature_quarts = 8;
        soundUpdate();
    }
    async function soundUpdate() {
        if (is.present(xmi)) {
            while (true) {
                let event = xmi.events[xmi_offset++];
                if (false) {
                }
                else if (event.type === XMIEventType.NOTE_OFF) {
                    let a = event.data[0];
                    let b = event.data[1];
                    keyoff(event.channel, a, b);
                }
                else if (event.type === XMIEventType.NOTE_ON) {
                    let a = event.data[0];
                    let b = event.data[1];
                    if (b === 0) {
                        keyoff(event.channel, a, b);
                    }
                    else {
                        await keyon(event.channel, a, b);
                    }
                }
                else if (event.type === XMIEventType.INSTRUMENT_CHANGE) {
                    let a = event.data[0];
                    //console.log(`${event.channel}: instrument ${a}`);
                    for (let i = 0; i < 16; i++) {
                        if (instruments[i][1] === a) {
                            channel_mixers[event.channel].gain.value = channel_mixers[i].gain.value;
                            break;
                        }
                    }
                    if (!OVERRIDE) {
                        instruments[event.channel][1] = a;
                    }
                    document.querySelector(`select:nth-of-type(${event.channel}) > option:nth-of-type(${a})`)?.setAttribute("selected", "");
                }
                else if (event.type === XMIEventType.CONTROLLER) {
                    let a = event.data[0];
                    let b = event.data[1];
                    if (a === 64) {
                        // SUSTAIN PEDAL ON OR OFF
                    }
                    else if (a === 10) {
                        // PANNING
                    }
                    else if (a === 116) {
                        xmi_loop = xmi_offset;
                    }
                    else if (a === 117) {
                        xmi_offset = (xmi_loop ?? 0);
                        continue;
                    }
                    else if ((a === 7) || (a === 11)) {
                        //console.log(`${event.channel}: volume ${a} ${b}`);
                        volume(event.channel, b);
                    }
                    else {
                        //console.log(XMIEventType[event.type], a, b);
                    }
                }
                else if (event.type === XMIEventType.PITCH_BEND) {
                    let a = event.data[0];
                    let b = event.data[1];
                    let value = ((a & 0x7F) << 7) | ((b & 0x7F) << 0);
                    let o = channels[event.channel];
                    //console.log(XMIEventType[event.type], event);
                }
                else if (event.type === XMIEventType.SYSEX) {
                    if (event.channel === 15) {
                        let type = event.data[0];
                        if (type === 0x51) {
                            let a = event.data[1];
                            let b = event.data[2];
                            let c = event.data[3];
                            let tempo = (a << 16) | (b << 8) | (c << 0);
                            tempo_seconds_per_beat = tempo / 1000000;
                        }
                        else if (type === 0x58) {
                            let numerator = event.data[1];
                            let denominator = (1 << event.data[2]);
                            let clocks_per_metronome_click = event.data[3];
                            let quarter_32nd_notes = event.data[4];
                            signature_num = numerator;
                            signature_den = denominator;
                            signature_clicks = clocks_per_metronome_click;
                            signature_quarts = quarter_32nd_notes;
                        }
                    }
                }
                else {
                    //console.log(XMIEventType[event.type], event);
                }
                if (xmi_offset < xmi.events.length) {
                    let xmi_delay = xmi.events[xmi_offset].time;
                    if (xmi_delay > 0) {
                        // works nicely
                        //let delay_s = (xmi_delay / xmi_time_base) * tempo_seconds_per_beat;
                        let delay_s = (xmi_delay / xmi_time_base) * tempo_seconds_per_beat * signature_num / signature_den * 96 / signature_clicks * signature_quarts / 32;
                        //console.log({xmi_delay, xmi_time_base, tempo_seconds_per_beat, signature_num, signature_den, signature_clicks, signature_quarts});
                        //console.log(delay_s);
                        xmi_timer = window.setTimeout(soundUpdate, delay_s * 1000);
                        break;
                    }
                }
                else {
                    xmi = undefined;
                    break;
                }
            }
        }
    }
    const YELLOW = 221;
    const RED = 222;
    const GREEN = 223;
    function getRectangleFromEntity(e) {
        let index = entities.indexOf(e) ?? entity;
        let x = 12 * 16;
        let y = 12 * 16;
        let w = shared.rectangles[index * 2 + 0];
        let h = shared.rectangles[index * 2 + 1];
        return {
            x,
            y,
            w,
            h
        };
    }
    async function render(ms) {
        context.clear(context.COLOR_BUFFER_BIT);
        updateCycle();
        if (is.present(map) && is.present(tileset)) {
            for (let y = 0; y < 64; y++) {
                for (let x = 0; x < 64; x++) {
                    context.uniform1i(textureIndexLocation, 0);
                    context.uniform1i(transparentIndexLocation, 256);
                    context.uniform2f(anchorLocation, 0.0, 0.0);
                    context.uniform2f(quadLocation, x * 16, y * 16);
                    context.uniform2i(scalingLocation, 0, 0);
                    context.activeTexture(context.TEXTURE0);
                    context.bindTexture(context.TEXTURE_2D, tileset[map[y * 64 + x]]);
                    context.bindBuffer(context.ARRAY_BUFFER, buffer);
                    context.drawArrays(context.TRIANGLE_FAN, 0, 4);
                }
            }
        }
        if (is.present(offset) && is.present(view)) {
            if (delay > 0) {
                delay -= 1;
            }
            else {
                let opcode = view.getUint8(offset++);
                if (opcode === 0) {
                }
                else if (opcode === 1) {
                    delay = view.getUint8(offset++);
                }
                else if (opcode === 2) {
                    throw "";
                }
                else if (opcode === 3) {
                    offset = view.getUint16(offset, true);
                }
                else if (opcode === 4) {
                    frame = view.getUint8(offset++);
                }
                else if (opcode === 5) {
                    let movement = view.getUint8(offset++);
                }
                else if (opcode === 6) {
                    let movement = view.getUint8(offset++);
                    frame = view.getUint8(offset++);
                }
                else if (opcode === 7) {
                    delay = view.getUint8(offset++);
                }
                else if (opcode === 8) {
                    setTimeout(() => {
                        if (sfx.length > 0) {
                            sfx[Math.floor(Math.random() * sfx.length)].play();
                        }
                    });
                }
                else if (opcode === 9) {
                    console.log("damage!");
                }
                else if (opcode === 10) {
                    delay = view.getUint8(offset++);
                }
                else {
                    throw `Invalid opcode ${opcode}!`;
                }
            }
            let index = direction < 5 ? frame + direction : frame + 8 - direction;
            if (index >= textures.length) {
                //console.log({index, unit: entity});
            }
            context.uniform1i(textureIndexLocation, 0);
            context.uniform1i(transparentIndexLocation, 0);
            context.uniform2f(anchorLocation, 0.0, 0.0);
            context.uniform2f(quadLocation, 192, 192);
            context.uniform2i(scalingLocation, direction < 5 ? 0 : 1, 0);
            context.activeTexture(context.TEXTURE0);
            context.bindTexture(context.TEXTURE_2D, textures[index]);
            context.bindBuffer(context.ARRAY_BUFFER, buffer);
            context.drawArrays(context.TRIANGLE_FAN, 0, 4);
        }
        for (let entity of selectedEntities) {
            drawRectangle(getRectangleFromEntity(entity), GREEN);
        }
        if (is.present(dragStart) && is.present(dragEnd)) {
            drawRectangle(makeRectangleFromPoints(dragStart, dragEnd), GREEN);
        }
        window.requestAnimationFrame(render);
    }
    window.requestAnimationFrame(render);
    let keymap = {
        z: 48,
        x: 49,
        c: 50,
        v: 51,
        b: 52,
        n: 53,
        m: 54,
        a: 36,
        s: 37,
        d: 38,
        f: 39,
        g: 40,
        h: 41,
        j: 42,
        k: 43,
        l: 44,
        q: 24,
        w: 25,
        e: 26,
        r: 27,
        t: 28,
        y: 29,
        u: 30,
        i: 31,
        o: 32,
        p: 33
    };
    let current_channel = 0;
    let keysdown = {};
    window.addEventListener("keydown", async (event) => {
        if (!(event.key in keymap)) {
            return;
        }
        if (keysdown[event.key]) {
            return;
        }
        keysdown[event.key] = true;
        await keyon(current_channel, keymap[event.key], 127);
    });
    window.addEventListener("keyup", async (event) => {
        if (!(event.key in keymap)) {
            return;
        }
        delete keysdown[event.key];
        keyoff(current_channel, keymap[event.key], 127);
    });
    window.addEventListener("keyup", async (event) => {
        if (false) {
        }
        else if (event.key === "0") {
            channel_muters[0].gain.value = channel_muters[0].gain.value > 0 ? 0 : 1;
        }
        else if (event.key === "1") {
            channel_muters[1].gain.value = channel_muters[1].gain.value > 0 ? 0 : 1;
        }
        else if (event.key === "2") {
            channel_muters[2].gain.value = channel_muters[2].gain.value > 0 ? 0 : 1;
        }
        else if (event.key === "3") {
            channel_muters[3].gain.value = channel_muters[3].gain.value > 0 ? 0 : 1;
        }
        else if (event.key === "4") {
            channel_muters[4].gain.value = channel_muters[4].gain.value > 0 ? 0 : 1;
        }
        else if (event.key === "5") {
            channel_muters[5].gain.value = channel_muters[5].gain.value > 0 ? 0 : 1;
        }
        else if (event.key === "6") {
            channel_muters[6].gain.value = channel_muters[6].gain.value > 0 ? 0 : 1;
        }
        else if (event.key === "7") {
            channel_muters[7].gain.value = channel_muters[7].gain.value > 0 ? 0 : 1;
        }
        else if (event.key === "8") {
            channel_muters[8].gain.value = channel_muters[8].gain.value > 0 ? 0 : 1;
        }
        else if (event.key === "9") {
            channel_muters[9].gain.value = channel_muters[9].gain.value > 0 ? 0 : 1;
        }
        if (false) {
        }
        else if (event.key === "8") {
            direction = 0;
        }
        else if (event.key === "9") {
            direction = 1;
        }
        else if (event.key === "6") {
            direction = 2;
        }
        else if (event.key === "3") {
            direction = 3;
        }
        else if (event.key === "2") {
            direction = 4;
        }
        else if (event.key === "1") {
            direction = 5;
        }
        else if (event.key === "4") {
            direction = 6;
        }
        else if (event.key === "7") {
            direction = 7;
        }
        if (is.present(archive)) {
            try {
                if (false) {
                }
                else if (event.key === "a") {
                    offset = (await loadUnitScript(archive)).actionOffset.value;
                }
                else if (event.key === "d") {
                    offset = (await loadUnitScript(archive)).deathOffset.value;
                }
                else if (event.key === "i") {
                    offset = (await loadUnitScript(archive)).idleOffset.value;
                }
                else if (event.key === "m") {
                    offset = (await loadUnitScript(archive)).movementOffset.value;
                }
                else if (event.key === "s") {
                    offset = (await loadUnitScript(archive)).spawnOffset.value;
                }
                else if (event.key === "t") {
                    offset = (await loadUnitScript(archive)).trainOffset.value;
                }
                else if (event.key === "z") {
                    offset = (await loadParticleScript(archive)).spawnOffset.value;
                }
                else if (event.key === "x") {
                    offset = (await loadParticleScript(archive)).movementOffset.value;
                }
                else if (event.key === "c") {
                    offset = (await loadParticleScript(archive)).hitOffset.value;
                }
                else if (event.key === "ArrowUp") {
                    entity = (((entity - 1) % entities.length) + entities.length) % entities.length;
                    let ed = entities[entity];
                    if (ed.type === "effect") {
                        await loadParticleScript(archive);
                    }
                    else {
                        await loadUnitScript(archive);
                    }
                }
                else if (event.key === "ArrowDown") {
                    entity = (((entity + 1) % entities.length) + entities.length) % entities.length;
                    let ed = entities[entity];
                    if (ed.type === "effect") {
                        await loadParticleScript(archive);
                    }
                    else {
                        await loadUnitScript(archive);
                    }
                }
            }
            catch (error) { }
        }
    });
    function makeSingleColoredTexture(w, h, colorIndex) {
        let texture = context.createTexture();
        if (is.absent(texture)) {
            throw `Expected a texture!`;
        }
        context.activeTexture(context.TEXTURE0);
        context.bindTexture(context.TEXTURE_2D, texture);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
        context.texImage2D(context.TEXTURE_2D, 0, context.LUMINANCE, w, h, 0, context.LUMINANCE, context.UNSIGNED_BYTE, null);
        let array = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
            array[i] = colorIndex;
        }
        context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, w, h, context.LUMINANCE, context.UNSIGNED_BYTE, array);
        return texture;
    }
    function drawRectangle(rectangle, colorIndex) {
        context.uniform1i(textureIndexLocation, colorIndex);
        context.uniform1i(transparentIndexLocation, 256);
        context.uniform2f(anchorLocation, 0.0, 0.0);
        context.uniform2f(quadLocation, rectangle.x, rectangle.y);
        context.uniform2i(scalingLocation, 0, 0);
        context.activeTexture(context.TEXTURE0);
        context.bindTexture(context.TEXTURE_2D, makeSingleColoredTexture(rectangle.w, rectangle.h, colorIndex));
        context.bindBuffer(context.ARRAY_BUFFER, buffer);
        context.drawArrays(context.LINE_LOOP, 0, 4);
    }
    function makeRectangleFromPoints(one, two) {
        let w = two.x - one.x + 1;
        if (w < 0) {
            w = 0 - w;
        }
        let h = two.y - one.y + 1;
        if (h < 0) {
            h = 0 - h;
        }
        let x = Math.min(one.x, two.x);
        let y = Math.min(one.y, two.y);
        return {
            x,
            y,
            w,
            h
        };
    }
    function getEntitiesWithinRange(rectangle) {
        let e = new Array();
        e.push(entities[entity]);
        return e;
    }
    function setSelection(entities) {
        selectedEntities = entities.slice(0, 9);
    }
    let dragStart;
    let dragEnd;
    function beginInteraction(x, y) {
        dragStart = { x: Math.floor(x / ZOOM), y: Math.floor(y / ZOOM) };
    }
    function continueInteraction(x, y) {
        dragEnd = { x: Math.floor(x / ZOOM), y: Math.floor(y / ZOOM) };
    }
    function completeInteraction(x, y) {
        continueInteraction(x, y);
        if (is.present(dragStart) && is.present(dragEnd)) {
            let rect = makeRectangleFromPoints(dragStart, dragEnd);
            let entities = getEntitiesWithinRange(rect);
            setSelection(entities);
        }
        cancelInteraction(x, y);
    }
    function cancelInteraction(x, y) {
        dragStart = undefined;
        dragEnd = undefined;
    }
    window.addEventListener("pointerdown", async (event) => {
        let x = event.pageX;
        let y = event.pageY;
        beginInteraction(x, y);
    });
    window.addEventListener("pointermove", async (event) => {
        let x = event.pageX;
        let y = event.pageY;
        continueInteraction(x, y);
    });
    window.addEventListener("pointerup", async (event) => {
        let x = event.pageX;
        let y = event.pageY;
        completeInteraction(x, y);
    });
    window.addEventListener("pointercancel", async (event) => {
        let x = event.pageX;
        let y = event.pageY;
        cancelInteraction(x, y);
    });
    function unlock_context() {
        if (is.absent(audio_context)) {
            audio_context = new AudioContext();
            for (let i = channels.length; i < 16; i++) {
                channels[i] = new Map();
            }
            for (let i = instruments.length; i < 16; i++) {
                instruments[i] = i === 9 ? [128, 0] : [0, 0];
            }
            for (let i = channel_muters.length; i < 16; i++) {
                channel_muters[i] = audio_context.createGain();
                channel_muters[i].connect(audio_context.destination);
            }
            for (let i = channel_mixers.length; i < 16; i++) {
                channel_mixers[i] = audio_context.createGain();
                channel_mixers[i].connect(channel_muters[i]);
            }
        }
    }
    function reset_synth() {
        for (let [i, instrument] of instruments.entries()) {
            instruments[i] = i === 9 ? [128, 0] : [0, 0];
        }
        for (let [i, channel_mixer] of channel_mixers.entries()) {
            channel_mixer.gain.value = 1;
        }
        for (let channel of channels) {
            for (let mc of channel.values()) {
                mc.stop();
            }
        }
        if (OVERRIDE) {
            let square = [0, 80];
            let saw = [0, 81];
            let fifth_saw = [0, 86];
            let powerdrums = [128, 16];
            instruments[0] = square;
            instruments[1] = square;
            instruments[2] = saw;
            instruments[3] = saw;
            instruments[4] = saw;
            instruments[5] = square;
            instruments[6] = square;
            instruments[7] = square;
            instruments[8] = square;
            instruments[9] = powerdrums;
            instruments[10] = saw;
            instruments[11] = saw;
            instruments[12] = saw;
            instruments[13] = saw;
            instruments[14] = saw;
            instruments[15] = saw;
        }
    }
    window.addEventListener("keydown", () => {
        unlock_context();
    });
    fetch("gm.sf2").then(async (response) => {
        let array_buffer = await response.arrayBuffer();
        let cursor = new binary.Cursor();
        let reader = new binary.BufferReader({
            buffer: new binary.Buffer(array_buffer)
        });
        let sf = new shared.formats.soundfont.File();
        await sf.load(cursor, reader);
        synth = await synth_1.WavetableSynth.fromSoundfont(sf);
        console.log("synth initialized");
        for (let chan = 0; chan < 16; chan++) {
            let select = document.createElement("select");
            select.style.setProperty("font-size", "20px");
            for (let [bank_index, bank] of synth.banks.entries()) {
                for (let [program_index, program] of bank.programs.entries()) {
                    if (is.present(program)) {
                        let option = document.createElement("option");
                        option.style.setProperty("font-size", "20px");
                        option.textContent = bank_index + ":" + program_index + " - " + program.name;
                        option.value = "" + bank_index + ":" + program_index;
                        select.appendChild(option);
                    }
                }
            }
            select.addEventListener("change", (event) => {
                let parts = select.value.split(":");
                let b = Number.parseInt(parts[0]);
                let i = Number.parseInt(parts[1]);
                instruments[chan] = [b, i];
            });
            document.body.appendChild(select);
        }
    });
    canvas.addEventListener("drop", async (event) => {
        event.stopPropagation();
        event.preventDefault();
        unlock_context();
        reset_synth();
        let dataTransfer = event.dataTransfer;
        if (is.present(dataTransfer)) {
            let files = dataTransfer.files;
            for (let file of files) {
                let dataProvider = await new FileDataProvider(file).buffer();
                if (/[.]xmi$/i.test(file.name)) {
                    xmi = await new XmiFile().load(dataProvider);
                    xmi_time_base = 68; // 15ms interrupts
                    playMusic();
                }
                else if (/[.]mid$/i.test(file.name)) {
                    let array_buffer = await file.arrayBuffer();
                    let cursor = new binary.Cursor();
                    let reader = new binary.BufferReader({
                        buffer: new binary.Buffer(array_buffer)
                    });
                    let midifile = await formats_1.midi.File.fromReader(cursor, reader);
                    xmi = new XmiFile();
                    for (let track of midifile.tracks) {
                        let tc = 0;
                        for (let event of track.events) {
                            tc += event.delay;
                            let data = (() => {
                                let data = new Uint8Array(event.data.size());
                                event.data.copy(new binary.Buffer(data.buffer));
                                if (event.type === formats_1.midi.Type.SYSEX) {
                                    if (event.channel < 15) {
                                        return data.slice(1);
                                    }
                                    else {
                                        return Uint8Array.of(data[0], ...data.slice(2));
                                    }
                                }
                                else {
                                    return data;
                                }
                            })();
                            xmi.events.push({
                                index: xmi.events.length,
                                time: tc,
                                type: event.type + 8,
                                channel: event.channel,
                                data: data
                            });
                        }
                    }
                    xmi.events.sort((one, two) => {
                        if (one.time < two.time) {
                            return -1;
                        }
                        if (one.time > two.time) {
                            return 1;
                        }
                        if (one.index < two.index) {
                            return -1;
                        }
                        if (one.index > two.index) {
                            return 1;
                        }
                        return 0;
                    });
                    let time = 0;
                    for (let event of xmi.events) {
                        let delay = event.time - time;
                        time = event.time;
                        event.time = delay;
                    }
                    xmi_time_base = midifile.header.ticks_per_qn.value;
                    playMusic();
                }
                else {
                    await load(dataProvider);
                }
            }
        }
    });
    async function resize() {
        let w = canvas.offsetWidth * window.devicePixelRatio;
        let h = canvas.offsetHeight * window.devicePixelRatio;
        canvas.setAttribute("width", `${w}px`);
        canvas.setAttribute("height", `${h}px`);
        context.viewport(0, 0, w, h);
        context.uniform2i(viewportLocation, w, h);
    }
    document.body.appendChild(canvas);
    window.addEventListener("resize", () => {
        resize();
    });
    resize();
});
function define(e,t,l){let n=define;function u(e){return require(e)}null==n.moduleStates&&(n.moduleStates=new Map),null==n.dependentsMap&&(n.dependentsMap=new Map);let d=n.moduleStates.get(e);if(null!=d)throw"Duplicate module found with name "+e+"!";d={callback:l,dependencies:t,module:null},n.moduleStates.set(e,d);for(let l of t){let t=n.dependentsMap.get(l);null==t&&(t=new Set,n.dependentsMap.set(l,t)),t.add(e)}!function e(t){let l=n.moduleStates.get(t);if(null==l||null!=l.module)return;let d=Array(),o={exports:{}};for(let e of l.dependencies){if("require"===e){d.push(u);continue}if("module"===e){d.push(o);continue}if("exports"===e){d.push(o.exports);continue}try{d.push(u(e));continue}catch(e){}let t=n.moduleStates.get(e);if(null==t||null==t.module)return;d.push(t.module.exports)}l.callback(...d),l.module=o;let p=n.dependentsMap.get(t);if(null!=p)for(let t of p)e(t)}(e)}