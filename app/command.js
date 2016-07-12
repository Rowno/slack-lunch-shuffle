'use strict';
const got = require('got');
const config = require('./config');


function start(url) {
    return got.post(url, {
        timeout: 5000,
        body: JSON.stringify({
            response_type: 'in_channel',
            text: "Would you like to join today's Lunch Shuffle?",
            attachments: [{
                fallback: "You're unable to join the lunch shuffle",
                callback_id: 'join',
                actions: [{
                    name: 'yes',
                    text: 'Yes! 😎',
                    type: 'button',
                    style: 'primary',
                }, {
                    name: 'no',
                    text: 'No 😞',
                    type: 'button',
                    style: 'danger',
                    confirm: {
                        title: 'Are you sure?',
                        text: 'Your awesome colleagues will be disappointed...',
                        ok_text: 'Yes',
                        dismiss_text: 'No',
                    }
                }]
            }]
        }),
    }).then((response) => {
        console.log(response.body);
    }, (error) => {
        console.error(error);
    });
}

function *route() {
    if (this.request.body.token !== config.SLACK_VERIFICATION_TOKEN) {
        this.response.status = 401;
        return;
    }

    const subcommand = this.request.body.text;

    console.log(this.request.body);

    if (subcommand === 'start') {
        this.body = '';
        start(this.request.body.response_url);
    } else if (subcommand === 'cancel') {
        this.body = 'Cancelling the lunch shuffle...';
    } else {
        this.body = "Sorry, I didn't recognise that subcommand. Valid subcommands are `start` and `cancel`.";
    }
}

module.exports = route;
