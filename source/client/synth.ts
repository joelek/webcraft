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




drums are put in bank 128 at these instruments.
last phdr

226: {name: "Standard    ", preset: 0, bank: 128, pbag_index: 226, library: 0, …}
227: {name: "Room        ", preset: 8, bank: 128, pbag_index: 227, library: 0, …}
228: {name: "Power       ", preset: 16, bank: 128, pbag_index: 228, library: 0, …}
229: {name: "Electronic  ", preset: 24, bank: 128, pbag_index: 229, library: 0, …}
230: {name: "TR-808      ", preset: 25, bank: 128, pbag_index: 230, library: 0, …}
231: {name: "Jazz        ", preset: 32, bank: 128, pbag_index: 231, library: 0, …}
232: {name: "Brush       ", preset: 40, bank: 128, pbag_index: 232, library: 0, …}
233: {name: "Orchestra   ", preset: 48, bank: 128, pbag_index: 233, library: 0, …}
234: {name: "SFX         ", preset: 56, bank: 128, pbag_index: 234, library: 0, …}
235: {name: "EOP", preset: 255, bank: 255, pbag_index: 235, library: 0, …}


last inst:
226: {name: "Standard    ", ibag_index: 1189}
227: {name: "Room        ", ibag_index: 1250}
228: {name: "Power       ", ibag_index: 1311}
229: {name: "Electronic  ", ibag_index: 1372}
230: {name: "TR-808      ", ibag_index: 1433}
231: {name: "Jazz        ", ibag_index: 1494}
232: {name: "Brush       ", ibag_index: 1555}
233: {name: "Orchestra   ", ibag_index: 1616}
234: {name: "SFX         ", ibag_index: 1678}
235: {name: "EOI", ibag_index: 1724}

ibag 1189, 1250: (standard + 1)
0: {igen_index: 7170, imod_index: 0} -> starts with key 27, ends with sample 196 (HI_Q_60, matches gs key 27)
1: {igen_index: 7180, imod_index: 0} -> starts with key 28, ends with sample 371 (SLAP_60 matches gs key 28)
2: {igen_index: 7190, imod_index: 0}
3: {igen_index: 7202, imod_index: 0}
4: {igen_index: 7215, imod_index: 0}
5: {igen_index: 7222, imod_index: 0}
6: {igen_index: 7230, imod_index: 0}
7: {igen_index: 7239, imod_index: 0}
8: {igen_index: 7249, imod_index: 0}
9: {igen_index: 7256, imod_index: 0}
10: {igen_index: 7265, imod_index: 0}
11: {igen_index: 7275, imod_index: 0}
12: {igen_index: 7284, imod_index: 0}
13: {igen_index: 7294, imod_index: 0}
14: {igen_index: 7303, imod_index: 0}
15: {igen_index: 7314, imod_index: 0}
16: {igen_index: 7325, imod_index: 0}
17: {igen_index: 7336, imod_index: 0}
18: {igen_index: 7349, imod_index: 0}
19: {igen_index: 7360, imod_index: 0}
20: {igen_index: 7369, imod_index: 0}
21: {igen_index: 7380, imod_index: 0}
22: {igen_index: 7391, imod_index: 0}
23: {igen_index: 7401, imod_index: 0}
24: {igen_index: 7412, imod_index: 0}
25: {igen_index: 7423, imod_index: 0}
26: {igen_index: 7434, imod_index: 0}
27: {igen_index: 7445, imod_index: 0}
28: {igen_index: 7456, imod_index: 0}
29: {igen_index: 7469, imod_index: 0}
30: {igen_index: 7479, imod_index: 0}
31: {igen_index: 7490, imod_index: 0}
32: {igen_index: 7503, imod_index: 0}
33: {igen_index: 7515, imod_index: 0}
34: {igen_index: 7525, imod_index: 0}
35: {igen_index: 7535, imod_index: 0}
36: {igen_index: 7546, imod_index: 0}
37: {igen_index: 7556, imod_index: 0}
38: {igen_index: 7567, imod_index: 0}
39: {igen_index: 7577, imod_index: 0}
40: {igen_index: 7588, imod_index: 0}
41: {igen_index: 7598, imod_index: 0}
42: {igen_index: 7609, imod_index: 0}
43: {igen_index: 7619, imod_index: 0}
44: {igen_index: 7629, imod_index: 0}
45: {igen_index: 7639, imod_index: 0}
46: {igen_index: 7649, imod_index: 0}
47: {igen_index: 7659, imod_index: 0}
48: {igen_index: 7667, imod_index: 0}
49: {igen_index: 7677, imod_index: 0}
50: {igen_index: 7688, imod_index: 0}
51: {igen_index: 7699, imod_index: 0}
52: {igen_index: 7709, imod_index: 0}
53: {igen_index: 7719, imod_index: 0}
54: {igen_index: 7730, imod_index: 0}
55: {igen_index: 7742, imod_index: 0}
56: {igen_index: 7752, imod_index: 0}
57: {igen_index: 7762, imod_index: 0}
58: {igen_index: 7771, imod_index: 0}
59: {igen_index: 7779, imod_index: 0}
60: {igen_index: 7790, imod_index: 0} -> starts with key 87, ends with sample 409 (SURDO60 matches gs key 87)
61: {igen_index: 7800, imod_index: 0} (extra)
*/

import { is } from "../shared";
import { BufferReader, Cursor, Reader } from "../shared/binary";
import { Integer2 } from "../shared/binary/chunks";
import * as soundfont from "../shared/formats/soundfont";

export type MidiChannel = {
	start: () => void;
	stop: () => void;
	release: (midikey: number, velocity: number) => void;
};

export class Program {
	file: soundfont.File;
	igen_indices: Array<number>;
	buffers: Map<number, AudioBuffer>;

	constructor() {
		this.file = new soundfont.File();
		this.igen_indices = new Array<number>();
		this.buffers = new Map<number, AudioBuffer>();
	}

	private getParms(key: number, velocity: number) {
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
					root_key_override: undefined as number | undefined
				}
			};
			inner: for (let i = igen_index; i < this.file.igen.length; i++) {
				//console.log(soundfont.GeneratorType[type], generator.parameters.signed.value);
				let generator = this.file.igen[i];
				if (is.absent(generator)) {
					throw ``;
				}
				let type = generator.generator.type.value;
				if (false) {
				} else if (type === soundfont.GeneratorType.INITIAL_FILTER_FC) {
					params.filter.cutoff_c = generator.parameters.signed.value;
				} else if (type === soundfont.GeneratorType.INITIAL_FILTER_Q) {
					params.filter.q_cb = generator.parameters.signed.value;
				} else if (type === soundfont.GeneratorType.INITIAL_ATTENUATION) {
					params.sample.attenuation_cb = generator.parameters.signed.value;
				} else if (type === soundfont.GeneratorType.MOD_ENV_TO_PITCH) {
					params.env.mod.to_pitch_c = generator.parameters.signed.value;
				} else if (type === soundfont.GeneratorType.VOL_ENV_KEY_TO_HOLD) {
					let value = Math.max(-1200, Math.min(generator.parameters.signed.value, 1200));
					params.env.vol.hold_time_factor = 2 ** (value / 100 * (60 - key) / 12);
				} else if (type === soundfont.GeneratorType.VOL_ENV_KEY_TO_DECAY) {
					let value = Math.max(-1200, Math.min(generator.parameters.signed.value, 1200));
					params.env.vol.decay_time_factor = 2 ** (value / 100 * (60 - key) / 12);
				} else if (type === soundfont.GeneratorType.VOL_ENV_DELAY) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
					params.env.vol.delay_tc = value;
				} else if (type === soundfont.GeneratorType.VOL_ENV_ATTACK) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
					params.env.vol.attack_tc = value;
				} else if (type === soundfont.GeneratorType.VOL_ENV_HOLD) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
					params.env.vol.hold_tc = value;
				} else if (type === soundfont.GeneratorType.VOL_ENV_DECAY) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
					params.env.vol.deacy_tc = value;
				} else if (type === soundfont.GeneratorType.VOL_ENV_SUSTAIN) {
					let value_cb = Math.max(0, Math.min(generator.parameters.signed.value, 1440));
					params.env.vol.sustain_level = Math.pow(10, -value_cb/200);
				} else if (type === soundfont.GeneratorType.VOL_ENV_RELEASE) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
					params.env.vol.release_tc = value;
				} else if (type === soundfont.GeneratorType.MOD_ENV_KEY_TO_HOLD) {
					let value = Math.max(-1200, Math.min(generator.parameters.signed.value, 1200));
					params.env.mod.hold_time_factor = 2 ** (value / 100 * (60 - key) / 12);
				} else if (type === soundfont.GeneratorType.MOD_ENV_KEY_TO_DECAY) {
					let value = Math.max(-1200, Math.min(generator.parameters.signed.value, 1200));
					params.env.mod.decay_time_factor = 2 ** (value / 100 * (60 - key) / 12);
				} else if (type === soundfont.GeneratorType.MOD_ENV_DELAY) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
					params.env.mod.delay_tc = value;
				} else if (type === soundfont.GeneratorType.MOD_ENV_ATTACK) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
					params.env.mod.attack_tc = value;
				} else if (type === soundfont.GeneratorType.MOD_ENV_HOLD) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
					params.env.mod.hold_tc = value;
				} else if (type === soundfont.GeneratorType.MOD_ENV_DECAY) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
					params.env.mod.deacy_tc = value;
				} else if (type === soundfont.GeneratorType.MOD_ENV_SUSTAIN) {
					let value_pm = Math.max(0, Math.min(generator.parameters.signed.value, 1000));
					params.env.mod.sustain_level = 1.0 - value_pm / 1000;
				} else if (type === soundfont.GeneratorType.MOD_ENV_RELEASE) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 8000));
					params.env.mod.release_tc = value;
				} else if (type === soundfont.GeneratorType.KEY_RANGE) {
					let key_range_low = generator.parameters.first.value;
					let key_range_high = generator.parameters.second.value;
					if (i === igen_index) {
						if (key < key_range_low || key > key_range_high) {
							continue outer;
						}
					}
				} else if (type === soundfont.GeneratorType.MOD_LFO_DELAY) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 5000));
					params.lfo.mod.delay_tc = value;
				} else if (type === soundfont.GeneratorType.MOD_LFO_FREQ) {
					let value = generator.parameters.signed.value;
					params.lfo.mod.freq_hz = 8.176 * 2 ** (value / 1200);
				} else if (type === soundfont.GeneratorType.MOD_LFO_TO_PITCH) {
					let value = Math.max(-12000, Math.min(generator.parameters.signed.value, 12000));
					params.lfo.mod.to_pitch_c = value;
				} else if (type === soundfont.GeneratorType.MOD_LFO_TO_VOLUME) {
					let value = generator.parameters.signed.value;
					params.lfo.mod.to_volume_cb = value;
				} else if (type === soundfont.GeneratorType.SAMPLE_ID) {
					params.sample.index = generator.parameters.signed.value;
					return params;
				} else if (type === soundfont.GeneratorType.SAMPLE_MODES) {
					// TODO: Support loop during key depression (mode 3).
					let value = generator.parameters.signed.value;
					if (value >= 0 && value <= 3) {
						params.sample.loop = value === 1;
					}
				} else if (type === soundfont.GeneratorType.OVERRIDING_ROOT_KEY) {
					let value = generator.parameters.signed.value;
					if (value >= 0 && value <= 127) {
						params.sample.root_key_override = value;
					}
				}
			}
		}
		throw ``;
	}

	async makeChannel(context: AudioContext, midikey: number, velocity: number, mixer: GainNode, channel: number): Promise<MidiChannel> {
		let params = this.getParms(midikey, velocity);
		let sample_header = this.file.shdr[params.sample.index];
		let buffer = this.buffers.get(params.sample.index);
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
			this.buffers.set(params.sample.index, buffer);
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
		mod_lfo_gained.gain.value = Math.pow(10, (params.lfo.mod.to_volume_cb)/200);
		let source = context.createBufferSource();
		source.buffer = buffer;
		source.loopStart = (sample_header.loop_start.value - sample_header.start.value) / sample_header.sample_rate.value;
		source.loopEnd = (sample_header.loop_end.value - sample_header.start.value) / sample_header.sample_rate.value;
		source.loop = params.sample.loop;

		let initial_attenuation = context.createGain();
		source.connect(initial_attenuation);
		// OKish
		initial_attenuation.gain.value = Math.pow(10, -(params.sample.attenuation_cb + 960*(1-velocity/128)*(1-velocity/128))/200);

		let lowpass_filter = context.createBiquadFilter();
		initial_attenuation.connect(lowpass_filter);
		lowpass_filter.type = "lowpass";
		// OK
		let initial_filter_cutoff_hz = 8.176 * 2 ** ((params.filter.cutoff_c - 2400*(1-velocity/128))/1200);
		lowpass_filter.frequency.value = initial_filter_cutoff_hz;
		lowpass_filter.Q.value = params.filter.q_cb / 10;



		let amplifier = context.createGain();
		lowpass_filter.connect(amplifier);
		if (params.lfo.mod.to_volume_cb > 0) {
			mod_lfo_gained.connect(amplifier.gain);
		}


		let vol_env = context.createConstantSource();
		vol_env.offset.value = 0;
		vol_env.connect(amplifier.gain);



		let mod_env = context.createConstantSource();
		mod_env.offset.value = 0;
		{
			let constant = context.createConstantSource();
			let gain = context.createGain();
			constant.offset.value = params.env.mod.to_pitch_c;
			constant.connect(gain);
			mod_env.connect(gain.gain);
			gain.connect(source.detune);
			constant.start();
		}





		let detune_source = context.createConstantSource();
		//midikey = channel === 9 ? root_key_semitones : midikey
		let detune_cents = (midikey - root_key_semitones) * 100 + sample_header.correction.value;

		detune_source.offset.value = detune_cents;
		detune_source.connect(source.detune);
		detune_source.start();

		let constant = context.createConstantSource();
		let gain = context.createGain();
		constant.offset.value = params.lfo.mod.to_pitch_c;
		constant.connect(gain);
		mod_lfo_delayed.connect(gain.gain);
		gain.connect(source.detune);
		constant.start();

		function start() {
			let t0 = context.currentTime;
			{
				let t1 = t0 + 2 ** (params.env.mod.delay_tc / 1200);
				let t2 = t1 + 2 ** (params.env.mod.attack_tc / 1200);
				let t3 = t2 + (2 ** (params.env.mod.hold_tc / 1200) * params.env.mod.hold_time_factor);
				let t4 = t3 + (2 ** (params.env.mod.deacy_tc / 1200) * params.env.mod.decay_time_factor);
				mod_env.offset.setValueAtTime(0.0, t1);
				mod_env.offset.exponentialRampToValueAtTime(1.0, t2);
				mod_env.offset.setValueAtTime(1.0, t3);
				mod_env.offset.linearRampToValueAtTime(params.env.mod.sustain_level, t4);
			}
			{
				let t1 = t0 + 2 ** (params.env.vol.delay_tc / 1200);
				let t2 = t1 + 2 ** (params.env.vol.attack_tc / 1200);
				let t3 = t2 + (2 ** (params.env.vol.hold_tc / 1200) * params.env.vol.hold_time_factor);
				let t4 = t3 + (2 ** (params.env.vol.deacy_tc / 1200) * params.env.vol.decay_time_factor);
				vol_env.offset.setValueAtTime(0.0, t1);
				vol_env.offset.exponentialRampToValueAtTime(1.0, t2);
				vol_env.offset.setValueAtTime(1.0, t3);
				vol_env.offset.linearRampToValueAtTime(params.env.vol.sustain_level, t4);
			}
			amplifier.connect(mixer);
			source.start();
			mod_lfo_osc.start();
			vol_env.start();
			mod_env.start();
		}
		function stop() {
			amplifier.disconnect();
			source.stop();
			mod_lfo_osc.stop();
			mod_env.stop();
			vol_env.stop();
		};
		function release(midikey: number, velocity: number) {
			let t0 = context.currentTime;
			let tm = 2 ** (params.env.mod.release_tc / 1200);
			let tv = 2 ** (params.env.vol.release_tc / 1200);
			tm *= (1 - velocity/128);
			tv *= (1 - velocity/128);
			mod_env.offset.linearRampToValueAtTime(0.0, t0 + tm);
			vol_env.offset.linearRampToValueAtTime(0.0, t0 + tv);
			setTimeout(stop, tv * 1000);
		}
		return {
			start,
			stop,
			release
		};
	}
};

export class Bank {
	programs: Array<Program | undefined>;

	constructor() {
		this.programs = new Array<Program>();
	}
};

export class WavetableSynth {
	banks: Array<Bank>;

	constructor() {
		this.banks = new Array<Bank>();
		for (let i = 0; i < 255; i++) {
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
			let next_instrument = file.inst[preset_generator.parameters.signed.value + 1];
			if (is.absent(next_instrument)) {
				continue;
			}
			program = new Program();
			program.file = file;
			for (let i = instrument.ibag_index.value; i < next_instrument.ibag_index.value; i++) {
				let instrument_bag = file.ibag[i];
				if (is.absent(instrument_bag)) {
					continue;
				}
				program.igen_indices.push(instrument_bag.igen_index.value);
			}
			bank.programs[preset_header.preset.value] = program;
		}
		return synth;
	}
};
