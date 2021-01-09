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
