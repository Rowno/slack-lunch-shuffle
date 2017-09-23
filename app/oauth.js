'use strict'
const got = require('got')
const config = require('./config')
const util = require('./util')
const Team = require('./schema').Team

/**
 * Handles the /oauth page
 */
async function route(ctx) {
  await util.login(ctx.state, ctx.session)
  const code = ctx.request.query.code
  const oauthKey = ctx.request.query.state

  // If you don't have all these things you probably shouldn't be here
  if (!ctx.state.loggedIn ||
      !ctx.state.oauthKey ||
      !oauthKey ||
      !code) {
    return ctx.redirect('/')
  }

  ctx.state.success = false

  // Check that the oauth request is legit using the oauthKey generated on login
  if (oauthKey === ctx.state.oauthKey) {
    // Get the access token
    const response = await got('https://slack.com/api/oauth.access', {
      json: true,
      form: true,
      timeout: 5000,
      query: {
         /* eslint-disable camelcase */
        client_id: config.get('slack:id'),
        client_secret: config.get('slack:secret'),
        /* eslint-enable camelcase */
        code
      }
    })
    // Normalise the response object
    .then(res => res.body)
    .catch(err => ({ok: false, err}))

    if (response.warning) {
      util.log('warn', new Error(response.warning))
    }

    if (response.ok) {
      // Add or update the team
      await Team.findByIdAndUpdate(
        response.team_id, {
          _id: response.team_id,
          name: response.team_name,
          accessToken: response.access_token,
          botUserId: response.bot.bot_user_id,
          botAccessToken: response.bot.bot_access_token
        }, {
          upsert: true
        }
      ).exec()

      ctx.state.success = true
    } else {
      util.log('error', new Error(response.error))
    }
  }

  await ctx.render('oauth')
}

module.exports = route
