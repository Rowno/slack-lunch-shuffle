'use strict';
const crypto = require('crypto');
const got = require('got');
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


function respond(responseUrl, message) {
    return got.post(responseUrl, {
        timeout: 5000,
        // For some reason sending a `application/x-www-form-urlencoded` body to a response_url casues a 500 error in Slack
        body: JSON.stringify(message),
    })
    .then((res) => res.body)
    .then((response) => {
        if (response !== 'ok') {
            console.error(response);
        }
    }, (error) => console.error(error));
}
exports.respond = respond;
