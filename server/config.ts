import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse } from '@iarna/toml';
/** Server only. Never import into client bundles, copy credentials or log the config. */
export async function loadProviderConfig(){
 if(process.env.PERSONAVERSE_API_KEY)return {apiKey:process.env.PERSONAVERSE_API_KEY,baseUrl:process.env.PERSONAVERSE_BASE_URL||'https://api.openai.com/v1',model:process.env.PERSONAVERSE_MODEL||'gpt-6-sol'};
 const path=process.env.PERSONAVERSE_CODEX_CONFIG||join(homedir(),'.codex','config.toml');
 const parsed=parse(await readFile(path,'utf8')) as any;
 const provider=parsed.model_providers?.[parsed.model_provider];
 if(!provider?.base_url||!provider?.experimental_bearer_token)throw new Error('Configure PERSONAVERSE_API_KEY or a provider with base_url and experimental_bearer_token in the local Codex config.');
 return {apiKey:String(provider.experimental_bearer_token),baseUrl:String(provider.base_url).replace(/\/$/,''),model:process.env.PERSONAVERSE_MODEL||'gpt-6-sol'};
}
