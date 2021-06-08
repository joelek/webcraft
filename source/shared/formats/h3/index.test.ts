import { Cursor } from "../../binary";
import { NodeFileReader, NodeFileWriter } from "../../binary.node";
import * as h3 from "./";
import { bmp } from "..";

(async () => {
	let reader = new NodeFileReader("./private/CBDRGN.def");
	let sprite = await h3.Sprite.parse(new Cursor(), reader);
	for (let [animationIndex, animation] of sprite.animations.entries()) {
		for (let [frameIndex, frame] of animation.frames.entries()) {
			let writer = new NodeFileWriter("./private/animation[" + animationIndex.toString().padStart(3, "0") + "][" + frameIndex.toString().padStart(3, "0") + "].bmp");
			let bitmap: bmp.Bitmap = {
				w: frame.header.w.value,
				h: frame.header.h.value,
				image: frame.image.buffer,
				palette: sprite.palette.buffer
			};
			await bmp.Bitmap.save(bitmap, new Cursor(), writer);
		}
	}
})();
