'use strict';
const got = require('got');
const pluralize = require('pluralize');
const config = require('./config');
const copy = require('./copy');
const Shuffle = require('./schema').Shuffle;
const Team = require('./schema').Team;


function updateShuffleMessage(team, shuffle) {
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

        text = `${copy.startMessageText} ${names} ${pluralize('has', shuffle.people.length)} already joined!`;
    }

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


function joinShuffle(teamId, channelId, user) {
    Promise.all([
        Team.findById(teamId).exec(),
        Shuffle.findOne({ teamId, channelId, active: true }).exec(),
    ]).then((values) => {
        const team = values[0];
        const shuffle = values[1];

        if (!team || !shuffle) {
            return;
        }

        // User is already in the shuffle
        if (shuffle.people.find((p) => p.id === user.id)) {
            return;
        }

        shuffle.people.push({ _id: user.id, name: user.name });
        shuffle.save();

        updateShuffleMessage(team, shuffle);
    });
}


function leaveShuffle(teamId, channelId, user) {
    Promise.all([
        Team.findById(teamId).exec(),
        Shuffle.findOne({ teamId, channelId, active: true }).exec(),
    ]).then((values) => {
        const team = values[0];
        const shuffle = values[1];

        if (!team || !shuffle) {
            return;
        }

        shuffle.people.id(user.id).remove();
        shuffle.save();

        updateShuffleMessage(team, shuffle);
    });
}


function *route() {
    let body = this.request.body.payload;

    if (!body) {
        this.response.status = 400;
        return;
    }

    body = JSON.parse(body);

    if (body.token !== config.SLACK_VERIFICATION_TOKEN) {
        this.response.status = 401;
        return;
    }

    const callback = body.callback_id;
    const action = body.actions[0].name;
    const teamId = body.team.id;
    const channelId = body.channel.id;
    const user = body.user;

    if (callback === 'start' && action === 'join') {
        this.body = '';
        joinShuffle(teamId, channelId, user);
    } else if (callback === 'start' && action === 'leave') {
        this.body = '';
        leaveShuffle(teamId, channelId, user);
    } else {
        this.body = {
            replace_original: false,
            text: copy.noopButton,
        };
    }
}

module.exports = route;
