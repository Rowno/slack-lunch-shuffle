'use strict'
const got = require('got')
const config = require('./config')
const copy = require('./copy')
const util = require('./util')
const Team = require('./schema').Team
const Shuffle = require('./schema').Shuffle

/**
 * Starts a shuffle in a channel.
 * @param  {string} teamId
 * @param  {string} channelId
 * @param  {string} responseUrl Slack Command/Button response_url.
 */
function startShuffle(teamId, channelId, responseUrl) {
  Promise.all([
    Team.findById(teamId).exec(),
    Shuffle.findOne({teamId, channelId, active: true}).exec()
  ]).then(values => {
    const team = values[0]
    const currentShuffle = values[1]

    if (!team) {
      util.respond(responseUrl, {text: copy.notSetup})
      return
    }

    if (currentShuffle) {
      util.respond(responseUrl, {text: copy.alreadyActiveInChannel})
      return
    }

    const attachments = copy.startMessageButtons.concat(copy.startMessageAttachments)

    // Post lunch shuffle message to channel
    got.post('https://slack.com/api/chat.postMessage', {
      json: true,
      timeout: 5000,
      body: {
        token: team.botAccessToken,
        channel: channelId,
        text: copy.startMessageText,
        attachments: JSON.stringify(attachments) // Slack requires them to be JSON encoded
      }
    })
    .then(res => res.body)
    .then(response => {
      if (response.warning) {
        util.log('warn', new Error(response.warning))
      }

      if (!response.ok) {
        util.log('error', new Error(response.error))
        return
      }

        // Save the shuffle with the message timestamp so it can be dynamically updated later
      const shuffle = new Shuffle({
        teamId: team.id,
        channelId,
        messageTimestamp: response.ts
      })

      shuffle.save()
    }, error => util.log('error', error))
  })
}

/**
 * Opens a private group chat with users and posts an explaination message.
 * @param  {Team} team Mongoose Team object.
 * @param  {array<Person>} users Array of Mongoose Person objects.
 */
function openGroupChat(team, users) {
  // Opens the group chat
  return got.post('https://slack.com/api/mpim.open', {
    json: true,
    timeout: 5000,
    body: {
      token: team.botAccessToken,
      users: users.map(user => user.id).join(',')
    }
  })
  .then(res => res.body)
  .then(response => {
    if (response.warning) {
      util.log('warn', new Error(response.warning))
    }

    if (!response.ok) {
      throw new Error(response.error)
    }

    // Post the explaination message into the group chat
    return got.post('https://slack.com/api/chat.postMessage', {
      json: true,
      timeout: 5000,
      body: {
        token: team.botAccessToken,
        channel: response.group.id,
        text: copy.groupChatMessageText
      }
    })
  })
  .then(res => res.body)
  .then(response => {
    if (response.warning) {
      util.log('warn', new Error(response.warning))
    }

    if (!response.ok) {
      throw new Error(response.error)
    }
  })
  .catch(err => util.log('error', err))
}

/**
 * Closes the currently active shuffle in the channel and randomly puts everyone into their lunch groups.
 * @param  {string} teamId
 * @param  {string} channelId
 * @param  {string} responseUrl Slack Command/Button response_url.
 */
function finishShuffle(teamId, channelId, responseUrl) {
  Promise.all([
    Team.findById(teamId).exec(),
    Shuffle.findOne({teamId, channelId, active: true}).exec()
  ]).then(values => {
    const team = values[0]
    const shuffle = values[1]

    if (!team) {
      util.respond(responseUrl, {text: copy.notSetup})
      return
    }

    if (!shuffle) {
      util.respond(responseUrl, {text: copy.noShuffleActiveInChannel})
      return
    }

    // You can only open a group chat with 2 people or more!
    if (shuffle.people.length > 1) {
      const groups = util.generateRandomGroups(shuffle.people)

      // Open a private chat for each group
      for (const group of groups) {
        openGroupChat(team, group)
        // Keep a record of the generated groups for debugging purposes
        shuffle.groups.push(group.map(person => person.name).join(','))
      }
    }

    // Close off the shuffle
    shuffle.active = false
    shuffle.save()

    // Remove the join message and interactive buttons from the shuffle message
    util.updateShuffleMessage(team, shuffle)
  })
}

/**
 * Cancels the currently active shuffle in the channel.
 * @param  {string} teamId
 * @param  {string} channelId
 * @param  {string} responseUrl Slack Command/Button response_url.
 */
function cancelShuffle(teamId, channelId, responseUrl) {
  Promise.all([
    Team.findById(teamId).exec(),
    Shuffle.findOne({teamId, channelId, active: true}).exec()
  ]).then(values => {
    const team = values[0]
    const shuffle = values[1]

    if (!team) {
      util.respond(responseUrl, {text: copy.notSetup})
      return
    }

    if (!shuffle) {
      util.respond(responseUrl, {text: copy.noShuffleActiveInChannel})
      return
    }

    // Cancel the shuffle
    shuffle.active = false
    shuffle.cancelled = true
    shuffle.save()

    // Remove the join message and interactive buttons from the shuffle message
    util.updateShuffleMessage(team, shuffle)
  })
}

/**
 * Handles the /command endpoint.
 */
async function route(ctx) {
  // Verify the request actually came from Slack
  if (ctx.request.body.token !== config.get('slack:verification')) {
    ctx.response.status = 401
    return
  }

  const subcommand = ctx.request.body.text
  const teamId = ctx.request.body.team_id
  const channelId = ctx.request.body.channel_id
  const responseUrl = ctx.request.body.response_url

  if (subcommand === 'start') {
    ctx.body = ''
    startShuffle(teamId, channelId, responseUrl)
  } else if (subcommand === 'finish') {
    ctx.body = ''
    finishShuffle(teamId, channelId, responseUrl)
  } else if (subcommand === 'cancel') {
    ctx.body = ''
    cancelShuffle(teamId, channelId, responseUrl)
  } else {
    ctx.body = copy.invalidSubcommand
  }
}

module.exports = route
