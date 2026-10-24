import { build } from 'esbuild';
await build({ entryPoints: ['client/firebase-client.js'], bundle: true, format: 'esm', platform: 'browser', target: ['es2022'], outfile: 'public/firebase-client.js', minify: true, legalComments: 'none' });
console.log('Firebase browser bundle built.');
