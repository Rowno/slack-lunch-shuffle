'use strict';
const test = require('ava');

const app = require('../app');


test('adds domain to url', (t) => {
    t.plan(1);

    t.is(app.addDomain('http://127.0.0.1/test/'), 'http://localhost/test/');
});
