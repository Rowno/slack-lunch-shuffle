'use strict';
const got = require('got');
const config = require('./config');
const util = require('./util');
const Team = require('./schema').Team;


function *route() {
    yield util.login(this.state, this.session);
    const code = this.request.query.code;
    const oauthKey = this.request.query.state;

    // If you don't have all these things you probably shouldn't be here
    if (!this.state.loggedIn ||
        !this.state.oauthKey ||
        !oauthKey ||
        !code) {

        return this.redirect('/');
    }

    this.state.success = false;

    // Check that the oauth request is legit using the oauthKey generated on login
    if (oauthKey === this.state.oauthKey) {
        // Get the access token
        const response = yield got('https://slack.com/api/oauth.access', {
            json: true,
            timeout: 5000,
            query: {
                client_id: config.SLACK_CLIENT_ID,
                client_secret: config.SLACK_CLIENT_SECRET,
                code,
            },
        })
        // Normalise the response object
        .then((res) => res.body)
        .catch((error) => ({ ok: false, error }));

        if (response.ok) {
            // Save/update the team info and access tokens
            yield Team.findOneAndUpdate(
                {}, {
                    id: response.team_id,
                    name: response.team_name,
                    accessToken: response.access_token,
                    botUserId: response.bot.bot_user_id,
                    botAccessToken: response.bot.bot_access_token,
                }, {
                    upsert: true
                }
            ).exec();

            this.state.success = true;
        } else {
            console.error(response.error);
        }
    }

    return yield this.render('oauth');
}

module.exports = route;
