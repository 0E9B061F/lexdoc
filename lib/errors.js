'use strict'


class BuildError extends Error {
  constructor(...args) {
    super(...args)
    Error.captureStackTrace(this, BuildError)
    this.name = 'BuildError'
  }
}

class LexerError extends Error {
  constructor(...args) {
    super(...args)
    Error.captureStackTrace(this, LexerError)
    this.name = 'LexerError'
  }
}

class DependencyError extends Error {
  constructor(...args) {
    super(...args)
    Error.captureStackTrace(this, DependencyError)
    this.name = 'DependencyError'
  }
}

class ValidationError extends Error {
  constructor(...args) {
    super(...args)
    Error.captureStackTrace(this, ValidationError)
    this.name = 'ValidationError'
  }
}


module.exports = { BuildError, LexerError, DependencyError, ValidationError }
