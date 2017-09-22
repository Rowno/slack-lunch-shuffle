'use strict'
const config = require('./config')
const copy = require('./copy')
const Shuffle = require('./schema').Shuffle
const Team = require('./schema').Team
const updateShuffleMessage = require('./util').updateShuffleMessage

/**
 * Adds a user to a channel's shuffle.
 * @param  {strng} teamId
 * @param  {string} channelId
 * @param  {object} user Object that contains the user's id and name.
 */
function joinShuffle(teamId, channelId, user) {
  Promise.all([
    Team.findById(teamId).exec(),
    Shuffle.findOne({teamId, channelId, active: true}).exec()
  ]).then(values => {
    const team = values[0]
    const shuffle = values[1]

    if (!team || !shuffle) {
      return
    }

    // User is already in the shuffle
    if (shuffle.people.find(p => p.id === user.id)) {
      return
    }

    shuffle.people.push({_id: user.id, name: user.name})
    shuffle.save()

    // Update the list of the people in the shuffle message
    updateShuffleMessage(team, shuffle)
  })
}

/**
 * Remove a user from a channel's shuffle.
 * @param  {string} teamId
 * @param  {string} channelId
 * @param  {object} user Object that contains the user's id and name.
 */
function leaveShuffle(teamId, channelId, user) {
  Promise.all([
    Team.findById(teamId).exec(),
    Shuffle.findOne({teamId, channelId, active: true}).exec()
  ]).then(values => {
    const team = values[0]
    const shuffle = values[1]
    const person = shuffle.people.id(user.id)

    if (!team || !shuffle || !person) {
      return
    }

    person.remove()
    shuffle.save()

    // Update the list of the people in the shuffle message
    updateShuffleMessage(team, shuffle)
  })
}

/**
 * Handles the /buttons endpoint
 */
async function route(ctx) {
  // For some reason Slack sends this request form encoded
  let body = ctx.request.body.payload

  if (!body) {
    ctx.response.status = 400
    return
  }

  // Protect against malformed JSON
  try {
    body = JSON.parse(body)
  } catch (err) {
    ctx.response.status = 400
    return
  }

  // Verify the request actually came from Slack
  if (body.token !== config.get('slack:verification')) {
    ctx.response.status = 401
    return
  }

  const callback = body.callback_id
  const action = body.actions[0].name
  const teamId = body.team.id
  const channelId = body.channel.id
  const user = body.user

  if (callback === 'start' && action === 'join') {
    ctx.body = ''
    joinShuffle(teamId, channelId, user)
  } else if (callback === 'start' && action === 'leave') {
    ctx.body = ''
    leaveShuffle(teamId, channelId, user)
  } else {
    ctx.body = {
      replace_original: false, // eslint-disable-line camelcase
      text: copy.noopButton
    }
  }
}

module.exports = route
