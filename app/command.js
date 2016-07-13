'use strict';
const got = require('got');
const config = require('./config');
const copy = require('./copy');
const Team = require('./schema').Team;
const Shuffle = require('./schema').Shuffle;


function startShuffle(team, channelId) {
    got.post('https://slack.com/api/chat.postMessage', {
        json: true,
        timeout: 5000,
        body: {
            token: team.botAccessToken,
            channel: channelId,
            text: copy.joinMessageText,
            attachments: JSON.stringify(copy.joinMessageButtons)
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
}


function *route() {
    if (this.request.body.token !== config.SLACK_VERIFICATION_TOKEN) {
        this.response.status = 401;
        return;
    }

    const teamId = this.request.body.team_id;
    const channelId = this.request.body.channel_id;

    yield Promise.all([
        Team.findById(teamId).exec(),
        Shuffle.findOne({ teamId, channelId, active: true }).exec(),
    ]).then((values) => {
        const team = values[0];
        const shuffle = values[1];

        if (!team) {
            this.body = copy.notSetup;
            return;
        }

        if (shuffle) {
            this.body = copy.alreadyActiveInChannel;
            return;
        }

        this.body = '';
        startShuffle(team, channelId);
    });
}

module.exports = route;
