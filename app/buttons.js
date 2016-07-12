'use strict';
const config = require('./config');


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

    const callback = body.callback_id;
    const action = body.actions[0].name;

    if (callback === 'join' && action === 'yes') {
        this.body = {
            replace_original: false,
            text: "Sweet, you've been added! 😃",
        };
    } else if (callback === 'join' && action === 'no') {
        this.body = {
            replace_original: false,
            text: "We're missing you already... 😞",
        };
    } else {
        this.body = {
            replace_original: false,
            text: 'Something strange just happened...',
        };
    }
}

module.exports = route;
