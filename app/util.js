'use strict';
const crypto = require('crypto');
const config = require('./config');


/**
 * Generates a 20 cryptographically random characters
 *
 * @returns {string}
 */
function generateKey() {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(20, (err, buffer) => {
            if (err) {
                return reject(err);
            }

            return resolve(buffer.toString('hex'));
        });
    });
}
exports.generateKey = generateKey;


/**
 * Tries to log in the user to lunch shuffle
 *
 * @param {object} state Koa this.state
 * @param {object} session Koa this.session
 * @param {string} password Password the user entered
 */
function *login(state, session, password) {
    // Check against hard coded password 😆
    if (password === config.PASSWORD) {
        session.loggedIn = true;
    }

    // Generate a key for validating the Slack oauth response
    if (session.loggedIn && !session.oauthKey) {
        session.oauthKey = yield generateKey();
    }

    state.loggedIn = session.loggedIn;
    state.oauthKey = session.oauthKey;
}
exports.login = login;
