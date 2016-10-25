'use strict'

const bs = require('browser-sync').create()
const config = require('./webpack.config')
const prod = process.env.NODE_ENV === 'production'

bs.init({
  startPath: '/webbs/',
  server: {
    baseDir: 'gh-pages',
    middleware: [
      ...(!prod ? hmr() : []),
      (req, res, next) => {
        req.url = req.url.replace(/^\/webbs\//, '').replace(/^[/]*/, '/')
        next()
      }
    ]
  },
  port: 48432,
  files: 'gh-pages',
  open: false,
  online: false,
  ui: false,
  ghostMode: false,
  notify: false
})

function hmr () {
  const compiler = require('webpack')(extend(config, {
    entry: ['webpack-hot-middleware/client', config.entry]
  }))

  return [
    require('webpack-dev-middleware')(compiler, {
      publicPath: '/webbs',
      noInfo: true
    }),
    require('webpack-hot-middleware')(compiler)
  ]
}

function extend (...args) {
  return args.reduce(Object.assign, {})
}
