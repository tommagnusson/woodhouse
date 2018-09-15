# Woodhouse: The most subservient operating system

This is the Operating Systems class initial project.
See http://www.labouseur.com/courses/os/ for details.

## Grading

1. Clone the `iprojectN` branch where `N` is the project number
1. Run `gulp`
1. Open `index.html` in Chrome

## Setup TypeScript

1. Install the [npm](https://www.npmjs.org/) package manager if you don't already have it.
1. Run `npm install -g typescript` to get the TypeScript Compiler. (You may need to do this as root.)

## Setup Other Dependencies

1. Run `npm install` to install

## Setup Jest

**No tests because triple slash imports don't run on Node**

Jest is a Javascript testing framework for unit tests. To run the tests:

1. Run `npm run test`

## Setup Gulp

Gulp automates the compilation process from Typescript to Javascript.
It also automatically compiles on file saves.

1. `npm install gulp` to get the Gulp Task Runner.
1. `npm install gulp-tsc` to get the Gulp TypeScript plugin.
1. `gulp` to watch files for changes.
