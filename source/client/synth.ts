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
	file: soundfont.File;
	igen_index: number;
	buffer: AudioBuffer | undefined;

	constructor() {
		this.file = new soundfont.File();
		this.igen_index = 0;
	}

	async getBuffer(context: AudioContext, midikey: number): Promise<{ buffer: AudioBufferSourceNode, cents: number }> {
		let buffer = this.buffer;
		let sample_header = new soundfont.SampleHeader();
		let igen_index = this.igen_index;
		let root_key_override: number | undefined;
		let loop = false;
		let mod_lfo_delay_s = 0.0;
		let mod_lfo_freq_hz = 8.176;
		let mod_lfo_to_pitch_cents: undefined | number;
		let mod_lfo_to_volume_centibels: undefined | number;
		let key_range_low = 0;
		let key_range_high = 127;
		let vol_env_delay_s = 0;
		let vol_env_attack_s = 0;
		let vol_env_hold_s = 0;
		let vol_env_deacy_s = 0;
		let vol_env_sustain_decrease_centibels = 0;
		let vol_env_release_s = 0;
		while (igen_index < this.file.igen.length) {
			let generator = this.file.igen[igen_index++];
			if (is.absent(generator)) {
				throw ``;
			}
			let type = generator.generator.type.value;
			if (is.absent(buffer)) {
				console.log(soundfont.GeneratorType[type], generator.parameters.signed.value);
			}
			if (false) {
			} else if (type === soundfont.GeneratorType.DELAY_VOL_ENV) {
				vol_env_delay_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.ATTACK_VOL_ENV) {
				vol_env_attack_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.HOLD_VOL_ENV) {
				vol_env_hold_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.DECAY_VOL_ENV) {
				vol_env_deacy_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.SUSTAIN_VOL_ENV) {
				vol_env_sustain_decrease_centibels = generator.parameters.signed.value;
			} else if (type === soundfont.GeneratorType.RELEASE_VOL_ENV) {
				vol_env_release_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.KEY_RANGE) {
				key_range_low = generator.parameters.first.value;
				key_range_high = generator.parameters.second.value;
			} else if (type === soundfont.GeneratorType.DELAY_MOD_LFO) {
				let value = generator.parameters.signed.value;
				mod_lfo_delay_s = 2 ** (value / 1200);
			} else if (type === soundfont.GeneratorType.FREQ_MOD_LFO) {
				let value = generator.parameters.signed.value;
				mod_lfo_freq_hz = 8.176 * 2 ** (value / 1200);
			} else if (type === soundfont.GeneratorType.MOD_LFO_TO_PITCH) {
				let value = generator.parameters.signed.value;
				mod_lfo_to_pitch_cents = value;
			} else if (type === soundfont.GeneratorType.MOD_LFO_TO_VOLUME) {
				let value = generator.parameters.signed.value;
				mod_lfo_to_volume_centibels = value;
			} else if (type === soundfont.GeneratorType.SAMPLE_ID) {
				if (is.absent(buffer)) {
					console.log("");
				}
				sample_header = this.file.shdr[generator.parameters.signed.value];
				if (is.absent(sample_header)) {
					throw ``;
				}
				break;
			} else if (type === soundfont.GeneratorType.SAMPLE_MODES) {
				// TODO: Support loop during key depression (mode 3).
				let value = generator.parameters.signed.value;
				if (value >= 0 && value <= 3) {
					loop = value === 1;
				}
			} else if (type === soundfont.GeneratorType.OVERRIDING_ROOT_KEY) {
				let value = generator.parameters.signed.value;
				if (value >= 0 && value <= 127) {
					root_key_override = value;
				}
			}
		}
		let root_key_semitones = root_key_override ?? sample_header.original_key.value;
		if (is.absent(buffer)) {
			let sample_count = sample_header.end.value - sample_header.start.value;
			let reader = this.file.smpl;
			let cursor = new Cursor({ offset: sample_header.start.value * 2 });
			buffer = context.createBuffer(1, sample_count, sample_header.sample_rate.value);
			let sample = new Integer2({ complement: "twos" });
			for (let s = 0; s < sample_count; s++) {
				await sample.load(cursor, reader);
				let value = ((sample.value + 32768) / 65535) * 2.0 - 1.0;
				buffer.getChannelData(0)[s] = value;
			}
			this.buffer = buffer;
		}
		let mod_lfo_osc = context.createOscillator();
		mod_lfo_osc.type = "triangle";
		mod_lfo_osc.frequency.value = mod_lfo_freq_hz;
		let mod_lfo_delayed = context.createDelay(mod_lfo_delay_s);
		mod_lfo_osc.connect(mod_lfo_delayed);
		let mod_lfo_gained = context.createGain();
		mod_lfo_delayed.connect(mod_lfo_gained);
		mod_lfo_gained.gain.value = Math.pow(10, (mod_lfo_to_volume_centibels ?? 0)/200);
		let source = context.createBufferSource();
		source.buffer = buffer;
		source.loopStart = (sample_header.loop_start.value - sample_header.start.value) / sample_header.sample_rate.value;
		source.loopEnd = (sample_header.loop_end.value - sample_header.start.value) / sample_header.sample_rate.value;
		source.loop = loop;
		let detune_cents = (midikey - root_key_semitones) * 100 + sample_header.correction.value;
		source.detune.value =  detune_cents;
		let sample_gain1 = context.createGain();
		source.connect(sample_gain1);
		if (is.present(mod_lfo_to_volume_centibels)) {
			mod_lfo_gained.connect(sample_gain1.gain);
		}
		let sample_gain2 = context.createGain();
		sample_gain1.connect(sample_gain2);
		let env_vol_gain = context.createGain();
		env_vol_gain.gain.setValueAtTime(0.0, vol_env_delay_s);
		env_vol_gain.gain.exponentialRampToValueAtTime(1.0, vol_env_delay_s + vol_env_attack_s);
		env_vol_gain.gain.setValueAtTime(1.0, vol_env_delay_s + vol_env_attack_s + vol_env_hold_s);
		env_vol_gain.gain.linearRampToValueAtTime(Math.pow(10, -vol_env_sustain_decrease_centibels/200), vol_env_delay_s + vol_env_attack_s + vol_env_hold_s + vol_env_deacy_s);
		env_vol_gain.connect(sample_gain2.gain);
		sample_gain2.connect(context.destination);
		source.start();
		mod_lfo_osc.start();
		return {
			buffer: source,
			cents: detune_cents
		};
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
			program.file = file;
			program.igen_index = instrument_bag.igen_index.value;
		}
		return synth;
	}
};
