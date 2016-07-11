'use strict';
const crypto = require('crypto');
const thunkify = require('thunkify');

const randomBytes = thunkify(crypto.randomBytes);


exports.generateKey = function *() {
    return (yield randomBytes(20)).toString('hex');
};
