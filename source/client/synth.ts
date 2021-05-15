import { is } from "../shared";
import { Buffer, Chunk, Cursor } from "../shared/binary";
import * as soundfont from "../shared/formats/soundfont";

export type MidiChannel = {
	start: () => void;
	stop: () => void;
	release: (midikey: number, velocity: number) => void;
};

export class Program {
	name: string;
	file: soundfont.File;
	igen_indices: Array<number>;
	buffers: Map<number, AudioBuffer>;

	constructor() {
		this.name = "";
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
					let lower = generator.parameters.first.value;
					let upper = generator.parameters.second.value;
					if (i === igen_index) {
						if (key < lower || key > upper) {
							continue outer;
						}
					}
				} else if (type === soundfont.GeneratorType.VEL_RANGE) {
					let lower = generator.parameters.first.value;
					let upper = generator.parameters.second.value;
					if (i === igen_index || i === igen_index + 1) {
						if (velocity < lower || velocity > upper) {
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
				} else if (type === soundfont.GeneratorType.START_ADDRESS_OFFSET) {
					let value = generator.parameters.signed.value;
				} else if (type === soundfont.GeneratorType.PAN) {
					let value = generator.parameters.signed.value;
				} else {
					//console.log(soundfont.GeneratorType[type], generator.parameters.signed.value);
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
			let ab = new ArrayBuffer(sample_count * 2);
			let b = new Buffer(ab);
			await new Chunk(b).load(cursor, reader);
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
		mod_lfo_gained.gain.value = 1 - Math.pow(10, (params.lfo.mod.to_volume_cb)/200); // should not add 1.02 but 0.02
		let source = context.createBufferSource();
		//source.detune.value = -500;
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
				mod_env.offset.setTargetAtTime(1.0, t1, (t2 - t1) * 2/3);
				mod_env.offset.linearRampToValueAtTime(1.0, t3);
				mod_env.offset.linearRampToValueAtTime(params.env.mod.sustain_level, t4);
			}
			{
				let t1 = t0 + 2 ** (params.env.vol.delay_tc / 1200);
				let t2 = t1 + 2 ** (params.env.vol.attack_tc / 1200);
				let t3 = t2 + (2 ** (params.env.vol.hold_tc / 1200) * params.env.vol.hold_time_factor);
				let t4 = t3 + (2 ** (params.env.vol.deacy_tc / 1200) * params.env.vol.decay_time_factor);
				vol_env.offset.cancelScheduledValues(t0);
				vol_env.offset.setTargetAtTime(1.0, t1, (t2 - t1) * 2/3);
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
		function release(midikey: number, velocity: number) {
			let t0 = context.currentTime;
			let tm = 2 ** (params.env.mod.release_tc / 1200);
			let tv = 2 ** (params.env.vol.release_tc / 1200);
			tm *= (1 - velocity/128);
			tv *= (1 - velocity/128);
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
			program.name = preset_header.name.value;
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
