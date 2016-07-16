'use strict';
const nconf = require('nconf');
const yaml = require('js-yaml');

/*
Config priority order:
 1. Environment variables
 2. config.yaml file
 3. config.json file
*/

// Load config from environment variables
nconf.env();

// Load config from config.yaml file
nconf.use('yaml', {
    type: 'file',
    file: 'config.yaml',
    format: {
        parse: yaml.safeLoad,
        stringify: yaml.safeDump,
    }
});

// Load config from config.json file
nconf.file('json', 'config.json');

// Make sure all the config variables are set
nconf.required([
    'baseurl',
    'port',
    'mongouri',
    'password',
    'cookiekeys',
    'groupsize:target',
    'groupsize:minimum',
    'slack:id',
    'slack:secret',
    'slack:verification'
]);


module.exports = nconf;
