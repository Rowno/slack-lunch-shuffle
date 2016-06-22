'use strict';
const test = require('ava');

const index = require('../lib/index');


test('adds domain to url', (t) => {
    t.plan(1);

    t.is(index.addDomain('http://127.0.0.1/test/'), 'http://localhost/test/');
});
