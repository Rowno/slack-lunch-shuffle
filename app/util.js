'use strict';
const crypto = require('crypto');
const got = require('got');
const pluralize = require('pluralize');
const config = require('./config');
const copy = require('./copy');


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
    if (password === config.get('password')) {
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


function updateShuffleMessage(team, shuffle, finished) {
    let text = copy.startMessageText;

    if (shuffle.people.length > 0) {
        let names = shuffle.people.map((person) => `@${person.name}`);

        // Add 'and' between the last two names
        if (names.length > 1) {
            const last = names.pop();
            const secondToLast = names.pop();
            const lastTwo = `${secondToLast} and ${last}`;
            names.push(lastTwo);
        }

        names = names.join(', ');

        if (finished) {
            text = `${names} shuffled!`;
        } else {
            text = `${copy.startMessageText} ${names} ${pluralize('has', shuffle.people.length)} already joined!`;
        }
    }

    const attachments = finished ? JSON.stringify(copy.startMessageAttachments) : null;

    got.post('https://slack.com/api/chat.update', {
        json: true,
        timeout: 5000,
        body: {
            token: team.botAccessToken,
            ts: shuffle.messageTimestamp,
            channel: shuffle.channelId,
            parse: 'full',
            link_names: 1,
            text,
            attachments,
        },
    })
    .then((res) => res.body)
    .then((response) => {
        if (response.warning) {
            console.error(response.warning);
        }

        if (!response.ok) {
            console.error(response.error);
            return;
        }
    }, (error) => console.error(error));
}
exports.updateShuffleMessage = updateShuffleMessage;
