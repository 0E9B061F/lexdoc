'use strict'

const Errors = require('../lib/errors.js')
const { Lexdoc, Fulldoc } = require('../lib/lexdoc.js')


describe('lexdoc', function() {
  let LD

  beforeEach(function() {
    LD = new Lexdoc()
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

  it('should require at least two modes', function() {
    function onemode() {
      LD.mode('A', { TokenA: 'A' })
      LD.setDefault('A')
      LD.build()
    }
    expect(onemode).toThrowError(Errors.BuildError)
  })

  it('should ensure that the default mode is valid', function() {
    function invalidDefault() {
      LD.mode('A', { TokenA: {pattern: 'A', line_breaks: true} })
      LD.mode('B', { TokenB: 'B' })
      LD.setDefault('C')
      LD.build()
    }
    expect(invalidDefault).toThrowError(Errors.BuildError)
  })

  it('should support multiple modes', function() {
    const numbers = [2,3,4,10,20]
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    numbers.forEach((number)=> {
      LD = new Lexdoc()
      LD.setDefault('A')
      for (let count = 0; count < number; count++) {
        const letter = letters[count]
        const doc = {}
        doc[`Token${letter}`] = {pattern: letter, line_breaks: true}
        LD.mode(letter, doc)
      }
      const lexer = LD.build()
      expect(Object.keys(lexer).length).toEqual(number)
    })
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
