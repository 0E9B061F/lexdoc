'use strict'

const chevrotain = require('chevrotain')
const Lexer = chevrotain.Lexer
const XRegExp = require('xregexp')


const modes = {}
let default_mode
const fragment_list = {}

function fragment(name, def) {
  fragment_list[name] = XRegExp.build(def, fragment_list)
}

function fragments(doc) {
  Object.entries(doc).forEach((pair)=> fragment(pair[0], pair[1]))
}

function pattern(def, flags) {
  return XRegExp.build(def, fragment_list, flags)
}


class TokenSet {
  constructor(def) {
    this.order = []
    this.docs = {}
    this.deplist = {}
    this.created = {}

    this.digest_definition(def)
    Object.keys(this.deplist).forEach((name)=> this.resolve(name))
    this.order = this.order.map((name)=> this.created[name])
  }

  // Transform a given token definition document for further processing
  digest_definition(def) {
    Object.entries(def).forEach((pair)=> {
      const name = pair[0]
      let doc = pair[1]
      if (doc instanceof RegExp || typeof(doc) === 'string') doc = {pattern: doc}
      doc.name = name
      this.record_dependencies(doc)
      this.docs[name] = doc
      this.order.push(name)
    })
    Object.entries(this.deplist).forEach((pair)=> {
      const name = pair[0]
      const list = pair[1]
      list.forEach((dep)=> {
        if (!this.docs[dep]) throw Error(`Invalid dependency: ${dep}`)
      })
    })
  }

  // Note any dependencies that exist in the given token definition. These will be
  // traversed and resolved before the given token is created.
  record_dependencies(doc) {
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
      this.infinite_loop_check(name, path)
      if (!this.created[name]) {
        const deps = this.deplist[name]
        if (deps.length) {
          path.push(name)
          this.resolve(deps, path)
        }
        this.create_token(name)
      }
    })
  }

  // Create and store a token object from the stored token definition with the
  // given name
  create_token(name) {
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
  infinite_loop_check(name, path) {
    if (path.includes(name)) {
      path.push(name)
      path = path.join(' -> ')
      throw Error(`Dependency loop detected in token document:\n       ${path}\n`)
    }
  }

  set_created(on) {
    Object.keys(this.created).forEach((name)=> on[name] = this.created[name])
    return on
  }
}


// Format lexer error messages for human consumption
function lexer_error(errors) {
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
function lexer_error_check(errors) {
  if (errors.length) throw Error(lexer_error(errors))
}

function mode(name, def) {
  modes[name] = new TokenSet(def)
}

function set_default(name) {
  default_mode = name
}

function build_single_mode(def) {
  if (Object.keys(modes).length > 0) throw Error('Already defined modes!')
  if (!Object.keys(def).length) throw Error('Must specify at least one token!')
  const ts = new TokenSet(def)
  const lexer = new chevrotain.Lexer(ts.order)
  const result = function(text) {
    const lexed = lexer.tokenize(text)
    lexer_error_check(lexed.errors)
    return lexed
  }
  ts.set_created(result)
  return result
}

function build_multi_mode() {
  if (Object.keys(modes).length < 2) throw Error('Must have two or more modes!')
  if (!default_mode) throw Error('Must set a default mode!')
  const order = {defaultMode: default_mode, modes: {}}
  Object.keys(modes).forEach((name)=> {
    order.modes[name] = modes[name].order
  })
  const lexer = new chevrotain.Lexer(order)
  const result = function(text) {
    const lexed = lexer.tokenize(text)
    lexer_error_check(lexed.errors)
    return lexed
  }
  Object.keys(modes).forEach((name)=> {
    modes[name].set_created(result)
  })
  return result
}

function build(def) {
  if (!def && !Object.keys(modes).length) {
    throw Error('Must specify a token definition object!')
  }
  if (def) {
    return build_single_mode(def)
  } else {
    return build_multi_mode()
  }
}

module.exports = {
  mode, set_default, build,
  fragment, fragments, pattern,
  CATEGORY: Lexer.NA,
  SKIPPED: Lexer.SKIPPED
}
