import * as zlib from "zlib";
import * as fs from "fs";
import { IntegerAssert, StringAssert } from "../../asserts";

function makeDataView(array: Uint8Array): DataView {
	return new DataView(array.buffer, array.byteOffset, array.byteLength);
};

function toAsciiString(array: Uint8Array): string {
	return Array.from(array).map((number) => String.fromCharCode(number)).join("");
};

type Cursor = {
	offset: number;
};

const TABLE = new Array<number>(5 * 256);

function initialize(): void {
	let seed = 0x00100001;
	for (let k = 0; k < 256; k += 1) {
		for (let j = k, i = 0; i < 5; i += 1, j += 256) {
			let a = (seed * 125 + 3) >>> 0;
			seed = (a % 0x002AAAAB) >>> 0;
			let hi = (seed & 0x0000FFFF) >>> 0;
			let b = (seed * 125 + 3) >>> 0;
			seed = (b % 0x002AAAAB) >>> 0;
			let lo = (seed & 0x0000FFFF) >>> 0;
			TABLE[j] = ((hi << 16) | lo) >>> 0;
		}
	}
};

initialize();

export enum KeySet {
	HASH_TABLE = 0,
	FILE_NAME_A = 1,
	FILE_NAME_B = 2,
	FILE_KEY = 3,
	BLOCK_DATA = 4
};

export function computeStringHash(string: string, type: KeySet): number {
	let seed1 = 0x7FED7FED;
	let seed2 = 0xEEEEEEEE;
	let offset = type * 256;
	for (let character of string.toUpperCase()) {
		let character_code = character.charCodeAt(0);
		let a = (seed1 + seed2) >>> 0;
		seed1 = (TABLE[offset + character_code] ^ a) >>> 0;
		let b = (seed2 << 5) >>> 0;
		seed2 = (character_code + seed1 + seed2 + b + 3) >>> 0;
	}
	return seed1;
};

export function getKeyForFileName(string: string): number {
	let file_name = string.split("\\").pop() as string;
	let key = computeStringHash(file_name, KeySet.FILE_KEY);
	return key;
};

export function adjustKey(key: number, block_table_entry: BlockTableEntry): number {
	if (block_table_entry.flags.uses_adjusted_key) {
		key = (key + block_table_entry.block_offset) >>> 0;
		key = (key ^ block_table_entry.uncompressed_size) >>> 0;
	}
	return key;
};

export function getSectorKey(key: number, sector: number): number {
	return (key + sector) >>> 0;
};

export function encryptData(array: Uint8Array, key: number): void {
	let dw = new DataView(array.buffer, array.byteOffset, array.byteLength);
	let seed = 0xEEEEEEEE;
	let offset = KeySet.BLOCK_DATA * 256;
	for (let o = 0, l = array.byteLength; o < l; o += 4) {
		let decrypted = dw.getUint32(o, true);
		seed = (seed + TABLE[offset + (key & 0xFF)]) >>> 0;
		let a = (key + seed) >>> 0;
		let encrypted = (decrypted ^ a) >>> 0;
		let b = (~key) >>> 0;
		let c = (b << 21) >>> 0;
		let d = (c + 0x11111111) >>> 0;
		let e = (key >>> 11) >>> 0;
		key = (d | e) >>> 0;
		let f = (seed << 5) >>> 0;
		seed = (decrypted + seed + f + 3) >>> 0;
		dw.setUint32(o, encrypted, true);
	}
};

export function decryptData(array: Uint8Array, key: number): void {
	let dw = new DataView(array.buffer, array.byteOffset, array.byteLength);
	let seed = 0xEEEEEEEE;
	let offset = KeySet.BLOCK_DATA * 256;
	for (let o = 0, l = array.byteLength - 3; o < l; o += 4) {
		let encrypted = dw.getUint32(o, true);
		seed = (seed + TABLE[offset + (key & 0xFF)]) >>> 0;
		let a = (key + seed) >>> 0;
		let decrypted = (encrypted ^ a) >>> 0;
		let b = (~key) >>> 0;
		let c = (b << 21) >>> 0;
		let d = (c + 0x11111111) >>> 0;
		let e = (key >>> 11) >>> 0;
		key = (d | e) >>> 0;
		let f = (seed << 5) >>> 0;
		seed = (decrypted + seed + f + 3) >>> 0;
		dw.setUint32(o, decrypted, true);
	}
};

const LISTFILE = "(listfile)";
const LISTFILE_KEY = getKeyForFileName(LISTFILE);
const HASH_TABLE_KEY = getKeyForFileName("(hash table)");
const BLOCK_TABLE_KEY = getKeyForFileName("(block table)");

export enum BlockTableEntryFlags {
	IS_IMPLODED = 0x00000100,
	IS_COMPRESSED = 0x00000200,
	IS_ENCRYPTED = 0x00010000,
	USES_ADJUSTED_KEY = 0x00020000,
	IS_PATCH =  0x00100000,
	IS_MISSING_SECTOR_OFFSETS_TABLE = 0x01000000,
	IS_DELETED = 0x02000000,
	HAS_CHECKSUM = 0x04000000,
	IS_FILE = 0x80000000
};

export type BlockTableEntry = {
	block_offset: number;
	block_length: number;
	uncompressed_size: number;
	flags: {
		is_imploded: boolean;
		is_compressed: boolean;
		is_encrypted: boolean;
		uses_adjusted_key: boolean;
		is_missing_sector_offsets_table: boolean;
		is_deleted: boolean;
		has_checksum: boolean;
		is_file: boolean;
	};
};

export const BlockTableEntry = {
	load(array: Uint8Array, cursor?: Cursor): BlockTableEntry {
		cursor = cursor ?? { offset: 0 };
		let dw = makeDataView(array);
		let block_offset = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let block_length = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let uncompressed_size = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let flags = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		return {
			block_offset,
			block_length,
			uncompressed_size,
			flags: {
				is_imploded: !!(flags & BlockTableEntryFlags.IS_IMPLODED),
				is_compressed: !!(flags & BlockTableEntryFlags.IS_COMPRESSED),
				is_encrypted: !!(flags & BlockTableEntryFlags.IS_ENCRYPTED),
				uses_adjusted_key: !!(flags & BlockTableEntryFlags.USES_ADJUSTED_KEY),
				is_missing_sector_offsets_table: !!(flags & BlockTableEntryFlags.IS_MISSING_SECTOR_OFFSETS_TABLE),
				is_deleted: !!(flags & BlockTableEntryFlags.IS_DELETED),
				has_checksum: !!(flags & BlockTableEntryFlags.HAS_CHECKSUM),
				is_file: !!(flags & BlockTableEntryFlags.IS_FILE)
			}
		};
	}
};

const BLOCK_INDEX_EMPTY_STOP_SEARCH = 0xFFFFFFFF;
const BLOCK_INDEX_EMPTY_CONTINUE_SEARCH = 0xFFFFFFFE;

export type HashTableEntry = {
	hash_using_name_a: number;
	hash_using_name_b: number;
	language: number;
	platform: number;
	block_index: number;
};

export const HashTableEntry = {
	load(array: Uint8Array, cursor?: Cursor): HashTableEntry {
		cursor = cursor ?? { offset: 0 };
		let dw = makeDataView(array);
		let hash_using_name_a = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let hash_using_name_b = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let language = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		let platform = dw.getUint8(cursor.offset); cursor.offset += 1;
		cursor.offset += 1;
		let block_index = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		return {
			hash_using_name_a,
			hash_using_name_b,
			language,
			platform,
			block_index
		};
	}
};

function findHashTableEntry(hash_table: Uint8Array, hash_table_slots: number, filename: string): HashTableEntry | undefined {
	let hash_a = computeStringHash(filename, KeySet.FILE_NAME_A);
	let hash_b = computeStringHash(filename, KeySet.FILE_NAME_B);
	let index = computeStringHash(filename, KeySet.HASH_TABLE) % hash_table_slots;
	while (true) {
		let entry = HashTableEntry.load(hash_table, { offset: index * 16 });
		if (entry.block_index === BLOCK_INDEX_EMPTY_STOP_SEARCH) {
			break;
		}
		if (entry.block_index !== BLOCK_INDEX_EMPTY_CONTINUE_SEARCH) {
			if (entry.hash_using_name_a === hash_a && entry.hash_using_name_b === hash_b) {
				return entry;
			}
		}
		index = (index + 1) % hash_table_slots;
	}
};

const SECTOR_SIZE = 512;

export enum CompressionType {
	SPARSE = 0x20,
	IMA_ADPCM_MONO = 0x40,
	IMA_ADPCM_STEREO = 0x80,
	HUFFMAN = 0x01,
	DEFLATED = 0x02,
	IMPLODED = 0x08,
	BZIP2 = 0x10
};

export type Archive = {
	header_size: number;
	file_size: number;
	version: number;
	sectors_per_block_log2: number;
	hash_table_offset: number;
	block_table_offset: number;
	hash_table_slots: number;
	block_table_slots: number;
};

export const Archive = {
	load(array: Uint8Array, cursor?: Cursor): Archive {
		cursor = cursor ?? { offset: 0 };
		let dw = makeDataView(array);
		let identifier = toAsciiString(array.subarray(cursor.offset, cursor.offset + 3)); cursor.offset += 3;
		StringAssert.identical(identifier, "MPQ");
		let type = dw.getUint8(cursor.offset); cursor.offset += 1;
		IntegerAssert.exactly(type, 0x1A);
		let header_size = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		IntegerAssert.atLeast(32, header_size);
		let file_size = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let version = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		let sectors_per_block_log2 = dw.getUint16(cursor.offset, true); cursor.offset += 2;
		let hash_table_offset = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let block_table_offset = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let hash_table_slots = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let block_table_slots = dw.getUint32(cursor.offset, true); cursor.offset += 4;
		let hash_table = array.subarray(hash_table_offset, hash_table_offset + hash_table_slots * 16);
		let block_table = array.subarray(block_table_offset, block_table_offset + block_table_slots * 16);
		let block_size = SECTOR_SIZE << sectors_per_block_log2;
		decryptData(hash_table, HASH_TABLE_KEY);
		decryptData(block_table, BLOCK_TABLE_KEY);
		//let file_name = "data\\global\\music\\Act1\\tristram.wav";
		let file_name = LISTFILE;
		let hash_table_entry = findHashTableEntry(hash_table, hash_table_slots, file_name);
		if (hash_table_entry != null) {
			console.log(hash_table_entry);
			let block_table_entry = BlockTableEntry.load(block_table, { offset: hash_table_entry.block_index * 16 });
			console.log(block_table_entry);
			let number_of_blocks = Math.ceil(block_table_entry.block_length / block_size);
			let block = array.subarray(block_table_entry.block_offset, block_table_entry.block_offset + block_table_entry.block_length);
			let key = getKeyForFileName(file_name);
			if (block_table_entry.flags.uses_adjusted_key) {
				key = adjustKey(key, block_table_entry);
			}
			let sector_offsets: Array<number> = [];
			if (block_table_entry.flags.is_missing_sector_offsets_table) {
				sector_offsets.push(0, block_table_entry.block_length);
			} else {
				let slice = block.slice(0, (number_of_blocks + 1) * 4);
				let dw = makeDataView(slice);
				if (block_table_entry.flags.is_encrypted) {
					decryptData(slice, getSectorKey(key, -1));
				}
				for (let i = 0, o = 0; i < number_of_blocks + 1; i += 1, o += 4) {
					sector_offsets.push(dw.getUint32(o, true));
				}
			}
			let blocks: Array<Uint8Array> = [];
			let blocks_size = 0;
			for (let i = 0; i < number_of_blocks; i++) {
				let slice = block.slice(sector_offsets[i], sector_offsets[i + 1]);
				if (block_table_entry.flags.is_encrypted) {
					decryptData(slice, getSectorKey(key, i));
				}
				if (slice.length < block_size) {
					let compression_type = slice[0] as CompressionType;
					if (compression_type & CompressionType.BZIP2) {
						throw new Error(`Compression type BZIP2 not supported!`);
					}
					if (compression_type & CompressionType.IMPLODED) {
						throw new Error(`Compression type IMPLODED not supported!`);
					}
					if (compression_type & CompressionType.DEFLATED) {
						throw new Error(`Compression type DEFLATED not supported!`);
					}
					if (compression_type & CompressionType.HUFFMAN) {
						throw new Error(`Compression type HUFFMAN not supported!`);
					}
					if (compression_type & CompressionType.IMA_ADPCM_STEREO) {
						throw new Error(`Compression type IMA_ADPCM_STEREO not supported!`);
					}
					if (compression_type & CompressionType.IMA_ADPCM_MONO) {
						throw new Error(`Compression type IMA_ADPCM_MONO not supported!`);
					}
					if (compression_type & CompressionType.SPARSE) {
						throw new Error(`Compression type SPARSE not supported!`);
					}
				} else {
					blocks.push(slice);
					blocks_size += slice.length;
				}
			}
			let data = new Uint8Array(blocks_size);
			let offset = 0;
			for (let block of blocks) {
				data.set(block, offset);
				offset += block.length;
			}/*
			fs.writeFileSync("./private/d2/test.wav", data); */
		}
		return {
			header_size,
			file_size,
			version,
			sectors_per_block_log2,
			hash_table_offset,
			block_table_offset,
			hash_table_slots,
			block_table_slots
		};
	}
};
