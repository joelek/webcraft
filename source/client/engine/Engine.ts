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
