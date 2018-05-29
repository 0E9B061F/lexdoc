'use strict'

const { Lexdoc } = require('./lib/lexdoc.js')
const validate = require('./lib/validate.js')


module.exports = function(chevrotain) {
  validate(chevrotain)
  return new Lexdoc(chevrotain)
}
