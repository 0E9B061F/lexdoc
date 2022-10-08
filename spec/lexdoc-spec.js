'use strict'

const chevrotain = require('chevrotain')
const XRegExp = require('xregexp')

const { Lexdoc } = require('../lib/lexdoc.js')
const Errors = require('../lib/errors.js')

const validate = require('../lib/validate.js')


describe('Lexdoc', function() {
  let LD

  beforeEach(function() {
    LD = new Lexdoc(chevrotain)
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
      expect(lexer.tokens.TA.name).toEqual('TA')
      expect(lexer.tokens.TB.name).toEqual('TB')
      expect(lexer.tokens.TC.name).toEqual('TC')
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
        LD.build()
      }
      expect(onemode).toThrowError(Errors.BuildError)
    })

    it('should ensure that the default mode is valid', function() {
      function invalidDefault() {
        LD.mode('A', { TokenA: { pattern: 'A', line_breaks: true }})
        LD.mode('B', { TokenB: 'B' })
        LD.defaultMode('C')
        LD.build()
      }
      expect(invalidDefault).toThrowError(Errors.BuildError)
    })

    it('should reject modes definitions with no tokens', function() {
      function emptyMode() {
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
        LD = new Lexdoc(chevrotain)
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
      const lexer = LD.build()
      expect(Object.keys(lexer.tokens).length).toEqual(4)
      expect(lexer.tokens.TA.name).toEqual('TA')
      expect(lexer.tokens.TB.name).toEqual('TB')
      expect(lexer.tokens.TC.name).toEqual('TC')
      expect(lexer.tokens.TD.name).toEqual('TD')
      expect(lexer.tokens.TA.PATTERN).toEqual('A')
      expect(lexer.tokens.TB.PATTERN).toEqual(/B/)
      expect(lexer.tokens.TC.PATTERN).toEqual('C')
      expect(lexer.tokens.TD.PATTERN).toEqual(/D/)
    })

    it('should use the first mode as the default mode if not otherwise specified', function() {
      LD.mode('ModeA', {
        TA: { pattern: 'A', line_breaks: true },
        TB: /B/
      })
      LD.mode('ModeB', {
        TC: { pattern: 'C', line_breaks: true },
        TD: /D/
      })
      expect(LD.__FD.defaultModeName).toBe('ModeA')
    })

    it('should not overwrite an explicitly set default mode', function() {
      LD.defaultMode('ModeB')
      LD.mode('ModeA', {
        TA: { pattern: 'A', line_breaks: true },
        TB: /B/
      })
      LD.mode('ModeB', {
        TC: { pattern: 'C', line_breaks: true },
        TD: /D/
      })
      expect(LD.__FD.defaultModeName).toBe('ModeB')
    })

    it('should allow the user to explicitly set a default mode', function() {
      LD.mode('ModeA', {
        TA: { pattern: 'A', line_breaks: true },
        TB: /B/
      })
      LD.mode('ModeB', {
        TC: { pattern: 'C', line_breaks: true },
        TD: /D/
      })
      LD.defaultMode('ModeB')
      expect(LD.__FD.defaultModeName).toBe('ModeB')
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

describe('Chevrotain API validator', function() {
  it('should validate a compliant version of Chevrotain', function() {
    function shouldval() { validate(chevrotain) }

    expect(shouldval).not.toThrow()
  })

  it('should validate an object which appears to be a compliant version of Chevrotain', function() {
    function likeADuck() { validate({ Lexer: { NA: true, SKIPPED: true }, createToken: true }) }

    expect(likeADuck).not.toThrow()
  })

  it('should not validate noncompliant objects', function() {
    function empty() { validate({}) }
    function partialA() { validate({ Lexer: true, createToken: true }) }
    function partialB() { validate({ Lexer: { NA: true }, createToken: true }) }
    function partialC() { validate({ Lexer: { NA: true, SKIPPED: true }}) }
    function partialD() { validate({ createToken: true }) }

    expect(empty).toThrowError(Errors.ValidationError)
    expect(partialA).toThrowError(Errors.ValidationError)
    expect(partialB).toThrowError(Errors.ValidationError)
    expect(partialC).toThrowError(Errors.ValidationError)
    expect(partialD).toThrowError(Errors.ValidationError)
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

    expect(out).toEqual(require(filePath))
  })
})
