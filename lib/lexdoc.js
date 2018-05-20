'use strict'

const { Lexer } = require('chevrotain')
const XRegExp = require('xregexp')

const TokenSet = require('./tokenset.js')
const { BuildError, LexerError } = require('./errors.js')


// Format lexer error messages for human consumption
function lexerError(errors) {
  let explanation
  if (errors.length > 1) {
    explanation = 'Encountered problems while lexing input:'
  } else {
    explanation = 'Encountered a problem while lexing input:'
  }
  errors = errors.map((e)=> {
    return {loc: `${e.line}:${e.column})`, msg: e.message}
  })
  const pad = errors.reduce((w,e)=> {
    const ll = e.loc.length
    return (ll > w ? ll : w)
  }, 0)
  errors = errors.map((e)=> {
    return `       (${e.loc.padStart(pad)} ${e.msg}`
  }).join('\n')
  return `${explanation}\n${errors}\n`
}

// Throw if the lexer reported errors
function lexerErrorCheck(errors) {
  if (errors.length) throw new LexerError(lexerError(errors))
}


class Fulldoc {
  constructor() {
    this.modes = {}
    this.defaultMode = null
    this.fragmentList = {}
  }


  // Fragment DSL

  fragment(name, def) {
    this.fragmentList[name] = XRegExp.build(def, this.fragmentList)
  }

  fragments(doc) {
    Object.entries(doc).forEach((pair)=> this.fragment(pair[0], pair[1]))
  }

  pattern(def, flags) {
    return XRegExp.build(def, this.fragmentList, flags)
  }


  // Modes

  mode(name, def) {
    this.modes[name] = new TokenSet(def)
  }

  setDefault(name) {
    this.defaultMode = name
  }


  // Build

  multiOrder() {
    const merged = { defaultMode: this.defaultMode, modes: {} }
    Object.keys(this.modes).forEach((name)=> {
      merged.modes[name] = this.modes[name].order
    })
    return merged
  }

  multiSet(on) {
    Object.keys(this.modes).forEach((name)=> this.modes[name].setCreated(on) )
    return on
  }

  createResult(order) {
    const lexer = new Lexer(order)
    const result = function(text) {
      const lexed = lexer.tokenize(text)
      lexerErrorCheck(lexed.errors)
      return lexed
    }
    return result
  }

  buildSingleMode(def) {
    if (Object.keys(this.modes).length > 0) throw new BuildError('Cannot build single-mode lexer, one or more modes already defined.')
    if (!Object.keys(def).length) throw new BuildError('Must specify at least one token.')

    const ts = new TokenSet(def)
    const result = this.createResult(ts.order)
    ts.setCreated(result)
    return result
  }

  buildMultiMode() {
    if (Object.keys(this.modes).length < 2) throw new BuildError('Must have two or more modes.')
    if (!this.defaultMode) throw new BuildError('Must set a default mode.')
    if (!this.modes[this.defaultMode]) throw new BuildError(`Invalid default mode. There is no mode named '${this.defaultMode}'`)

    const result = this.createResult(this.multiOrder())
    this.multiSet(result)
    return result
  }

  build(def) {
    if (!def && !Object.keys(this.modes).length) {
      throw new BuildError('Must specify a token definition object!')
    }
    if (def) {
      return this.buildSingleMode(def)
    } else {
      return this.buildMultiMode()
    }
  }
}

const Lexdoc = function(...args) {
  Object.defineProperty(this, '__FD', {value: new Fulldoc(...args), enumerable: false})
  this.CATEGORY = Lexer.NA
  this.SKIPPED = Lexer.SKIPPED
}
Lexdoc.prototype.fragment = function(...args) {
  this.__FD.fragment(...args)
}
Lexdoc.prototype.fragments = function(...args) {
  this.__FD.fragments(...args)
}
Lexdoc.prototype.pattern = function(...args) {
  return this.__FD.pattern(...args)
}
Lexdoc.prototype.mode = function(...args) {
  this.__FD.mode(...args)
}
Lexdoc.prototype.setDefault = function(...args) {
  this.__FD.setDefault(...args)
}
Lexdoc.prototype.build = function(...args) {
  return this.__FD.build(...args)
}


module.exports = { Lexdoc, Fulldoc }
