'use strict'

/* ***************************** Dependencies ********************************/

const $ = require('gulp-load-plugins')()
const del = require('del')
const {fork} = require('child_process')
const gulp = require('gulp')
const statilConfig = require('./statil-config')
const webpack = require('webpack')
const webpackConfig = require('./webpack.config')

/* ******************************** Globals **********************************/

const src = {
  lib: 'src/**/*.js',
  dist: 'dist/**/*.js',
  docs: {
    html: [
      'docs/html/**/*',
      'readme.md',
    ],
    styles: 'docs/styles/**/*.scss',
    stylesMain: 'docs/styles/docs.scss',
    staticFonts: 'node_modules/font-awesome/fonts/**/*',
    staticFontsBase: 'node_modules/font-awesome',
  },
}

const out = {
  lib: 'dist',
  docs: {
    root: 'gh-pages',
    styles: 'gh-pages/styles',
  },
}

function noop () {}

/* ********************************* Tasks ***********************************/

/**
 * Clear
 */

gulp.task('clear', () => (
  del([out.lib, out.docs.root + '/**/*'], {read: false, ignore: '.git'}).catch(noop)
))

/**
 * Lib
 */

gulp.task('lib:compile', () => (
  gulp.src(src.lib)
    .pipe($.babel())
    .pipe(gulp.dest(out.lib))
))

gulp.task('lib:minify', () => (
  gulp.src(src.dist, {ignore: '**/*.min.js'})
    .pipe($.uglify({
      mangle: true,
      compress: {screw_ie8: true}
    }))
    .pipe($.rename(path => {
      path.extname = '.min.js'
    }))
    .pipe(gulp.dest(out.lib))
))

gulp.task('lib:build', gulp.series('lib:compile', 'lib:minify'))

gulp.task('lib:watch', () => {
  $.watch(src.lib, gulp.series('lib:build'))
})

/**
 * Static
 */

gulp.task('docs:static:copy', () => (
  gulp.src(src.docs.staticFonts, {base: src.docs.staticFontsBase})
    .pipe(gulp.dest(out.docs.root))
))

gulp.task('docs:static:watch', () => {
  $.watch(src.docs.staticFonts, gulp.series('docs:static:copy'))
})

/**
 * HTML
 */

gulp.task('docs:html:compile', () => (
  gulp.src(src.docs.html)
    .pipe($.statil(statilConfig))
    .pipe(gulp.dest(out.docs.root))
))

gulp.task('docs:html:build', gulp.series('docs:html:compile'))

gulp.task('docs:html:watch', () => {
  $.watch(src.docs.html, gulp.series('docs:html:compile'))
})

/**
 * Styles
 */

gulp.task('docs:styles:compile', () => (
  gulp.src(src.docs.stylesMain)
    .pipe($.sass())
    .pipe($.autoprefixer())
    .pipe($.cleanCss({
      keepSpecialComments: 0,
      aggressiveMerging: false,
      advanced: false,
      compatibility: {properties: {colors: false}}
    }))
    .pipe(gulp.dest(out.docs.styles))
))

gulp.task('docs:styles:build', gulp.series('docs:styles:compile'))

gulp.task('docs:styles:watch', () => {
  $.watch(src.docs.styles, gulp.series('docs:styles:build'))
})

/**
 * Scripts
 */

gulp.task('docs:scripts:build', done => {
  webpack(webpackConfig, (err, stats) => {
    if (err) {
      throw new $.util.PluginError('webpack', err, {showProperties: false})
    }
    $.util.log('[webpack]', stats.toString(webpackConfig.stats))
    if (stats.hasErrors()) {
      throw new $.util.PluginError('webpack', 'plugin error', {showProperties: false})
    }
    done()
  })
})

/**
 * Devserver + Scripts
 */

gulp.task('docs:server', () => {
  let buildServerProc
  let wsServerProc

  process.on('exit', () => {
    if (buildServerProc) buildServerProc.kill()
    if (wsServerProc) wsServerProc.kill()
  })

  function restartBuildServer () {
    if (buildServerProc) buildServerProc.kill()
    buildServerProc = fork('./devserver')
  }

  function restartWsServer () {
    if (wsServerProc) wsServerProc.kill()
    wsServerProc = fork('./mock-ws-server')
  }

  restartBuildServer()
  $.watch(['./webpack.config.js', './devserver.js'], restartBuildServer)

  restartWsServer()
  $.watch(['./mock-ws-server.js'], restartWsServer)
})

/**
 * Aggregate
 */

gulp.task('buildup', gulp.parallel(
  'lib:build',
  'docs:static:copy',
  'docs:html:build',
  'docs:styles:build'
))

gulp.task('watch', gulp.parallel(
  'lib:watch', 'docs:html:watch', 'docs:styles:watch', 'docs:server'
))

gulp.task('default', gulp.series('clear', 'buildup', 'watch'))

gulp.task('build', gulp.series('clear', 'buildup', 'docs:scripts:build'))
