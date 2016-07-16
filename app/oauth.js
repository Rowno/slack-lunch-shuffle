'use strict';
const got = require('got');
const config = require('./config');
const util = require('./util');
const Team = require('./schema').Team;


/**
 * Handles the /oauth page
 */
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
                client_id: config.get('slack:id'),
                client_secret: config.get('slack:secret'),
                code,
            },
        })
        // Normalise the response object
        .then((res) => res.body)
        .catch((error) => ({ ok: false, error }));

        if (response.warning) {
            console.error(response.warning);
        }

        if (response.ok) {
            // Add or update the team
            yield Team.findByIdAndUpdate(
                response.team_id, {
                    _id: response.team_id,
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

    yield this.render('oauth');
}

module.exports = route;
