'use strict'

const Errors = require('../lib/errors.js')


describe('lexdoc', function() {

  it('should not build without a token definition', function() {
    const LD = require('../index.js')
    expect(LD.build).toThrowError(Errors.BuildError)
  })

  it('should not accept an empty token definition', function() {
    const LD = require('../index.js')
    function emptydef() { LD.build({}) }
    expect(emptydef).toThrowError(Errors.BuildError)
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
