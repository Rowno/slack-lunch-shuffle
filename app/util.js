'use strict';
const crypto = require('crypto');
const got = require('got');
const hardRejection = require('hard-rejection');
const lodashChunk = require('lodash.chunk');
const lodashShuffle = require('lodash.shuffle');
const pluralize = require('pluralize');
const winston = require('winston');
require('winston-loggly');
const config = require('./config');
const copy = require('./copy');


if (config.get('loggly:token') &&
    config.get('loggly:subdomain') &&
    config.get('env') === 'production') {

    winston.add(winston.transports.Loggly, {
        tags: ['lunch-shuffle', config.get('env')],
        handleExceptions: true,
        humanReadableUnhandledException: true,
        token: config.get('loggly:token'),
        subdomain: config.get('loggly:subdomain'),
        json: true,
    });
}

function log(...args) {
    winston.log(...args);
}
exports.log = log;


// Crash on unhandled Promise rejections (will become default behaviour soon https://github.com/nodejs/node/pull/6375)
hardRejection((error) => log('error', error));


/**
 * Generates 20 cryptographically random characters
 * @returns {string}
 */
function generateKey() {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(20, (error, buffer) => {
            if (error) {
                return reject(error);
            }

            return resolve(buffer.toString('hex'));
        });
    });
}
exports.generateKey = generateKey;


/**
 * Tries to log in the user to lunch shuffle
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
    state.slackId = config.get('slack:id');
}
exports.login = login;


/**
 * Sends a response message to a Slash Command or Interactive Message action
 * @param {string} responseUrl response_url
 * @param {string} message New message
 */
function respond(responseUrl, message) {
    return got.post(responseUrl, {
        timeout: 5000,
        // For some reason sending a `application/x-www-form-urlencoded` body to a response_url casues a 500 error in Slack
        body: JSON.stringify(message),
    })
    .then((res) => res.body)
    .then((response) => {
        if (response !== 'ok') {
            log('error', response);
        }
    }, (error) => log('error', error));
}
exports.respond = respond;


/**
 * Dynamically updates the original shuffle message
 * @param {Team} team
 * @param {Shuffle} shuffle
 */
function updateShuffleMessage(team, shuffle) {
    let text = copy.startMessageText;

    // List the people that have joined the shuffle
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

        if (shuffle.active) {
            text = `${copy.startMessageText} ${names} ${pluralize('has', shuffle.people.length)} already joined!`;
        } else {
            text = `${names} shuffled!`;
        }
    }

    // Remove the interactive buttons when the shuffle has finished
    const attachments = shuffle.active ? null : JSON.stringify(copy.startMessageAttachments);

    // Update the message
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
            log('warn', response.warning);
        }

        if (!response.ok) {
            log('error', response.error);
            return;
        }
    }, (error) => log('error', error));
}
exports.updateShuffleMessage = updateShuffleMessage;


/**
 * Randomly groups items into groups of the configured size
 * @param {array} items Array of things to group
 * @returns {array<array>} Array of item groups (arrays)
 */
function generateRandomGroups(items) {
    const TARGET = config.get('groupsize:target');
    const MINIMUM = config.get('groupsize:minimum');

    // Randomise the array
    const randomItems = lodashShuffle(items);

    // Remove the remainders to create even groups
    const remaindersNum = randomItems.length % TARGET;
    const remainders = randomItems.splice(0, remaindersNum);

    // Create groups
    const groups = lodashChunk(randomItems, TARGET);

    if (remaindersNum > 0) {
        // If there's less remainders than the minimum and there's at least 1 group,
        // spread the remainders evenly across the groups
        if (remaindersNum < MINIMUM && groups.length > 0) {
            let groupIndex = 0;
            while (remainders.length > 0) {
                groups[groupIndex].push(remainders.pop());

                if (groupIndex < groups.length - 1) {
                    groupIndex += 1;
                } else {
                    groupIndex = 0;
                }
            }
        // Else just create a new group from the remainders
        } else {
            groups.push(remainders);
        }
    }

    return groups;
}
exports.generateRandomGroups = generateRandomGroups;
