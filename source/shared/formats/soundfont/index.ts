import { IntegerAssert, StringAssert } from "../../asserts";
import { Buffer, Chunk, Loadable, Reader, BufferReader, Cursor } from "../../binary";
import { ByteString, Integer1, Integer2, PackedInteger2, Integer4 } from "../../binary/chunks";
import * as riff from "../riff";

export enum SampleLink {
	MONO = 1,
	RIGHT = 2,
	LEFT = 4,
	LINKED = 8,
	ROM_MONO = 0x8000 + MONO,
	ROM_RIGHT = 0x8000 + RIGHT,
	ROM_LEFT = 0x8000 + LEFT,
	ROM_LINKED = 0x8000 + LINKED,
};

export enum GeneratorType {
	START_ADDRESS_OFFSET = 0,
	END_ADDRESS_OFFSET = 1,
	START_LOOP_ADDRESS_OFFSET = 2,
	END_LOOP_ADDRESS_OFFSET = 3,
	START_ADDRESS_COARSE_OFFSET = 4,
	MOD_LFO_TO_PITCH = 5,
	VIB_LFO_TO_PITCH = 6,
	MOD_ENV_TO_PITCH = 7,
	INITIAL_FILTER_FC = 8,
	INITIAL_FILTER_Q = 9,
	MOD_FLO_TO_FILTER_FC = 10,
	MOD_ENV_TO_FILTER_FC = 11,
	END_ADDRESS_COARSE_OFFSET = 12,
	MOD_LFO_TO_VOLUME = 13,
	UNUSED_1 = 14,
	CHORUS_EFFECT_SEND = 15,
	REVERB_EFFECT_SEND = 16,
	PAN = 17,
	UNUSED_2 = 18,
	UNUSED_3 = 19,
	UNUSED_4 = 20,
	MOD_LFO_DELAY = 21,
	MOD_LFO_FREQ = 22,
	VIB_LFO_DELAY = 23,
	VIB_LFO_FREQ = 24,
	MOD_ENV_DELAY = 25,
	MOD_ENV_ATTACK = 26,
	MOD_ENV_HOLD = 27,
	MOD_ENV_DECAY = 28,
	MOD_ENV_SUSTAIN = 29,
	MOD_ENV_RELEASE = 30,
	MOD_ENV_KEY_TO_HOLD = 31,
	MOD_ENV_KEY_TO_DECAY = 32,
	VOL_ENV_DELAY = 33,
	VOL_ENV_ATTACK = 34,
	VOL_ENV_HOLD = 35,
	VOL_ENV_DECAY = 36,
	VOL_ENV_SUSTAIN = 37,
	VOL_ENV_RELEASE = 38,
	VOL_ENV_KEY_TO_HOLD = 39,
	VOL_ENV_KEY_TO_DECAY = 40,
	INSTRUMENT = 41,
	RESERVED_1 = 42,
	KEY_RANGE = 43,
	VEL_RANGE = 44,
	START_LOOP_ADDRESS_COARSE_OFFSET = 45,
	KEYNUM = 46,
	VELOCITY = 47,
	INITIAL_ATTENUATION = 48,
	RESERVED_2 = 49,
	END_LOOP_ADDRESS_COARSE_OFFSET = 50,
	COARSE_TUNE = 51,
	FINE_TUNE = 52,
	SAMPLE_ID = 53,
	SAMPLE_MODES = 54,
	RESERVED_3 = 55,
	SCALE_TUNING = 56,
	EXCLUSIVE_CLASS = 57,
	OVERRIDING_ROOT_KEY = 58,
	UNUSED_5 = 59,
	END_OPERATOR = 60
};

export class GeneratorParameters extends Chunk {
	readonly first: Integer1;
	readonly second: Integer1;
	readonly signed: Integer2;
	readonly unsigned: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(2);
		IntegerAssert.exactly(buffer.size(), 2);
		super(buffer);
		this.first = new Integer1({
			buffer: buffer.window({ offset: 0, length: 1 })
		});
		this.second = new Integer1({
			buffer: buffer.window({ offset: 1, length: 1 })
		});
		this.signed = new Integer2({
			buffer: buffer.window({ offset: 0, length: 2 }),
			complement: "twos"
		});
		this.unsigned = new Integer2({
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
};

export class Modulator extends Integer2 {
	readonly index: PackedInteger2;
	readonly continuous: PackedInteger2;
	readonly direction: PackedInteger2;
	readonly polarity: PackedInteger2;
	readonly type: PackedInteger2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		super(options);
		this.index = new PackedInteger2(this, {
			offset: 0,
			length: 7
		});
		this.continuous = new PackedInteger2(this, {
			offset: 7,
			length: 1
		});
		this.direction = new PackedInteger2(this, {
			offset: 8,
			length: 1
		});
		this.polarity = new PackedInteger2(this, {
			offset: 9,
			length: 1
		});
		this.type = new PackedInteger2(this, {
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
};

// TODO: Extend from chunk?
export class Generator extends Integer2 {
	readonly type: PackedInteger2;
	readonly link: PackedInteger2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		super(options);
		this.type = new PackedInteger2(this, {
			offset: 0,
			length: 15
		});
		this.link = new PackedInteger2(this, {
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
};

export class Transform extends Integer2 {
	readonly index: PackedInteger2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		super(options);
		this.index = new PackedInteger2(this, {
			offset: 0,
			length: 16
		});
	}

	toJSON() {
		return {
			index: this.index.value
		};
	}
};

export class PresetHeader extends Chunk {
	readonly name: ByteString;
	readonly preset: Integer2;
	readonly bank: Integer2;
	readonly pbag_index: Integer2;
	readonly library: Integer4;
	readonly genre: Integer4;
	readonly morphology: Integer4;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(38);
		IntegerAssert.exactly(buffer.size(), 38);
		super(buffer);
		this.name = new ByteString({
			buffer: buffer.window({
				offset: 0,
				length: 20
			})
		});
		this.preset = new Integer2({
			buffer: buffer.window({
				offset: 20,
				length: 2
			})
		});
		this.bank = new Integer2({
			buffer: buffer.window({
				offset: 22,
				length: 2
			})
		});
		this.pbag_index = new Integer2({
			buffer: buffer.window({
				offset: 24,
				length: 2
			})
		});
		this.library = new Integer4({
			buffer: buffer.window({
				offset: 26,
				length: 4
			})
		});
		this.genre = new Integer4({
			buffer: buffer.window({
				offset: 30,
				length: 4
			})
		});
		this.morphology = new Integer4({
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
};

export class PresetBag extends Chunk {
	readonly pgen_index: Integer2;
	readonly pmod_index: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		IntegerAssert.exactly(buffer.size(), 4);
		super(buffer);
		this.pgen_index = new Integer2({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.pmod_index = new Integer2({
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
};

export class PresetModulator extends Chunk {
	readonly modulator_source_operator: Modulator;
	readonly generator_destination_operator: Generator;
	readonly modulator_amount: Integer2;
	readonly modulator_amount_source_operator: Modulator;
	readonly modulator_transform_operator: Transform;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(10);
		IntegerAssert.exactly(buffer.size(), 10);
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
		this.modulator_amount = new Integer2({
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
};

export class PresetGenerator extends Chunk {
	readonly generator: Generator;
	readonly parameters: GeneratorParameters;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		IntegerAssert.exactly(buffer.size(), 4);
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
};

export class Instrument extends Chunk {
	readonly name: ByteString;
	readonly ibag_index: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(22);
		IntegerAssert.exactly(buffer.size(), 22);
		super(buffer);
		this.name = new ByteString({
			buffer: buffer.window({
				offset: 0,
				length: 20
			})
		});
		this.ibag_index = new Integer2({
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
};

export class InstrumentBag extends Chunk {
	readonly igen_index: Integer2;
	readonly imod_index: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		IntegerAssert.exactly(buffer.size(), 4);
		super(buffer);
		this.igen_index = new Integer2({
			buffer: buffer.window({
				offset: 0,
				length: 2
			})
		});
		this.imod_index = new Integer2({
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
};

export class InstrumentModulator extends Chunk {
	readonly modulator_source_operator: Modulator;
	readonly generator_destination_operator: Generator;
	readonly modulator_amount: Integer2;
	readonly modulator_amount_source_operator: Modulator;
	readonly modulator_transform_operator: Transform;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(10);
		IntegerAssert.exactly(buffer.size(), 10);
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
		this.modulator_amount = new Integer2({
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
};

export class InstrumentGenerator extends Chunk {
	readonly generator: Generator;
	readonly parameters: GeneratorParameters;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(4);
		IntegerAssert.exactly(buffer.size(), 4);
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
};

export class SampleHeader extends Chunk {
	readonly name: ByteString;
	readonly start: Integer4;
	readonly end: Integer4;
	readonly loop_start: Integer4;
	readonly loop_end: Integer4;
	readonly sample_rate: Integer4;
	readonly original_key: Integer1;
	readonly correction: Integer1;
	readonly link: Integer2;
	readonly type: Integer2;

	constructor(options?: Partial<{ buffer: Buffer }>) {
		let buffer = options?.buffer ?? Buffer.alloc(46);
		IntegerAssert.exactly(buffer.size(), 46);
		super(buffer);
		this.name = new ByteString({
			buffer: buffer.window({
				offset: 0,
				length: 20
			})
		});
		this.start = new Integer4({
			buffer: buffer.window({
				offset: 20,
				length: 4
			})
		});
		this.end = new Integer4({
			buffer: buffer.window({
				offset: 24,
				length: 4
			})
		});
		this.loop_start = new Integer4({
			buffer: buffer.window({
				offset: 28,
				length: 4
			})
		});
		this.loop_end = new Integer4({
			buffer: buffer.window({
				offset: 32,
				length: 4
			})
		});
		this.sample_rate = new Integer4({
			buffer: buffer.window({
				offset: 36,
				length: 4
			})
		});
		this.original_key = new Integer1({
			buffer: buffer.window({
				offset: 40,
				length: 1
			})
		});
		this.correction = new Integer1({
			buffer: buffer.window({
				offset: 41,
				length: 1
			}),
			complement: "twos"
		});
		this.link = new Integer2({
			buffer: buffer.window({
				offset: 42,
				length: 2
			})
		});
		this.type = new Integer2({
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
};

export class File implements Loadable {
	smpl: Reader;
	sm24: Reader;
	phdr: Array<PresetHeader>;
	pbag: Array<PresetBag>;
	pmod: Array<PresetModulator>;
	pgen: Array<PresetGenerator>;
	inst: Array<Instrument>;
	ibag: Array<InstrumentBag>;
	imod: Array<InstrumentModulator>;
	igen: Array<InstrumentGenerator>;
	shdr: Array<SampleHeader>;

	constructor() {
		this.smpl = new BufferReader();
		this.sm24 = new BufferReader();
		this.phdr = new Array<PresetHeader>();
		this.pbag = new Array<PresetBag>();
		this.pmod = new Array<PresetModulator>();
		this.pgen = new Array<PresetGenerator>();
		this.inst = new Array<Instrument>();
		this.ibag = new Array<InstrumentBag>();
		this.imod = new Array<InstrumentModulator>();
		this.igen = new Array<InstrumentGenerator>();
		this.shdr = new Array<SampleHeader>();
	}

	async load(cursor: Cursor, reader: Reader): Promise<this> {
		// TODO: Reset state or make static.
		let chunk = await riff.File.parseChunk(cursor, reader);
		console.log("" + chunk.header.type.value + ": " + chunk.header.size.value);
		StringAssert.identical(chunk.header.type.value, "RIFF");
		{
			let reader = chunk.body;
			let cursor = new Cursor();
			let type = await new ByteString({ buffer: Buffer.alloc(4) }).load(cursor, reader);
			StringAssert.identical(type.value, "sfbk");
			while (cursor.offset < reader.size()) {
				let chunk = await riff.File.parseChunk(cursor, reader);
				console.log("\t" + chunk.header.type.value + ": " + chunk.header.size.value);
				StringAssert.identical(chunk.header.type.value, "LIST");
				{
					let reader = chunk.body;
					let cursor = new Cursor();
					let type = await new ByteString({ buffer: Buffer.alloc(4) }).load(cursor, reader);
					if (false) {
					} else if (type.value === "INFO") {
						while (cursor.offset < reader.size()) {
							let chunk = await riff.File.parseChunk(cursor, reader);
							console.log("\t\t" + chunk.header.type.value + ": " + chunk.header.size.value);
							if (false) {
							} else if (chunk.header.type.value === "ifil") {
							} else if (chunk.header.type.value === "INAM") {
							} else if (chunk.header.type.value === "ISFT") {
							} else if (chunk.header.type.value === "ICOP") {
							} else if (chunk.header.type.value === "IENG") {
							} else if (chunk.header.type.value === "ICMT") {
							}
						}
					} else if (type.value === "sdta") {
						while (cursor.offset < reader.size()) {
							let chunk = await riff.File.parseChunk(cursor, reader);
							console.log("\t\t" + chunk.header.type.value + ": " + chunk.header.size.value);
							if (false) {
							} else if (chunk.header.type.value === "smpl") {
								this.smpl = chunk.body;
							} else if (chunk.header.type.value === "sm24") {
								this.sm24 = chunk.body;
							}
						}
					} else if (type.value === "pdta") {
						while (cursor.offset < reader.size()) {
							let chunk = await riff.File.parseChunk(cursor, reader);
							console.log("\t\t" + chunk.header.type.value + ": " + chunk.header.size.value);
							if (false) {
							} else if (chunk.header.type.value === "phdr") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new PresetHeader().load(cursor, reader);
									this.phdr.push(header);
								}
							} else if (chunk.header.type.value === "pbag") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new PresetBag().load(cursor, reader);
									this.pbag.push(header);
								}
							} else if (chunk.header.type.value === "pmod") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new PresetModulator().load(cursor, reader);
									this.pmod.push(header);
								}
							} else if (chunk.header.type.value === "pgen") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new PresetGenerator().load(cursor, reader);
									this.pgen.push(header);
								}
							} else if (chunk.header.type.value === "inst") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new Instrument().load(cursor, reader);
									this.inst.push(header);
								}
							} else if (chunk.header.type.value === "ibag") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new InstrumentBag().load(cursor, reader);
									this.ibag.push(header);
								}
							} else if (chunk.header.type.value === "imod") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new InstrumentModulator().load(cursor, reader);
									this.imod.push(header);
								}
							} else if (chunk.header.type.value === "igen") {
								let reader = chunk.body;
								let cursor = new Cursor();
								while (cursor.offset < reader.size()) {
									let header = await new InstrumentGenerator().load(cursor, reader);
									this.igen.push(header);
								}
							} else if (chunk.header.type.value === "shdr") {
								let reader = chunk.body;
								let cursor = new Cursor();
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
};
