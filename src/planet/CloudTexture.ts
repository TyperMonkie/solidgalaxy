import { TextureLoader } from 'three';
let texture:ReturnType<TextureLoader['load']>|undefined;
/** Shared original Greenheck cloud sprite; regions reuse the same source asset. */
export function cloudSpriteTexture(){return texture??=new TextureLoader().load('/textures/greenheck-cloud.png');}
