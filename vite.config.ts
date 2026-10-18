import { defineConfig } from 'vite';
import { api } from './server/api.ts';
export default defineConfig({
 plugins:[{name:'personaverse-local-api',configureServer(server){server.middlewares.use((req,res,next)=>{void api(req,res).then(handled=>{if(!handled)next();}).catch(()=>{res.statusCode=500;res.end('Local API error.');});});}}],
 build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'three',test:/node_modules[\\/]three/},{name:'react',test:/node_modules[\\/](react|react-dom|scheduler)/}]}}}},
});
