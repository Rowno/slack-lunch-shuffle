'use strict';
const got = require('got');
const config = require('./config');
const Team = require('./schema').Team;
const Shuffle = require('./schema').Shuffle;


function startShuffle(team, channelId) {
    got.post('https://slack.com/api/chat.postMessage', {
        json: true,
        timeout: 5000,
        body: {
            token: team.botAccessToken,
            channel: channelId,
            text: "Would you like to join today's Lunch Shuffle?",
            attachments: JSON.stringify([{
                fallback: "You're unable to join the lunch shuffle",
                callback_id: 'join',
                actions: [{
                    name: 'yes',
                    text: 'Yes!',
                    type: 'button',
                    style: 'primary',
                }]
            }])
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
    })
    .catch((error) => console.error(error));
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
            this.body = "Sorry, it looks your team isn't setup on Lunch Shuffle.";
            return;
        }

        if (shuffle) {
            this.body = "There's already a lunch shuffle running in this channel.";
            return;
        }

        this.body = '';
        startShuffle(team, channelId);
    });
}

module.exports = route;
