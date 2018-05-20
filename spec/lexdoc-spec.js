'use strict'

const Errors = require('../lib/errors.js')
const { Lexdoc } = require('../lib/lexdoc.js')
const XRegExp = require('xregexp')


describe('Lexdoc', function() {
  let LD

  beforeEach(function() {
    LD = new Lexdoc()
  })

  describe('Single mode', function() {
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

    it('should build and expose tokens', function() {
      const lexer = LD.build({
        TA: { pattern: 'A', line_breaks: true },
        TB: /B/,
        TC: 'C'
      })
      expect(Object.keys(lexer.tokens).length).toEqual(3)
      expect(lexer.tokens.TA.tokenName).toEqual('TA')
      expect(lexer.tokens.TB.tokenName).toEqual('TB')
      expect(lexer.tokens.TC.tokenName).toEqual('TC')
      expect(lexer.tokens.TA.PATTERN).toEqual('A')
      expect(lexer.tokens.TB.PATTERN).toEqual(/B/)
      expect(lexer.tokens.TC.PATTERN).toEqual('C')
    })

    it('should correctly resolve and set token references', function() {
      const lexer = LD.build({
        TA: { pattern: 'A', line_breaks: true },
        TB: LD.CATEGORY,
        TC: LD.CATEGORY,
        TD: { pattern: 'C', categories: 'TB TC' },
        TE: { pattern: /E/, longer_alt: 'TF' },
        TF: /F/
      })
      expect(Object.keys(lexer.tokens).length).toEqual(6)
      expect(lexer.tokens.TD.CATEGORIES.length).toEqual(2)
      expect(lexer.tokens.TD.CATEGORIES).toEqual([lexer.tokens.TB, lexer.tokens.TC])
      expect(lexer.tokens.TE.LONGER_ALT).toBe(lexer.tokens.TF)
    })
  })

  describe('Multi-mode', function() {
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
        LD.mode('A', { TokenA: { pattern: 'A', line_breaks: true }})
        LD.mode('B', { TokenB: 'B' })
        LD.setDefault('C')
        LD.build()
      }
      expect(invalidDefault).toThrowError(Errors.BuildError)
    })

    it('should reject modes definitions with no tokens', function() {
      function emptyMode() {
        LD.setDefault('A')
        LD.mode('A', { TokenA: { pattern: 'A', line_breaks: true }})
        LD.mode('B', {})
        LD.build()
      }
      expect(emptyMode).toThrowError(Errors.BuildError)
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
          doc[`Token${letter}`] = { pattern: letter, line_breaks: true }
          LD.mode(letter, doc)
        }
        const lexer = LD.build()
        expect(Object.keys(lexer.tokens).length).toEqual(number)
        expect(lexer.instance.modes.length).toEqual(number)
      })
    })

    it('should build and expose tokens', function() {
      LD.mode('ModeA', {
        TA: { pattern: 'A', line_breaks: true },
        TB: /B/
      })
      LD.mode('ModeB', {
        TC: { pattern: 'C', line_breaks: true },
        TD: /D/
      })
      LD.setDefault('ModeA')
      const lexer = LD.build()
      expect(Object.keys(lexer.tokens).length).toEqual(4)
      expect(lexer.tokens.TA.tokenName).toEqual('TA')
      expect(lexer.tokens.TB.tokenName).toEqual('TB')
      expect(lexer.tokens.TC.tokenName).toEqual('TC')
      expect(lexer.tokens.TD.tokenName).toEqual('TD')
      expect(lexer.tokens.TA.PATTERN).toEqual('A')
      expect(lexer.tokens.TB.PATTERN).toEqual(/B/)
      expect(lexer.tokens.TC.PATTERN).toEqual('C')
      expect(lexer.tokens.TD.PATTERN).toEqual(/D/)
    })
  })

  describe('TokenSet', function() {
    it('should detect dependency loops', function() {
      function catloop() {
        LD.build({
          Foo: { pattern: LD.CATEGORY, categories: 'Bar' },
          Bar: { pattern: LD.CATEGORY, categories: 'Baz' },
          Baz: { pattern: LD.CATEGORY, categories: 'Foo' }
        })
      }
      function altloop() {
        LD.build({
          Foo: { pattern: 'foo', longer_alt: 'Bar' },
          Bar: { pattern: 'bar', longer_alt: 'Baz' },
          Baz: { pattern: 'baz', longer_alt: 'Foo' }
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
          Bat: { pattern: 'bat', categories: 'Foo Bar Baz' }
        })
      }
      function missingalt() {
        LD.build({ Foo: { pattern: 'foo', longer_alt: 'Bar' }})
      }
      expect(missingcat).toThrowError(Errors.DependencyError)
      expect(missingalt).toThrowError(Errors.DependencyError)
    })
  })

  describe('Fragment DSL', function() {
    it('should correctly define fragments', function() {
      LD.fragments({ A: 'foo', B: 'bar' })
      LD.fragment('C', 'baz')
      expect(Object.keys(LD.__FD.fragmentList).length).toEqual(3)
      Object.entries(LD.__FD.fragmentList).forEach((pair)=> {
        expect(pair[1] instanceof XRegExp).toBe(true)
      })
    })

    it('should correctly reference fragments using the pattern method', function() {
      LD.fragments({ A: 'foo', B: 'bar' })
      const pat = LD.pattern('1{{A}}2{{B}}3')
      expect(pat instanceof XRegExp).toBe(true)
      expect(pat.test('1foo2bar3')).toBe(true)
      expect(pat.test('1X2Y3')).toBe(false)
    })

    it('should work correctly in token definitions', function() {
      LD.fragments({ A: 'foo', B: 'bar' })
      const lexer = LD.build({
        TA: { pattern: LD.pattern('1{{A}}2{{B}}3'), line_breaks: true },
        TB: LD.pattern('{{A}}{{B}}baz')
      })
      expect(lexer.tokens.TA.PATTERN).toEqual(LD.pattern('1{{A}}2{{B}}3'))
      expect(lexer.tokens.TB.PATTERN).toEqual(LD.pattern('{{A}}{{B}}baz'))
      expect(lexer.tokens.TA.PATTERN.test('1foo2bar3')).toBe(true)
      expect(lexer.tokens.TB.PATTERN.test('foobarbaz')).toBe(true)
    })
  })
})

describe('JSON example', function() {
  it('should parse correctly', function() {
    const fs = require('fs')
    const path = require('path')
    const json = require('../example/json/json.js')
    const filePath = path.join(__dirname, '../example/json/file.json')
    const file = fs.readFileSync(filePath, { encoding: 'utf-8' })
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
