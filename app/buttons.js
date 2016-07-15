'use strict';
const config = require('./config');
const copy = require('./copy');
const Shuffle = require('./schema').Shuffle;
const Team = require('./schema').Team;
const updateShuffleMessage = require('./util').updateShuffleMessage;


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

    // Protect against malformed JSON
    try {
        body = JSON.parse(body);
    } catch (error) {
        this.response.status = 400;
        return;
    }

    if (body.token !== config.get('slack:verification')) {
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
