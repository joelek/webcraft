/*
original_key: middle C, 261.62 Hz = 60
pitch_correction: cents
a bank is a set of patches/programs/instruments
phdr contains banks and presets, bank 0 presets correspond to midi instruments


phdr: 236 entries
	preset varies between 0 and 127, 255 is invalid
	bank varies between 0 and 128, 255 is invalid
	bag_index points to pbag and increases from 0 to 235
pbag: 236 entries
	generator_index points to pgen and increases from 0 to 235
	modulator_index points to pmod, always 0
pmod: 1 entry
	only terminal record
pgen: 236 entries
	generator is 41 (which is an enum meaning instrument generator)
	amount is increasing from 0 to 234, last one is zeroed

inst: 236 entries
	bag_index points to ibag, indices 0 to 1724 (increasing but not continous)
ibag: 1725 entries
	generator_index points to igen and uses indices from 0 to 12898
	modulator_index points to pmod, always 0
imod: 1 entry
	only terminal record
igen: 12899 entries
	generator varies (5, 21, 22, 26, 28 etc) corresponds to enumerated algorithm
	amount varies

shdr: 496 entries







general midi has 16 channels, channel 10 is reserved for percussion,
general midi has 128 instruments, channel 10 has different ones
set instrument sets the instrument of the channel

*/

import { is } from "../shared";
import { BufferReader, Cursor, Reader } from "../shared/binary";
import { Integer2 } from "../shared/binary/chunks";
import * as soundfont from "../shared/formats/soundfont";

export class Program {
	sample_header: soundfont.SampleHeader;
	reader: Reader;
	buffer: AudioBuffer | undefined;

	constructor() {
		this.sample_header = new soundfont.SampleHeader();
		this.reader = new BufferReader();
	}

	async getBuffer(context: AudioContext): Promise<AudioBufferSourceNode> {
		let buffer = this.buffer;
		if (is.absent(buffer)) {
			let sample_count = this.sample_header.end.value - this.sample_header.start.value;
			let reader = this.reader;
			let cursor = new Cursor({ offset: this.sample_header.start.value * 2 });
			buffer = context.createBuffer(1, sample_count, this.sample_header.sample_rate.value);
			let sample = new Integer2({ complement: "twos" });
			for (let s = 0; s < sample_count; s++) {
				await sample.load(cursor, reader);
				let value = ((sample.value + 32768) / 65535) * 2.0 - 1.0;
				buffer.getChannelData(0)[s] = value;
			}
			this.buffer = buffer;
		}
		let source = context.createBufferSource();
		source.buffer = buffer;
		source.loopStart = (this.sample_header.loop_start.value - this.sample_header.start.value) / this.sample_header.sample_rate.value;
		source.loopEnd = (this.sample_header.loop_end.value - this.sample_header.start.value) / this.sample_header.sample_rate.value;
		source.loop = true;
		return source;
	}
};

export class Bank {
	programs: Array<Program>;

	constructor() {
		this.programs = new Array<Program>();
		for (let i = 0; i < 128; i++) {
			this.programs.push(new Program());
		}
	}
};

export class WavetableSynth {
	banks: Array<Bank>;

	constructor() {
		this.banks = new Array<Bank>();
		for (let i = 0; i < 10; i++) {
			this.banks.push(new Bank());
		}
	}

	static async fromSoundfont(file: soundfont.File): Promise<WavetableSynth> {
		let synth = new WavetableSynth();
		outer: for (let preset_header of file.phdr) {
			let bank = synth.banks[preset_header.bank.value];
			if (is.absent(bank)) {
				continue;
			}
			let program = bank.programs[preset_header.preset.value];
			if (is.absent(program)) {
				continue;
			}
			let preset_bag = file.pbag[preset_header.pbag_index.value];
			if (is.absent(preset_bag)) {
				continue;
			}
			let preset_generator = file.pgen[preset_bag.pgen_index.value];
			if (is.absent(preset_generator)) {
				continue;
			}
			let preset_generator_index = preset_generator.generator.type.value;
			if (preset_generator_index !== 41) {
				continue;
			}
			let instrument = file.inst[preset_generator.parameters.signed.value];
			if (is.absent(instrument)) {
				continue;
			}
			let instrument_bag = file.ibag[instrument.ibag_index.value];
			if (is.absent(instrument_bag)) {
				continue;
			}
			let igen_index = instrument_bag.igen_index.value;
			inner: while (igen_index < file.igen.length) {
				let generator = file.igen[igen_index++];
				if (is.absent(generator)) {
					continue outer;
				}
				let type = generator.generator.type.value;
				if (type === 53) {
					let sample_header = file.shdr[generator.parameters.signed.value];
					if (is.absent(sample_header)) {
						continue outer;
					}
					program.sample_header = sample_header;
					program.reader = file.smpl;
					break inner;
				}
			}
		}
		return synth;
	}
};
