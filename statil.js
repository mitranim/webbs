'use strict'

const hljs = require('highlight.js')
const marked = require('marked')
const pt = require('path')
const PROD = process.env.NODE_ENV === 'production'

marked.setOptions({
  gfm: true,
  highlight: (code, lang) => (
    lang ? hljs.highlight(lang, code) : hljs.highlightAuto(code)
  ).value,
})

marked.Renderer.prototype.heading = (markup, level, rawText) => (
  `<h${level}${idAttr(genId(rawText))}>${markup}</h${level}>\n`
)

function idAttr (idValue) {
  return idValue ? ` id="${idValue}"` : ''
}

// Translated from kramdown for compatibility with GitHub readme.
function genId (text) {
  return text
    .trim()
    .replace(/[^\w\d -]/g, '')
    .replace(/\s/g, '-')
    .toLowerCase()
}

module.exports = {
  imports: {
    PROD,
    md: content => (
      marked(content)
        .replace(/<pre><code class="(.*)">|<pre><code>/g, '<pre><code class="hljs $1">')
        .replace(/<!--\s*:((?:[^:]|:(?!\s*-->))*):\s*-->/g, '$1')
    ),
    url: path => pt.join(pt.dirname(path), pt.parse(path).name),
  },
  ignorePath: path => /^partials/.test(path),
  renamePath: (path, {dir, name}) => (
    path === 'index.html' || path === '404.html'
    ? path
    : pt.join(dir, name, 'index.html')
  ),
}
