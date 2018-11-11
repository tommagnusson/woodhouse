#!/bin/sh
npm install
/usr/local/lib/node_modules/typescript/bin/tsc --version
/usr/local/lib/node_modules/typescript/bin/tsc --target "es6" --rootDir source/ --outDir distrib/  source/*.ts source/host/*.ts source/os/*.ts
