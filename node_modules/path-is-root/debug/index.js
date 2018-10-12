'use strict'
const path = require('path')

const cwd = process.cwd()
const target = process.argv.slice(-1)[0]

require('babel-core/register')
require(`${cwd}/${target}`)
