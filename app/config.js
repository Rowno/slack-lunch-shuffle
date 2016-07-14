'use strict';
const nconf = require('nconf');
const yaml = require('js-yaml');


nconf.env();

nconf.use('yaml', {
    type: 'file',
    file: 'config.yaml',
    format: {
        parse: yaml.safeLoad,
        stringify: yaml.safeDump,
    }
});

nconf.file('json', 'config.json');

nconf.required([
    'baseurl',
    'port',
    'mongouri',
    'password',
    'cookiekeys',
    'slack:id',
    'slack:secret',
    'slack:verification'
]);


module.exports = nconf;
