import { Buffer, Cursor, Reader } from "../../binary";
import { Integer1, Integer2, PackedInteger2 } from "../../binary/chunks";
import { NodeFileReader, NodeFileWriter } from "../../binary.node";
import * as wc2 from "./";
import { bmp } from "..";

async function decompress(cursor: Cursor, reader: Reader): Promise<Buffer> {
	let archiveRecordHeader = new wc2.ArchiveRecordHeader({ endian: "big" });
	await archiveRecordHeader.load(cursor, reader);
	let decompressed = Buffer.alloc(archiveRecordHeader.uncompressedSize.value);
	if (archiveRecordHeader.isCompressed.value) {
		let shift = 8;
		let bytesWritten = 0;
		let control = new Integer1();
		let byte = new Integer1();
		let history = Buffer.alloc(1 << 12);
		let historyPosition = 0;
		function append(byte: number): void {
			history.set(historyPosition, byte);
			historyPosition += 1;
			historyPosition %= (1 << 12);
			decompressed.set(bytesWritten, byte);
			bytesWritten += 1;
		}
		let data = new Integer2();
		let dataOffset = new PackedInteger2(data, {
			offset: 0,
			length: 12
		});
		let dataLength = new PackedInteger2(data, {
			offset: 12,
			length: 4
		});
		while (bytesWritten < decompressed.size()) {
			if (shift >= 8) {
				control.load(cursor, reader);
				shift = 0;
			}
			let bit = (control.value >> shift) & 0x01;
			shift += 1;
			if (bit) {
				byte.load(cursor, reader);
				append(byte.value);
			} else {
				await data.load(cursor, reader);
				let offset = dataOffset.value;
				let length = dataLength.value + 3;
				for (let i = offset; i < offset + length; i++) {
					append(history.get(i % (1 << 12)));
				}
			}
		}
	} else {
		reader.read(cursor, decompressed);
	}
	return decompressed;
};

const MAINDAT = {
	"DWARVEN_DEMOLITION_SQUAD": 33,
	"GOBLIN_SAPPERS": 34,
	"GRYPHON_RIDER": 35,
	"DRAGON": 36,
	"EYE_OF_KILLROGG": 37,
	"GNOMISH_FLYING_MACHINE": 38,
	"HUMAN_TRANSPORT": 39,
	"ORC_TRANSPORT": 40,
	"HUMAN_BATTLESHIP": 41,
	"OGRE_JUGGERNAUT": 42,
	"GNOMISH_SUBMARINE": 43,
	"GIANT_TURTLE": 44,
	"FOOTMAN": 45,
	"GRUNT": 46,
	"PEASANT": 47,
	"PEON": 48,
	"BALLISTA": 49,
	"CATAPULT": 50,
	"KNIGHT": 51,
	"OGRE": 52,
	"ELVEN_ARCHER": 53,
	"ORC_AXETHROWER": 54,
	"MAGE": 55,
	"WC1_NECROLYTE": 56,
	"WC1_CLERIC": 57,
	"DEATH_KNIGHT": 58,
	"OIL_TANKER_A": 59,
	"OIL_TANKER_H": 60,
	"ELVEN_DESTROYER": 61,
	"TROLL_DESTROYER": 62,
	"GOBLIN_ZEPPELIN": 63,
	"SHEEP": 64,
	"BOAR": 65,
	"SEAL": 66,
	"SKELETON": 69,
	"DAEMON": 70,
	"GUARD_TOWER_ALLIANCE_GRASS": 80,
	"GUARD_TOWER_HORDE_GRASS": 81,
	"CANNON_TOWER_ALLIANCE_GRASS": 82,
	"CANNON_TOWER_HORDE_GRASS": 83,
	"MAGE_TOWER_ALLIANCE_GRASS": 84,
	"TEMPLE_OF_THE_DAMNED_HORDE_GRASS": 85,
	"KEEP_ALLIANCE_GRASS": 86,
	"STRONGHOLD_HORDE_GRASS": 87,
	"GRYPHON_AVIARY_ALLIANCE_GRASS": 88,
	"DRAGON_ROOST_HORDE_GRASS": 89,
	"GNOMISH_INVENTOR_ALLIANCE_GRASS": 90,
	"GOBLIN_ALCHEMIST_HORDE_GRASS": 91,
	"FARM_ALLIANCE_GRASS": 92,
	"PIG_FARM_HORDE_GRASS": 93,
	"BARRACKS_ALLIANCE_GRASS": 94,
	"BARRACKS_HORDE_GRASS": 95,
	"CHURCH_ALLIANCE_GRASS": 96,
	"ALTAR_OF_STORMS_HORDE_GRASS": 97,
	"SCOUT_TOWER_ALLIANCE_GRASS": 98,
	"WATCH_TOWER_HORDE_GRASS": 99,
	"TOWN_HALL_ALLIANCE_GRASS": 100,
	"GREAT_HALL_HORDE_GRASS": 101,
	"ELVEN_LUMBER_MILL_ALLIANCE_GRAS": 102,
	"TROLL_LUMBER_MILL_HORDE_GRASS": 103,
	"STABLES_ALLIANCE_GRASS": 104,
	"OGRE_MOUND_HORDE_GRASS": 105,
	"BLACKSMITH_ALLIANCE_GRASS": 106,
	"BLACKSMITH_HORDE_GRASS": 107,
	"SHIPYARD_ALLIANCE_GRASS": 108,
	"SHIPYARD_HORDE_GRASS": 109,
	"FOUNDRY_ALLIANCE_GRASS": 110,
	"FOUNDRY_HORDE_GRASS": 111,
	"OIL_REFINERY_ALLIANCE_GRASS": 112,
	"OIL_REFINERY_HORDE_GRASS": 113,



	"LUMBER_MILL_A_SNOW": 144,
	"LUMBER_MILL_H_SNOW": 145,
	"STABLES_A_SNOW": 146,
	"OGRE_MOUND_H_SNOW": 147,
	"BLACKSMITH_A_SNOW": 148,
	"BLACKSMITH_H_SNOW": 149,
	"SHIPYARD_A_SNOW": 150,
	"SHIPYARD_H_SNOW": 151,
	"FOUNDRY_A_SNOW": 152,
	"FOUNDRY_H_SNOW": 153,
	"OIL_REFINERY_A_SNOW": 154,
	"OIL_REFINERY_H_SNOW": 155,
	"OIL_PLATFORM_A_ALT": 156,
	"OIL_PLATFORM_H_ALT": 157,
	"CASTLE_A": 158,
	"FORTRESS_H": 159,
	"TEMPLE_A": 160,
	"TEMPLE_H": 161,
	"GOLD_MINE_ALT": 162,
	"DEMOLISHED_STRUCTURE": 163,
	"CROSS": 164,
	"RING": 165,
	"CIRCLE_OF_POWER": 166,
	"DARK_PORTAL": 167,
	"WALL": 168,
	"GUARD_TOWER_A": 169,
	"GUARD_TOWER_H": 170,
	"CANNON_TOWER_A": 171,
	"CANNON_TOWER_H": 172,
	"FARM_A": 173,
	"FARM_H": 174,
	"LUMBER_MILL_A": 175,
	"LUMBER_MILL_H": 176,
	"OIL_PLATFORM_A": 177,
	"OIL_PLATFORM_H": 178,
	"GOLD_MINE": 179,
	"OIL_PATCH": 180,
	"RUNE_STONE": 181
};

async function loadPalette(string: string): Promise<wc2.Palette> {
	let reader = new NodeFileReader(string);
	return wc2.Palette.load(reader, new Cursor());
};

(async () => {
	let palette = await loadPalette("./private/records2/018.pal");
	let reader = new NodeFileReader("./private/records2/113");
	let sprite = await wc2.Sprite.load(reader, new Cursor());
	for (let [index, frame] of sprite.frames.entries()) {
		let writer = new NodeFileWriter("./private/frame[" + index.toString().padStart(3, "0") + "].bmp");
		let bitmap: bmp.Bitmap = {
			w: frame.header.w.value,
			h: frame.header.h.value,
			image: frame.image,
			palette: palette
		};
		await bmp.Bitmap.save(bitmap, new Cursor(), writer);
	}
})();
