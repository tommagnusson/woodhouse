#!/bin/sh
tsc --version
tsc --target "es6"  --rootDir source/ --outDir distrib/  source/*.ts source/host/*.ts source/os/*.ts
