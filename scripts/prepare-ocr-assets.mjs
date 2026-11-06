import {copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('public/ocr',{recursive:true});
copyFileSync('node_modules/@techstark/opencv-js/dist/opencv.js','public/ocr/opencv.js');
copyFileSync('node_modules/@techstark/opencv-js/LICENSE','public/ocr/opencv.LICENSE');
