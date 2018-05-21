'use strict'

const chevrotain = require('chevrotain')
const { BuildError, DependencyError } = require('./errors.js')


class TokenSet {
  constructor(def) {
    if (!Object.keys(def).length) {
      throw new BuildError('Must specify at least one token.')
    }

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
      if (doc instanceof RegExp || typeof(doc) === 'string') doc = { pattern: doc }
      doc.name = name
      this.recordDependencies(doc)
      this.docs[name] = doc
      this.order.push(name)
    })
    Object.entries(this.deplist).forEach((pair)=> {
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
}


module.exports = TokenSet
