/* eslint-disable no-unused-vars */
/* global require exports*/
const Gulp = require("gulp");
const zip = require("gulp-zip");

function createRelease(cb) {
	return Gulp.src([
		"module.json",
		"subgrids.js"
	], { base: "." })
		.pipe(zip("subgrids.zip"))
		.pipe(Gulp.dest("./"));
}

exports.zip = createRelease;
exports.default = createRelease;