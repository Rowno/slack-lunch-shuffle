'use strict';
const got = require('got');
const config = require('./config');
const copy = require('./copy');
const util = require('./util');
const Team = require('./schema').Team;
const Shuffle = require('./schema').Shuffle;


/**
 * Starts a shuffle in a channel.
 * @param  {string} teamId
 * @param  {string} channelId
 * @param  {string} responseUrl Slack Command/Button response_url.
 */
function startShuffle(teamId, channelId, responseUrl) {
    Promise.all([
        Team.findById(teamId).exec(),
        Shuffle.findOne({ teamId, channelId, active: true }).exec(),
    ]).then((values) => {
        const team = values[0];
        const currentShuffle = values[1];

        if (!team) {
            util.respond(responseUrl, { text: copy.notSetup });
            return;
        }

        if (currentShuffle) {
            util.respond(responseUrl, { text: copy.alreadyActiveInChannel });
            return;
        }

        const attachments = copy.startMessageButtons.concat(copy.startMessageAttachments);

        // Post lunch shuffle message to channel
        got.post('https://slack.com/api/chat.postMessage', {
            json: true,
            timeout: 5000,
            body: {
                token: team.botAccessToken,
                channel: channelId,
                text: copy.startMessageText,
                attachments: JSON.stringify(attachments) // Slack requires them to be JSON encoded
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

            // Save the shuffle with the message timestamp so it can be dynamically updated later
            const shuffle = new Shuffle({
                teamId: team.id,
                channelId,
                messageTimestamp: response.ts,
            });

            shuffle.save();
        }, (error) => console.error(error));
    });
}


/**
 * Opens a private group chat with users and posts an explaination message.
 * @param  {Team} team Mongoose Team object.
 * @param  {array<Person>} users Array of Mongoose Person objects.
 */
function openGroupChat(team, users) {
    // Opens the group chat
    return got.post('https://slack.com/api/mpim.open', {
        json: true,
        timeout: 5000,
        body: {
            token: team.botAccessToken,
            users: users.map((user) => user.id).join(',')
        },
    })
    .then((res) => res.body)
    .then((response) => {
        if (response.warning) {
            console.error(response.warning);
        }

        if (!response.ok) {
            throw new Error(response.error);
        }

        // Post the explaination message into the group chat
        return got.post('https://slack.com/api/chat.postMessage', {
            json: true,
            timeout: 5000,
            body: {
                token: team.botAccessToken,
                channel: response.group.id,
                text: copy.groupChatMessageText,
            },
        });
    })
    .then((res) => res.body)
    .then((response) => {
        if (response.warning) {
            console.error(response.warning);
        }

        if (!response.ok) {
            throw new Error(response.error);
        }
    })
    .catch((error) => console.error(error));
}


/**
 * Closes the currently active shuffle in the channel and randomly puts everyone into their lunch groups.
 * @param  {string} teamId
 * @param  {string} channelId
 * @param  {string} responseUrl Slack Command/Button response_url.
 */
function finishShuffle(teamId, channelId, responseUrl) {
    Promise.all([
        Team.findById(teamId).exec(),
        Shuffle.findOne({ teamId, channelId, active: true }).exec(),
    ]).then((values) => {
        const team = values[0];
        const shuffle = values[1];

        if (!team) {
            util.respond(responseUrl, { text: copy.notSetup });
            return;
        }

        if (!shuffle) {
            util.respond(responseUrl, { text: copy.noShuffleActiveInChannel });
            return;
        }

        // You can only open a group chat with 2 people or more!
        if (shuffle.people.length > 1) {
            const groups = util.generateRandomGroups(shuffle.people);

            // Open a private chat for each group
            for (const group of groups) {
                openGroupChat(team, group);
                // Keep a record of the generated groups for debugging purposes
                shuffle.groups.push(group.map((person) => person.name).join(','));
            }
        }

        // Remove the join message and interactive buttons from the shuffle message
        util.updateShuffleMessage(team, shuffle, true);

        // Close off the shuffle
        shuffle.active = false;
        shuffle.save();
    });
}


/**
 * Handles the /command endpoint.
 */
function *route() {
    // Verify the request actually came from Slack
    if (this.request.body.token !== config.get('slack:verification')) {
        this.response.status = 401;
        return;
    }

    const subcommand = this.request.body.text;
    const teamId = this.request.body.team_id;
    const channelId = this.request.body.channel_id;
    const responseUrl = this.request.body.response_url;

    if (subcommand === 'start') {
        this.body = '';
        startShuffle(teamId, channelId, responseUrl);
    } else if (subcommand === 'finish') {
        this.body = '';
        finishShuffle(teamId, channelId, responseUrl);
    } else {
        this.body = copy.invalidSubcommand;
    }
}

module.exports = route;
