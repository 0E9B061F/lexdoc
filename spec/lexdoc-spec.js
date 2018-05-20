'use strict'

const Errors = require('../lib/errors.js')
const { Lexdoc, Wrapper } = require('../lib/lexdoc.js')


describe('lexdoc', function() {
  let LD

  beforeEach(function() {
    LD = new Wrapper()
  })

  it('should not build without a token definition', function() {
    function noarg() { LD.build() }
    expect(noarg).toThrowError(Errors.BuildError)
  })

  it('should not accept an empty token definition', function() {
    function emptydef() { LD.build({}) }
    expect(emptydef).toThrowError(Errors.BuildError)
  })

  it('should not accept a single mode definition after modes have been defined', function() {
    function mixedbuild() {
      LD.mode('A', { TokenA: 'A' })
      LD.mode('B', { TokenA: 'B' })
      LD.build({ TokenC: 'C' })
    }
    expect(mixedbuild).toThrowError(Errors.BuildError)
  })

  it('should detect dependency loops', function() {
    function catloop() {
      LD.build({
        Foo: {pattern: LD.CATEGORY, categories: 'Bar'},
        Bar: {pattern: LD.CATEGORY, categories: 'Baz'},
        Baz: {pattern: LD.CATEGORY, categories: 'Foo'}
      })
    }
    function altloop() {
      LD.build({
        Foo: {pattern: 'foo', longer_alt: 'Bar'},
        Bar: {pattern: 'bar', longer_alt: 'Baz'},
        Baz: {pattern: 'baz', longer_alt: 'Foo'}
      })
    }
    expect(catloop).toThrowError(Errors.DependencyError)
    expect(altloop).toThrowError(Errors.DependencyError)
  })

  it('should detect missing dependencies', function() {
    function missingcat() {
      LD.build({
        Foo: LD.CATEGORY,
        Bar: LD.CATEGORY,
        Bat: {pattern: 'bat', categories: 'Foo Bar Baz'}
      })
    }
    function missingalt() {
      LD.build({ Foo: {pattern: 'foo', longer_alt: 'Bar'} })
    }
    expect(missingcat).toThrowError(Errors.DependencyError)
    expect(missingalt).toThrowError(Errors.DependencyError)
  })

})

describe('json example', function() {
  it('should parse correctly', function() {
    const fs = require('fs')
    const path = require('path')
    const json = require('../example/json/json.js')
    const filePath = path.join(__dirname, '../example/json/file.json')
    const file = fs.readFileSync(filePath, {encoding: 'utf-8'})
    const out = json(file)

    expect(out).toEqual({
      foo: 1,
      bar: 'B',
      baz: [1, 2, 'c'],
      bat: { x: 101, y: 102 },
      e1: [],
      e2: {}
    })
  })
})
