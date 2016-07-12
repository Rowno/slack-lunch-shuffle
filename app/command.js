'use strict';
const config = require('./config');


function start() {
    return {
        response_type: 'in_channel',
        attachments: [
            {
                fallback: "You're unable to join the shuffle",
                text: "Would you like to join today's Lunch Shuffle?",
                callback_id: 'join',
                actions: [
                    {
                        name: 'join',
                        text: 'Yes! 😎',
                        type: 'button',
                        style: 'primary'
                    },
                    {
                        name: 'leave',
                        text: 'No 😞',
                        type: 'button',
                        style: 'danger',
                        confirm: {
                            title: 'Are you sure?',
                            text: 'Your awesome colleagues will be disappointed...',
                            ok_text: 'Yes',
                            dismiss_text: 'No'
                        }
                    }
                ]
            }
        ]
    };
}

function *route() {
    if (this.request.body.token !== config.SLACK_VERIFICATION_TOKEN) {
        this.response.status = 401;
        return;
    }

    const subcommand = this.request.body.text;

    console.log(this.request.body);

    if (subcommand === 'start') {
        this.body = start();
    } else if (subcommand === 'cancel') {
        this.body = 'Cancelling the lunch shuffle...';
    } else {
        this.body = "Sorry, I didn't recognise that subcommand. Valid subcommands are `start` and `cancel`.";
    }
}

module.exports = route;
