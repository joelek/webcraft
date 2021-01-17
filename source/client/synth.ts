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


// 1. Modify pitch according to mod_lfo
// 2. Modify pitch according to mod_env
// 3. Fix channel volumes

export type MidiChannel = {
	volume: (factor: number) => void;
	stop: () => void;
	release: (midikey: number, velocity: number) => void;
};

export class Program {
	file: soundfont.File;
	igen_index: number;
	buffer: AudioBuffer | undefined;

	constructor() {
		this.file = new soundfont.File();
		this.igen_index = 0;
	}

	async makeChannel(context: AudioContext, midikey: number, velocity: number, mixer: GainNode, channel: number): Promise<MidiChannel> {
		let buffer = this.buffer;
		let sample_header = new soundfont.SampleHeader();
		let igen_index = this.igen_index;
		let root_key_override: number | undefined;
		let loop = false;
		let mod_lfo_to_pitch_cents: undefined | number;
		let mod_lfo_to_volume_centibels: undefined | number;
		// TODO: Figure out what to do with these.
		let key_range_low = 0;
		let key_range_high = 127;

		let params = {
			env: {
				vol: {
					delay_s: 0,
					attack_s: 0,
					hold_s: 0,
					deacy_s: 0,
					sustain_level: 1,
					release_s: 0,
					hold_time_factor: 1,
					decay_time_factor: 1
				},
				mod: {
					delay_s: 0,
					attack_s: 0,
					hold_s: 0,
					deacy_s: 0,
					sustain_level: 1,
					release_s: 0,
					hold_time_factor: 1,
					decay_time_factor: 1
				}
			},
			lfo: {
				mod: {
					delay_s: 0,
					freq_hz: 8.176
				},
				vib: {
					delay_s: 0,
					freq_hz: 8.176
				}
			}
		};

		let mod_env_to_pitch_cents: undefined | number;

		let volume_decrease_centibels = 0;

		let initial_filter_cutoff_hz = 20000;
		let initial_filter_q_db = 0;

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
			} else if (type === soundfont.GeneratorType.INITIAL_FILTER_FC) {
				initial_filter_cutoff_hz = 8.176 * 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.INITIAL_FILTER_Q) {
				initial_filter_q_db = generator.parameters.signed.value / 10;
			} else if (type === soundfont.GeneratorType.INITIAL_ATTENUATION) {
				volume_decrease_centibels = generator.parameters.signed.value;
			} else if (type === soundfont.GeneratorType.MOD_ENV_TO_PITCH) {
				mod_env_to_pitch_cents = generator.parameters.signed.value;
			} else if (type === soundfont.GeneratorType.VOL_ENV_KEY_TO_HOLD) {
				params.env.vol.hold_time_factor = 2 ** (generator.parameters.signed.value / 100 * (60 - midikey) / 12);
			} else if (type === soundfont.GeneratorType.VOL_ENV_KEY_TO_DECAY) {
				params.env.vol.decay_time_factor = 2 ** (generator.parameters.signed.value / 100 * (60 - midikey) / 12);
			} else if (type === soundfont.GeneratorType.VOL_ENV_DELAY) {
				params.env.vol.delay_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.VOL_ENV_ATTACK) {
				params.env.vol.attack_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.VOL_ENV_HOLD) {
				params.env.vol.hold_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.VOL_ENV_DECAY) {
				params.env.vol.deacy_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.VOL_ENV_SUSTAIN) {
				let value_cb = Math.max(0, Math.min(generator.parameters.signed.value, 1440));
				params.env.vol.sustain_level = Math.pow(10, -value_cb/200);
			} else if (type === soundfont.GeneratorType.VOL_ENV_RELEASE) {
				params.env.vol.release_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.MOD_ENV_KEY_TO_HOLD) {
				params.env.mod.hold_time_factor = 2 ** (generator.parameters.signed.value / 100 * (60 - midikey) / 12);
			} else if (type === soundfont.GeneratorType.MOD_ENV_KEY_TO_DECAY) {
				params.env.mod.decay_time_factor = 2 ** (generator.parameters.signed.value / 100 * (60 - midikey) / 12);
			} else if (type === soundfont.GeneratorType.MOD_ENV_DELAY) {
				params.env.mod.delay_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.MOD_ENV_ATTACK) {
				params.env.mod.attack_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.MOD_ENV_HOLD) {
				params.env.mod.hold_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.MOD_ENV_DECAY) {
				params.env.mod.deacy_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.MOD_ENV_SUSTAIN) {
				let value_pm = Math.max(0, Math.min(generator.parameters.signed.value, 1000));
				let decrease_level = value_pm / 1000;
				params.env.mod.sustain_level = 1.0 - decrease_level;
			} else if (type === soundfont.GeneratorType.MOD_ENV_RELEASE) {
				params.env.mod.release_s = 2 ** (generator.parameters.signed.value / 1200);
			} else if (type === soundfont.GeneratorType.KEY_RANGE) {
				key_range_low = generator.parameters.first.value;
				key_range_high = generator.parameters.second.value;
			} else if (type === soundfont.GeneratorType.MOD_LFO_DELAY) {
				let value = generator.parameters.signed.value;
				params.lfo.mod.delay_s = 2 ** (value / 1200);
			} else if (type === soundfont.GeneratorType.MOD_LFO_FREQ) {
				let value = generator.parameters.signed.value;
				params.lfo.mod.freq_hz = 8.176 * 2 ** (value / 1200);
			} else if (type === soundfont.GeneratorType.MOD_LFO_TO_PITCH) {
				let value = generator.parameters.signed.value;
				mod_lfo_to_pitch_cents = value;
			} else if (type === soundfont.GeneratorType.MOD_LFO_TO_VOLUME) {
				let value = generator.parameters.signed.value;
				mod_lfo_to_volume_centibels = value;
			} else if (type === soundfont.GeneratorType.SAMPLE_ID) {
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
			console.log(channel, JSON.stringify(params, null, 2));
			console.log("");
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
		mod_lfo_osc.frequency.value = params.lfo.mod.freq_hz;
		let mod_lfo_delayed = context.createDelay(params.lfo.mod.delay_s);
		mod_lfo_osc.connect(mod_lfo_delayed);
		let mod_lfo_gained = context.createGain();
		mod_lfo_delayed.connect(mod_lfo_gained);
		mod_lfo_gained.gain.value = Math.pow(10, (mod_lfo_to_volume_centibels ?? 0)/200);
		let source = context.createBufferSource();
		source.buffer = buffer;
		source.loopStart = (sample_header.loop_start.value - sample_header.start.value) / sample_header.sample_rate.value;
		source.loopEnd = (sample_header.loop_end.value - sample_header.start.value) / sample_header.sample_rate.value;
		source.loop = loop;


		let lowpass_filter = context.createBiquadFilter();
		source.connect(lowpass_filter);
		lowpass_filter.type = "lowpass";
		lowpass_filter.frequency.value = initial_filter_cutoff_hz;
		lowpass_filter.Q.value = initial_filter_q_db;


		let sample_gain0 = context.createGain();
		lowpass_filter.connect(sample_gain0);
		let key_att_centibels = (1-velocity/127)*(1-velocity/127)*960;
		sample_gain0.gain.value = Math.pow(10, (-key_att_centibels + volume_decrease_centibels)/200);


		let sample_gain1 = context.createGain();
		sample_gain0.connect(sample_gain1);
		if (is.present(mod_lfo_to_volume_centibels)) {
			mod_lfo_gained.connect(sample_gain1.gain);
		}
		let sample_gain2 = context.createGain();
		sample_gain1.connect(sample_gain2);


		let vol_env = context.createGain();
		{
			let t0 = context.currentTime;
			let t1 = t0 + params.env.vol.delay_s;
			let t2 = t1 + params.env.vol.attack_s;
			let t3 = t2 + (params.env.vol.hold_s * params.env.vol.hold_time_factor);
			let t4 = t3 + (params.env.vol.deacy_s * params.env.vol.decay_time_factor);
			vol_env.gain.setValueAtTime(0.0, t0);
			vol_env.gain.setValueAtTime(0.0, t1);
			vol_env.gain.exponentialRampToValueAtTime(1.0, t2);
			vol_env.gain.setValueAtTime(1.0, t3);
			vol_env.gain.linearRampToValueAtTime(params.env.vol.sustain_level, t4);
		}
		vol_env.connect(sample_gain2.gain);




		let mod_env = context.createGain();
		{
			let t0 = context.currentTime;
			let t1 = t0 + params.env.mod.delay_s;
			let t2 = t1 + params.env.mod.attack_s;
			let t3 = t2 + (params.env.mod.hold_s * params.env.mod.hold_time_factor);
			let t4 = t3 + (params.env.mod.deacy_s * params.env.mod.decay_time_factor);
			mod_env.gain.setValueAtTime(0.0, t0);
			mod_env.gain.setValueAtTime(0.0, t1);
			mod_env.gain.exponentialRampToValueAtTime(1.0, t2);
			mod_env.gain.setValueAtTime(1.0, t3);
			mod_env.gain.linearRampToValueAtTime(params.env.mod.sustain_level, t4);
		}
		if (is.present(mod_env_to_pitch_cents)) {
			let constant = context.createConstantSource();
			let gain = context.createGain();
			constant.offset.value = mod_env_to_pitch_cents;
			constant.connect(gain);
			mod_env.connect(gain.gain);
			gain.connect(source.detune);
			constant.start();
		}





		let detune_source = context.createConstantSource();
		let detune_cents = (midikey - root_key_semitones) * 100 + sample_header.correction.value;
		detune_source.offset.value = detune_cents;
		detune_source.connect(source.detune);

		if (is.present(mod_lfo_to_pitch_cents)) {
			let constant = context.createConstantSource();
			let gain = context.createGain();
			constant.offset.value = mod_lfo_to_pitch_cents;
			constant.connect(gain);
			mod_lfo_delayed.connect(gain.gain);
			gain.connect(source.detune);
			constant.start();
		}

		sample_gain2.connect(mixer);
		detune_source.start();
		source.start();
		mod_lfo_osc.start();
		function volume(factor: number) {

		}
		function stop() {
			detune_source.stop();
			source.stop();
			mod_lfo_osc.stop();
			sample_gain2.disconnect();
		};
		function release() {
			let t0 = context.currentTime;
			let t1 = t0 + params.env.vol.release_s;
			mod_env.gain.linearRampToValueAtTime(0.0, params.env.mod.release_s);
			vol_env.gain.linearRampToValueAtTime(0.0, t1);
			setTimeout(stop, params.env.vol.release_s * 1000);
		}
		return {
			volume,
			stop,
			release
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
