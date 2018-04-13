'use strict'

/**
 * Dependencies
 */

const $ = require('gulp-load-plugins')()
const bs = require('browser-sync').create()
const cp = require('child_process')
const del = require('del')
const gulp = require('gulp')
const log = require('fancy-log')
const {Transform} = require('stream')
const statilConfig = require('./statil')

/**
 * Globals
 */

const srcScriptFiles = 'src/**/*.js'
const srcDocHtmlFiles = ['docs/html/**/*', 'readme.md']
const srcDocStyleFiles = 'docs/styles/**/*.scss'
const srcDocStyleMain = 'docs/styles/docs.scss'
const srcDocScriptMain = 'docs/scripts/docs.js'

const esDir = 'es'

const outDocDir = 'gh-pages'
const outDocStyleDir = 'gh-pages/styles'
const outDocScriptDir = 'gh-pages/scripts'
const outRootDir = 'dist'
const outEsFiles = 'es/**/*.js'
const outDistScriptFiles = 'dist/**/*.js'
const outMainScriptFile = require('./package').main

/**
 * Tasks
 */

/* --------------------------------- Clear ---------------------------------- */

gulp.task('clear', () => (
  del([
    outDistScriptFiles,
    outEsFiles,
    // Skips dotfiles like `.git` and `.gitignore`
    `${outDocDir}/*`,
  ]).catch(console.error.bind(console))
))

/* ---------------------------------- Lib -----------------------------------*/

gulp.task('lib:build', () => (
  gulp.src(srcScriptFiles)
    .pipe($.babel())
    .pipe(gulp.dest(esDir))
    .pipe($.babel({
      plugins: [
        'transform-es2015-modules-commonjs',
      ],
    }))
    .pipe(gulp.dest(outRootDir))
    // Ensures ES5 compliance and lets us measure minified size
    .pipe($.uglify({
      mangle: {toplevel: true},
      compress: {warnings: false},
    }))
    .pipe(new Transform({
      objectMode: true,
      transform(file, __, done) {
        log(`Minified size: ${file._contents.length} bytes`)
        done()
      },
    }))
))

gulp.task('lib:watch', () => {
  $.watch(srcScriptFiles, gulp.series('lib:build'))
})

/* --------------------------------- HTML -----------------------------------*/

gulp.task('docs:html:build', () => (
  gulp.src(srcDocHtmlFiles)
    .pipe($.statil(statilConfig))
    .pipe(gulp.dest(outDocDir))
))

gulp.task('docs:html:watch', () => {
  $.watch(srcDocHtmlFiles, gulp.series('docs:html:build'))
})

/* -------------------------------- Styles ----------------------------------*/

gulp.task('docs:styles:build', () => (
  gulp.src(srcDocStyleMain)
    .pipe($.sass())
    .pipe($.autoprefixer())
    .pipe($.cleanCss({
      keepSpecialComments: 0,
      aggressiveMerging: false,
      advanced: false,
      compatibility: {properties: {colors: false}},
    }))
    .pipe(gulp.dest(outDocStyleDir))
))

gulp.task('docs:styles:watch', () => {
  $.watch(srcDocStyleFiles, gulp.series('docs:styles:build'))
})

/* ------------------------------- Scripts ----------------------------------*/

gulp.task('docs:scripts:copy', () => (
  gulp.src(outMainScriptFile)
    .pipe($.wrap(
`// Built version. See src/webbs.js.
void function(exports) {
<%= contents %>
}(window.webbs = {});`))
    .pipe(gulp.dest(outDocScriptDir))
))

gulp.task('docs:scripts:compile', () => (
  gulp.src(srcDocScriptMain)
    .pipe($.babel())
    .pipe($.wrap(
`void function() {
'use strict';

<%= contents %>
}();`))
    .pipe(gulp.dest(outDocScriptDir))
))

gulp.task('docs:scripts:build', gulp.parallel('docs:scripts:copy', 'docs:scripts:compile'))

gulp.task('docs:scripts:watch', () => {
  $.watch(outMainScriptFile, gulp.series('docs:scripts:copy'))
  $.watch(srcDocScriptMain, gulp.series('docs:scripts:compile'))
})

/* -------------------------------- Server ----------------------------------*/

gulp.task('docs:server', () => (
  bs.init({
    startPath: '/webbs/',
    server: {
      baseDir: 'gh-pages',
      middleware: [
        (req, res, next) => {
          req.url = req.url.replace(/^\/webbs\//, '').replace(/^[/]*/, '/')
          next()
        },
      ],
    },
    port: 3474,
    files: 'gh-pages',
    open: false,
    online: false,
    ui: false,
    ghostMode: false,
    notify: false,
  })
))

/* ------------------------------ Mock Server ------------------------------ */

let serverProc = null

function restartMockServer() {
  if (serverProc) serverProc.kill()
  serverProc = cp.fork('./mock-ws-server')
}

gulp.task('docs:mock-server', () => {
  restartMockServer()
  $.watch(['./mock-ws-server.js'], restartMockServer)
})

/* -------------------------------- Default ---------------------------------*/

gulp.task('buildup', gulp.parallel(
  gulp.series('lib:build', 'docs:scripts:build'),
  'docs:html:build',
  'docs:styles:build'
))

gulp.task('watch', gulp.parallel(
  'lib:watch',
  'docs:html:watch',
  'docs:styles:watch',
  'docs:scripts:watch',
  'docs:server',
  'docs:mock-server'
))

gulp.task('build', gulp.series('clear', 'buildup'))

gulp.task('default', gulp.series('clear', 'buildup', 'watch'))
