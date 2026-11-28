import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins:[{
    name:'shared-character-preview',
    configurePreviewServer(server){
      // Production Pages already has these four assets one level above
      // the game. Mirror that read-only path for Vite's isolated dist root.
      server.middlewares.use((req,res,next)=>{
        const found=/^\/assets\/character\/head-([0-3])\.png(?:\?.*)?$/.exec(req.url??'');
        if(!found){next();return;}
        const allowed=resolve(__dirname,'../assets/character/head-'+found[1]+'.png');
        const stream=createReadStream(allowed);
        stream.once('error',()=>{if(!res.headersSent)res.writeHead(404);res.end();});
        stream.once('open',()=>{res.setHeader('Content-Type','image/png');stream.pipe(res);});
      });
    },
  }],
  build: {
    outDir: 'dist',
    modulePreload: { polyfill: false },
    cssCodeSplit: false,
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
      input: {
        main: resolve(__dirname, 'dev.html'),
      },
    },
  },
});
