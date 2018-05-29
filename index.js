'use strict'

const { Lexdoc } = require('./lib/lexdoc.js')


module.exports = function(chevrotain) {
  return new Lexdoc(chevrotain)
}
