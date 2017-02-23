'use strict'
const nconf = require('nconf')
const yaml = require('js-yaml')

/*
Config priority order:
 1. Environment variables
 2. config.yaml file
 3. config.json file
*/

// Load config from environment variables
nconf.env('_')

// Load config from config.yaml file
nconf.use('yaml', {
  type: 'file',
  file: 'config.yaml',
  format: {
    parse: yaml.safeLoad,
    stringify: yaml.safeDump
  }
})

// Load config from config.json file
nconf.file('json', 'config.json')

nconf.defaults({
  env: process.env.NODE_ENV || 'development',
  port: 8000,
  mongouri: 'mongodb://localhost/lunchshuffle',
  loggly: {
    token: false,
    subdomain: false
  },
  groupsize: {
    target: 4,
    minimum: 4
  }
})

// Make sure all the config variables are set
nconf.required([
  'env',
  'baseurl',
  'port',
  'mongouri',
  'loggly:token',
  'loggly:subdomain',
  'password',
  'cookiekeys',
  'groupsize:target',
  'groupsize:minimum',
  'slack:id',
  'slack:secret',
  'slack:verification'
])

module.exports = nconf
