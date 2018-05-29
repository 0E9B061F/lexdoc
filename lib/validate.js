'use strict'

const { ValidationError } = require('./errors.js')


function validate(chev) {
  if (!chev.Lexer || !chev.Lexer.NA || !chev.Lexer.SKIPPED || !chev.createToken) {
    throw new ValidationError('The provided version of Chevrotain is missing a portion of the API used by Lexdoc. If the version of Chevrotain you are using is within the version range specified by this version of Lexdoc, please file an issue at <https://github.com/aetherised/lexdoc/issues>')
  }
}

module.exports = validate
