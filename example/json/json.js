'use strict'
// Adapted from the Chevrotain JSON example

const { Parser } = require('chevrotain')
const LD = require('../../index.js')


const JsonLexer = LD.build({
  WhiteSpace: {
      pattern: /[ \t\n\r]+/,
      group: LD.SKIPPED,
      line_breaks: true
  },

  NumberLiteral: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/,
  StringLiteral: /"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/,

  LCurly:  '{',
  RCurly:  '}',
  LSquare: '[',
  RSquare: ']',
  Comma:   ',',
  Colon:   ':',
  True:    'true',
  False:   'false',
  Null:    'null',
})

// ----------------- parser -----------------

class JsonParser extends Parser {
  constructor(input, config) {
    super(input, JsonLexer, config)

    const $ = this

    $.RULE("json", () => {
      let doc
      $.OR([
        { ALT: () => doc = $.SUBRULE($.object) },
        { ALT: () => doc = $.SUBRULE($.array) }
      ])
      return doc
    })

    $.RULE("object", () => {
      const obj = {}
      let pair
      $.CONSUME(JsonLexer.LCurly)
      $.MANY_SEP({
        SEP: JsonLexer.Comma,
        DEF: ()=> {
          pair = $.SUBRULE($.objectItem)
          obj[pair[0]] = pair[1]
        }
      })
      $.CONSUME(JsonLexer.RCurly)
      return obj
    })

    $.RULE("objectItem", () => {
      let name = $.CONSUME(JsonLexer.StringLiteral).image
      name = name.substr(1, name.length-2)
      $.CONSUME(JsonLexer.Colon)
      const val = $.SUBRULE($.value)
      return [name, val]
    })

    $.RULE("array", () => {
      const list = []
      let v
      $.CONSUME(JsonLexer.LSquare)
      $.OPTION(() => {
        v = $.SUBRULE($.value)
        list.push(v)
        $.MANY(() => {
          $.CONSUME(JsonLexer.Comma)
          v = $.SUBRULE2($.value)
          list.push(v)
        })
      })
      $.CONSUME(JsonLexer.RSquare)
      return list
    })

    $.RULE("value", () => {
      let val
      $.OR([
        { ALT: () => {
          val = $.CONSUME(JsonLexer.StringLiteral).image
          val = val.substr(1, val.length-2)
        }},
        { ALT: () => {
          val = $.CONSUME(JsonLexer.NumberLiteral).image
          val = Number(val)
        }},
        { ALT: () => val = $.SUBRULE($.object) },
        { ALT: () => val = $.SUBRULE($.array) },
        { ALT: () => {
          $.CONSUME(JsonLexer.True)
          val = true
        }},
        { ALT: () => {
          $.CONSUME(JsonLexer.False)
          val = false
        }},
        { ALT: () => {
          $.CONSUME(JsonLexer.Null)
          val = null
        }}
      ])
      return val
    })

    Parser.performSelfAnalysis(this)
  }
}

const parser = new JsonParser([])

module.exports = function(text) {
  const lexResult = JsonLexer(text)
  // setting a new input will RESET the parser instance's state.
  parser.input = lexResult.tokens
  // any top level rule may be used as an entry point
  const value = parser.json()

  if (parser.errors[0]) throw Error(parser.errors[0].message)

  return value
}
