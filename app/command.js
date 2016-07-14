'use strict';
const got = require('got');
const lodashShuffle = require('lodash.shuffle');
const lodashChunk = require('lodash.chunk');
const config = require('./config');
const copy = require('./copy');
const util = require('./util');
const Team = require('./schema').Team;
const Shuffle = require('./schema').Shuffle;


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

        got.post('https://slack.com/api/chat.postMessage', {
            json: true,
            timeout: 5000,
            body: {
                token: team.botAccessToken,
                channel: channelId,
                text: copy.startMessageText,
                attachments: JSON.stringify(attachments)
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

            const shuffle = new Shuffle({
                teamId: team.id,
                channelId,
                messageTimestamp: response.ts,
            });

            shuffle.save();
        }, (error) => console.error(error));
    });
}


function openGroupChat(team, users) {
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


function generateRandomGroups(items) {
    const MIN_GROUP_SIZE = 4;
    const GROUP_SIZE = 4;

    const randomItems = lodashShuffle(items);

    const remaindersNum = randomItems.length % GROUP_SIZE;
    const remainders = randomItems.splice(0, remaindersNum);

    const groups = lodashChunk(randomItems, GROUP_SIZE);

    if (remaindersNum > 0) {
        if (remaindersNum < MIN_GROUP_SIZE && groups.length > 0) {
            let groupIndex = 0;
            while (remainders.length > 0) {
                groups[groupIndex].push(remainders.pop());

                if (groupIndex < groups.length - 1) {
                    groupIndex += 1;
                } else {
                    groupIndex = 0;
                }
            }
        } else {
            groups.push(remainders);
        }
    }

    return groups;
}


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

        if (shuffle.people.length > 1) {
            const groups = generateRandomGroups(shuffle.people);

            for (const group of groups) {
                shuffle.groups.push(group.map((person) => person.name).join(','));
                openGroupChat(team, group);
            }
        }

        util.updateShuffleMessage(team, shuffle, true);

        shuffle.active = false;
        shuffle.save();
    });
}


function *route() {
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
