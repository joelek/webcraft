export class Player {

};

export type Sprite = {
	texture: WebGLTexture
};

export type Animation = Array<{

}>;

export type Actions = {
	sprites: {
		icon: Array<Sprite>
	}
	perform: () => void
};

export type Building = {
	x: number
	y: number
	health: number
	player: Player
	sprites: {
		default: Array<Sprite>
	}
	actions: Array<Actions>
};

export type Direction = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type DirectionalSprite = {
	[K in Direction]: Array<Sprite>
};

export type Unit = {
	x: number
	y: number
	health: number
	player: Player
	direction: Direction
	sprites: DirectionalSprite
};

export type Particle = {

};

export type Level = {
	players: Array<Player>

};

/*
trainable units: 7x2=14
	new Sprites(279, "unit_human_footman.sprites"), 0l 400g
	new Sprites(280, "unit_orc_grunt.sprites"),
	new Sprites(281, "unit_human_peasant.sprites"), 0l 400g
	new Sprites(282, "unit_orc_peon.sprites"),
	new Sprites(283, "unit_human_catapult.sprites"), 200l 900g
	new Sprites(284, "unit_orc_catapult.sprites"),
	new Sprites(285, "unit_human_knight.sprites"), 0l 850g
	new Sprites(286, "unit_orc_raider.sprites"),
	new Sprites(287, "unit_human_archer.sprites"), 50l 450g
	new Sprites(288, "unit_orc_spearman.sprites"),
	new Sprites(289, "unit_human_conjurer.sprites"), 0l 900g
	new Sprites(290, "unit_orc_warlock.sprites"),
	new Sprites(291, "unit_human_cleric.sprites"), 0l 700g
	new Sprites(292, "unit_orc_necrolyte.sprites"),

additional units: 7x2=14
	new Sprites(293, "unit_neutral_medivh.sprites"),
	new Sprites(294, "unit_neutral_sir_lothar.sprites"),
	new Sprites(295, "unit_neutral_wounded.sprites"),
	new Sprites(296, "unit_neutral_griselda.sprites"),
	new Sprites(297, "unit_neutral_ogre.sprites"),
	new Sprites(298, "unit_neutral_spider.sprites"),
	new Sprites(299, "unit_neutral_slime.sprites"),
	new Sprites(300, "unit_neutral_fire_elemental.sprites"),
	new Sprites(301, "unit_neutral_scorpion.sprites"),
	new Sprites(302, "unit_neutral_brigand.sprites"),
	new Sprites(303, "unit_neutral_skeleton_human.sprites"),
	new Sprites(304, "unit_neutral_skeleton_orc.sprites"),
	new Sprites(305, "unit_neutral_daemon.sprites"),
	new Sprites(306, "unit_neutral_water_elemental.sprites"),

constructible buildings: 8x2=16
	new Sprites(307, "building_human_farm.sprites"), 300l 500g
	new Sprites(308, "building_orc_farm.sprites"),
	new Sprites(309, "building_human_barracks.sprites"), 500l 600g
	new Sprites(310, "building_orc_barracks.sprites"),
	new Sprites(311, "building_human_church.sprites"), 500l 800g
	new Sprites(312, "building_orc_temple.sprites"),
	new Sprites(313, "building_human_tower.sprites"), 300l 1400g
	new Sprites(314, "building_orc_tower.sprites"),
	new Sprites(315, "building_human_town_hall.sprites"), 400l 400g
	new Sprites(316, "building_orc_town_hall.sprites"),
	new Sprites(317, "building_human_mill.sprites"), 500l 600g
	new Sprites(318, "building_orc_mill.sprites"),
	new Sprites(319, "building_human_stables.sprites"), 400l 1000g
	new Sprites(320, "building_orc_kennel.sprites"),
	new Sprites(321, "building_human_blacksmith.sprites"), 400l 900g
	new Sprites(322, "building_orc_blacksmith.sprites"),

additional buildings: 3x1=3
	new Sprites(323, "building_human_stormwind_keep.sprites"),
	new Sprites(324, "building_orc_black_rock_spire.sprites"),
	new Sprites(325, "building_neutral_gold_mine.sprites"),

particles: 12x1=12
	new Sprites(347, "particle_blob.sprites"),
	new Sprites(348, "particle_fire_ball.sprites"),
	new Sprites(349, "particle_spear.sprites"),
	new Sprites(350, "particle_poison_cloud.sprites"),
	new Sprites(351, "particle_fire_bolt.sprites"),
	new Sprites(352, "particle_burning_small.sprites"),
	new Sprites(353, "particle_burning_medium.sprites"),
	new Sprites(354, "particle_explode.sprites"),
	new Sprites(355, "particle_sparkle.sprites"),
	new Sprites(356, "particle_implode.sprites"),
	new Sprites(357, "particle_water_elemental.sprites"),
	new Sprites(358, "particle_fire_elemental.sprites"),

other:
	@mill upgrade arrow strength: 0l 750g
	@mill upgrade arrow strength: 0l 1500g
	@church research healing: 0l 750g
	@church research far seeing: 0l 1500g
	@church research invisibility: 0l 3000g
	@stables breed faster horses: 0l 750g
	@stables breed faster horses: 0l 1500g
	@blacksmith upgrade sword strength: 0l 750g
	@blacksmith upgrade sword strength: 0l 1500g
	@blacksmith upgrade shield strength: 0l 750g
	@blacksmith upgrade shield strength: 0l 1500g
	@tower research minor summoning: 0l 750g
	@tower research rain of fire: 0l 1500g
	@tower research major summoning: 0l 3000g
	@town hall build road: 0l 50g
	@town hall build wall: 0l 100g
	@peasant repair: Dl Dg
 */
