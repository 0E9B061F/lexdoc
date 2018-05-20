'use strict'

const fs = require('fs')
const path = require('path')

const json = require('./json.js')

const filePath = path.join(__dirname, './file.json')
const file = fs.readFileSync(filePath, {encoding: 'utf-8'})


const out = json(file)
console.log(out)
