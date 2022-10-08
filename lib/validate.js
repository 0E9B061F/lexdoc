'use strict'

const { ValidationError } = require('./errors.js')


function validate(chev) {
  if (!chev.Lexer || !chev.Lexer.NA || !chev.Lexer.SKIPPED || !chev.createToken) {
    throw new ValidationError('The provided version of Chevrotain appears to be invalid.\nIf the version of Chevrotain you are using is within the version range specified by this version of Lexdoc, please file an issue at <https://github.com/0E9B061F/lexdoc/issues>, including an example of the code causing this error and which version of Chevrotain you are using.')
  }
}

module.exports = validate
