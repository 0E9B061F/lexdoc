# lexdoc

[![npm](https://img.shields.io/npm/v/lexdoc.svg?style=flat-square)](https://www.npmjs.com/package/lexdoc)
[![license](https://img.shields.io/github/license/aetherised/lexdoc.svg?style=flat-square)][license]
[![dependencies](https://david-dm.org/aetherised/lexdoc.svg?style=flat-square)](https://david-dm.org/onury/jasmine-console-reporter)
[![maintenance](https://img.shields.io/maintenance/yes/2018.svg?style=flat-square)](https://github.com/aetherised/lexdoc/commits/master)

Simplified token definition and lexer creation library for use with [Chevrotain][chevrotain].

Example:

```js
const LD = require('lexdoc')

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

JsonLexer.instance // Stores the Chevrotain Lexer instance that was created

JsonLexer.tokens   // An object containing the created tokens

JsonLexer.lex(str) // Tokenize the given string. Wrapper around the created
                   // Lexer instance's #tokenize method, with built-in error
                   // handling.
```

# Installation

```shell
npm install lexdoc
```

# Features

## Shortened Definitions for Simple Tokens

Tokens which have only a pattern and no other properties can be defined using
only their pattern, simplifying many token definitions:

```js
// Using the Chevrotain #createToken API:
const True = createToken({ name: "True", pattern: /true/ })
const False = createToken({ name: "False", pattern: /false/ })
const Null = createToken({ name: "Null", pattern: /null/ })
const LCurly = createToken({ name: "LCurly", pattern: /{/ })
const RCurly = createToken({ name: "RCurly", pattern: /}/ })

// Using Lexdoc
LD.build({
  True:   /true/,
  False:  /false/,
  Null:   /null/,
  LCurly: /{/,
  RCurly: /}/
})
```

Notice that the token name is not repeated using **Lexdoc**, keeping things DRY.

## Soft Token References

References to other tokens within a token definition are done using a string
representing the token's name, rather than a direct reference to the created
token object. This has two advantages:

* Tokens can be referenced before they are defined.
* Tokens are defined in order of lexing precedence, rather than in order of dependence,
with their order of precedence then specified separately.

Examples:

```js
LD.build({
  // Categories are defined using LD.CATEGORY, a more semantic synonym for
  // Chevrotain's Lexer.NA
  Boolean: LD.CATEGORY,
  Value:   LD.CATEGORY,

  // Reserved words
  True: {
    pattern: /true/,
    longer_alt: 'Identifier',   // Note that we reference Identifier before it's defined
    categories: 'Boolean Value'
  },
  False: {
    pattern: /false/,
    longer_alt: 'Identifier',
    categories: 'Boolean Value' // Categories can be referenced using a
  },                            // space-seperated string. An array of strings
                                // could also be used.

  Identifier: {
    pattern: /[a-zA-Z][a-zA-Z_]*/,
    categories: 'Value'
  }
})
```

## Order of Definition is Order of Precedence

As seen above, the order of precedence when lexing is the same as the order in
which tokens are defined when using **Lexdoc**. In Chevrotain tokens are defined
and their order of precedence is then given separately.

Using Chevrotain:

```js
// Identifier must be defined before Select or From so it can be referenced by
// them
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z]\w*/ })

const Select = createToken({
    name: "Select",
    pattern: /SELECT/,
    longer_alt: Identifier
})
const From = createToken({
    name: "From",
    pattern: /FROM/,
    longer_alt: Identifier
})

// The order in which tokens will be lexed must be specified separately
const tokens = [
  Select,
  From,
  Identifier
]

const lexer = new Lexer(tokens)
```

In **Lexdoc** token precedence during lexing is the same as the order in which
tokens are defined:

```js
const lexer = LD.build({
  Select: {
    pattern: /SELECT/,
    longer_alt: 'Identifier'
  },
  From: {
    pattern: /FROM/,
    longer_alt: 'Identifier'
  },
  Identifier: /[a-zA-Z]\w*/
})
```

## Mult-mode Lexers

Multi-mode lexers are supported by **Lexdoc**:

```js
LD.mode('ModeA', {
  TokenA: 'A',
  TokenB: 'B'
})
LD.mode('ModeB', {
  TokenC: 'C',
  TokenD: 'D'
})

LD.defaultMode('ModeB') // The first mode defined is implicitly set to be the
                        // default mode, but any other mode may be explicitly
                        // set as the default using #defaultMode

const lexer = LD.build()
```

## Built-in XRegExp DSL

Lexdoc has a built-in XRegExp DSL, as seen in many of Chevrotain's examples,
allowing for reuse of patterns.

Example usage:

```js
// Define multiple fragments at once using #fragments
LD.fragments({
  fragA: 'foo',
  fragB: 'bar'
})

// Fragments can also be defined one at a time using #fragment
LD.fragment('fragC', 'baz')

// Fragments are re-used with the #pattern method
const lexer = LD.build({
  TokenA: LD.pattern('{{fragA}}.*?{{fragB}}'),
  TokenB: LD.pattern('\\({{fragC}}\\)')
})
```

# Full Example

For a full example, see the provided [JSON parser example][json-example].

Here's a stripped-down example showing only the important stuff:

```js
const JsonLexer = LD.build({
  // Token definitions ...
})

class JsonParser extends Parser {
  constructor(input, config) {
    super(input, JsonLexer.tokens, config) // Use of lexer object's token list

    // Rules ...

    $.RULE('object', () => {
      $.CONSUME(JsonLexer.tokens.LCurly) // Reference to token
      // ...
      $.CONSUME(JsonLexer.tokens.RCurly) // Reference to token
    })

    // Rules ...

    Parser.performSelfAnalysis(this)
  }
}

const parser = new JsonParser([])

module.exports = function(text) {
  const lexResult = JsonLexer.lex(text) // Actual usage of the lexer
  parser.input = lexResult.tokens
  const value = parser.json()
  return value
}
```


## License

Available under the terms of the [MIT license.][license]

Copyright 2018 [Abacus Lever / aetherised][alever]


[alever]:https://github.com/aetherised
[license]:https://github.com/aetherised/lexdoc/blob/master/LICENSE
[chevrotain]:https://github.com/SAP/chevrotain
[json-example]:https://github.com/aetherised/lexdoc/blob/master/example/json/json.js
