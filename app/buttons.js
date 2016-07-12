'use strict';
const config = require('./config');
const Shuffle = require('./schema').Shuffle;


function addToShuffle(teamId, channelId, user) {
    return Shuffle.findOne({ teamId, channelId, active: true }).exec()
    .then((shuffle) => {
        if (!shuffle) {
            return "There doesn't seem to be lunch shuffle running in this channel. 😕";
        }

        const person = shuffle.people.find((p) => p.id === user.id);
        if (person) {
            return "You're already in the lunch shuffle!";
        }

        shuffle.people.push({ _id: user.id, name: user.name });
        return shuffle.save().then(() => "Sweet, you've been added to the lunch shuffle! 😎");
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

    console.log(body);

    const teamId = body.team.id;
    const channelId = body.channel.id;
    const user = body.user;
    const callback = body.callback_id;
    const action = body.actions[0].name;

    if (callback === 'join' && action === 'yes') {
        this.body = {
            replace_original: false,
            text: yield addToShuffle(teamId, channelId, user),
        };
    } else if (callback === 'leave' && action === 'yes') {
        this.body = {
            replace_original: false,
            text: "We're missing you already... 😞",
        };
    } else {
        this.body = {
            replace_original: false,
            text: 'Oops, it looks like this button does nothing! 😅',
        };
    }
}

module.exports = route;
