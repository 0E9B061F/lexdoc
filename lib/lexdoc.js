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
    return { loc: `${e.line}:${e.column})`, msg: e.message }
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
    this.defaultModeName = null
    this.fragmentList = {}
  }


  // Fragment DSL

  // Define a single pattern fragment
  fragment(name, def) {
    this.fragmentList[name] = XRegExp.build(def, this.fragmentList)
  }

  // Define multiple pattern fragments at once
  fragments(doc) {
    Object.entries(doc).forEach((pair)=> this.fragment(pair[0], pair[1]))
  }

  // Build and return an XRegExp pattern which may reference any
  // previously-created fragments
  pattern(def, flags) {
    return XRegExp.build(def, this.fragmentList, flags)
  }


  // Modes

  // Define a mode and a set of tokens associated with it
  mode(name, def) {
    this.modes[name] = new TokenSet(def)
    if (!this.defaultModeName) this.defaultMode(name)
  }

  // Set the default mode
  defaultMode(name) {
    this.defaultModeName = name
  }


  // Build

  // Return a multi-mode lexer definition used to instantiate a Chevrotain Lexer
  multiOrder() {
    const merged = { defaultMode: this.defaultModeName, modes: {}}
    Object.keys(this.modes).forEach((name)=> {
      merged.modes[name] = this.modes[name].order
    })
    return merged
  }

  // Returns a single object containing all tokens from multiple modes
  multiTokens() {
    const tokens = {}
    Object.keys(this.modes).forEach((name)=> {
      Object.entries(this.modes[name].created).forEach((pair)=> {
        tokens[pair[0]] = pair[1]
      })
    })
    return tokens
  }

  // Create the lexer object returned by #build
  createResult(order, tokens) {
    const instance = new Lexer(order)
    const result = {
      instance,
      tokens,
      lex: function(text) {
        const lexed = instance.tokenize(text)
        lexerErrorCheck(lexed.errors)
        return lexed
      }
    }
    return result
  }

  // Create a TokenSet then create and return a lexer object for a
  // single-mode lexer
  buildSingleMode(def) {
    if (Object.keys(this.modes).length > 0) throw new BuildError('Cannot build single-mode lexer, one or more modes already defined.')

    const ts = new TokenSet(def)
    return this.createResult(ts.order, ts.created)
  }

  // Create and return a lexer object for a multi-mode lexer
  buildMultiMode() {
    if (Object.keys(this.modes).length < 2) throw new BuildError('Must have two or more modes.')
    if (!this.defaultModeName) throw new BuildError('Must set a default mode.')
    if (!this.modes[this.defaultModeName]) throw new BuildError(`Invalid default mode. There is no mode named '${this.defaultModeName}'`)

    return this.createResult(this.multiOrder(), this.multiTokens())
  }

  // Build and return a lexer object. Must be called with a token definition
  // document for single-mode lexers. Must be called without any argument for
  // multi-mode lexers.
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

// Lexdoc API. Holds a Fulldoc instance while exposing only public methods and
// properties.
const Lexdoc = function(...args) {
  Object.defineProperty(this, '__FD', { value: new Fulldoc(...args), enumerable: false })
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
Lexdoc.prototype.defaultMode = function(...args) {
  this.__FD.defaultMode(...args)
}
Lexdoc.prototype.build = function(...args) {
  return this.__FD.build(...args)
}


module.exports = { Lexdoc, Fulldoc }
