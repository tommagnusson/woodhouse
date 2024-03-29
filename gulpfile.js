//
// Gulp is a task runner, it helps you automate things.
// In this case, we're going to use it so it can automatically
// update your JavaScript js files when you edit your TypeScript ts files.
// Read more about Gulp at http://gulpjs.com/
//
var gulp = require("gulp");

// This is a Gulp Plugin for TypeScript.
var typescript = require("gulp-tsc");

// This is the task for compiling our TypeScript source files and outputting them.
gulp.task("compile-typescript", function() {
  var typescriptPaths = {
    src: ["source/*.ts", "source/host/*.ts", "source/os/*.ts"],
    dest: "distrib/"
  };

  return gulp
    .src(typescriptPaths.src)
    .pipe(
      typescript({
        emitError: false,
        target: "es6"
      })
    )
    .pipe(gulp.dest(typescriptPaths.dest));
});

// This is the task for copying over our CSS to the dist directory.
// It really doesn't do much, but if we were to use a CSS preprocesser (like LESS/SASS),
// then we would build our LESS/SASS files and copy the resulting CSS to the distrib folder.
// This is just to show some good front-end web development techniques.
gulp.task("copy-css", function() {
  var cssPaths = {
    src: ["source/styles/*.css"],
    dest: "distrib/styles/"
  };

  return gulp.src(cssPaths.src).pipe(gulp.dest(cssPaths.dest));
});

// This is the default task that will run when we run `gulp` at the command line.
gulp.task("default", function() {
  gulp.watch("source/*.ts", ["compile-typescript"]);
  gulp.watch("source/host/*.ts", ["compile-typescript"]);
  gulp.watch("source/os/*.ts", ["compile-typescript"]);
  gulp.watch("source/styles/*.css", ["copy-css"]);
});
