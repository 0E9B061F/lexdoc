'use strict'

const chevrotain = require('chevrotain')
const Lexer = chevrotain.Lexer
const XRegExp = require('xregexp')

const { BuildError, DependencyError, LexerError } = require('./lib/errors.js')


const modes = {}
let defaultMode
const fragmentList = {}

function fragment(name, def) {
  fragmentList[name] = XRegExp.build(def, fragmentList)
}

function fragments(doc) {
  Object.entries(doc).forEach((pair)=> fragment(pair[0], pair[1]))
}

function pattern(def, flags) {
  return XRegExp.build(def, fragmentList, flags)
}


class TokenSet {
  constructor(def) {
    this.order = []
    this.docs = {}
    this.deplist = {}
    this.created = {}

    this.digestDefinition(def)
    Object.keys(this.deplist).forEach((name)=> this.resolve(name))
    this.order = this.order.map((name)=> this.created[name])
  }

  // Transform a given token definition document for further processing
  digestDefinition(def) {
    Object.entries(def).forEach((pair)=> {
      const name = pair[0]
      let doc = pair[1]
      if (doc instanceof RegExp || typeof(doc) === 'string') doc = {pattern: doc}
      doc.name = name
      this.recordDependencies(doc)
      this.docs[name] = doc
      this.order.push(name)
    })
    Object.entries(this.deplist).forEach((pair)=> {
      const name = pair[0]
      const list = pair[1]
      list.forEach((dep)=> {
        if (!this.docs[dep]) throw new DependencyError(`Invalid dependency: ${dep}`)
      })
    })
  }

  // Note any dependencies that exist in the given token definition. These will be
  // traversed and resolved before the given token is created.
  recordDependencies(doc) {
    const deps = []
    if (doc.longer_alt) deps.push(doc.longer_alt)
    if (doc.categories) {
      let cats = doc.categories
      if (typeof(cats) === 'string') cats = cats.split(' ')
      cats.forEach((c)=> deps.push(c))
    }
    this.deplist[doc.name] = deps
  }

  // Resolve dependencies for the named tokens, then create each
  resolve(names, path=[]) {
    if (!Array.isArray(names)) names = [names]
    names.forEach((name)=> {
      this.infiniteLoopCheck(name, path)
      if (!this.created[name]) {
        const deps = this.deplist[name]
        if (deps.length) {
          path.push(name)
          this.resolve(deps, path)
        }
        this.createToken(name)
      }
    })
  }

  // Create and store a token object from the stored token definition with the
  // given name
  createToken(name) {
    const doc = this.docs[name]
    if (doc.longer_alt) doc.longer_alt = this.created[doc.longer_alt]
    if (doc.categories) {
      let cats = doc.categories
      if (typeof(cats) === 'string') cats = cats.split(' ')
      doc.categories = cats.map((c)=> this.created[c])
    }
    const t = chevrotain.createToken(doc)
    this.created[name] = t
  }

  // Check for infinite loops in dependency resolution
  infiniteLoopCheck(name, path) {
    if (path.includes(name)) {
      path.push(name)
      path = path.join(' -> ')
      throw new DependencyError(`Dependency loop detected in token document:\n       ${path}\n`)
    }
  }

  setCreated(on) {
    Object.keys(this.created).forEach((name)=> on[name] = this.created[name])
    return on
  }
}


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

function mode(name, def) {
  modes[name] = new TokenSet(def)
}

function setDefault(name) {
  defaultMode = name
}

function multiOrder() {
  const merged = {defaultMode, modes: {}}
  Object.keys(modes).forEach((name)=> {
    merged.modes[name] = modes[name].order
  })
  return merged
}

function multiSet(on) {
  Object.keys(modes).forEach((name)=> modes[name].setCreated(on) )
  return on
}

function createResult(order) {
  const lexer = new chevrotain.Lexer(order)
  const result = function(text) {
    const lexed = lexer.tokenize(text)
    lexerErrorCheck(lexed.errors)
    return lexed
  }
  return result
}

function buildSingleMode(def) {
  if (Object.keys(modes).length > 0) throw new BuildError('Already defined modes!')
  if (!Object.keys(def).length) throw new BuildError('Must specify at least one token!')

  const ts = new TokenSet(def)
  const result = createResult(ts.order)
  ts.setCreated(result)
  return result
}

function buildMultiMode() {
  if (Object.keys(modes).length < 2) throw new BuildError('Must have two or more modes!')
  if (!defaultMode) throw new BuildError('Must set a default mode!')

  const result = createResult(multiOrder())
  multiSet(result)
  return result
}

function build(def) {
  if (!def && !Object.keys(modes).length) {
    throw new BuildError('Must specify a token definition object!')
  }
  if (def) {
    return buildSingleMode(def)
  } else {
    return buildMultiMode()
  }
}

module.exports = {
  mode, setDefault, build,
  fragment, fragments, pattern,
  CATEGORY: Lexer.NA,
  SKIPPED: Lexer.SKIPPED
}
