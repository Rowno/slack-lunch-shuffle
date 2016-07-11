'use strict';
const crypto = require('crypto');


exports.generateKey = function () {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(20, (err, buffer) => {
            if (err) {
                return reject(err);
            }

            return resolve(buffer.toString('hex'));
        });
    });
};
