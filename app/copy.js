/* eslint-disable camelcase */
'use strict'
const config = require('./config')

module.exports = {
  startMessageText: 'Would you like to join the Friday Lunch Shuffle?',
  startMessageButtons: [{
    fallback: 'Your current Slack client doesn’t support Lunch Shuffle. 😞',
    callback_id: 'start',
    actions: [{
      name: 'join',
      text: 'Join',
      type: 'button',
      style: 'primary'
    }, {
      name: 'leave',
      text: 'Leave',
      type: 'button',
      style: 'danger'
    }]
  }],
  startMessageAttachments: [{
    mrkdwn_in: ['text'],
    title: 'What’s the Friday Lunch Shuffle?',
    text: `
When you opt-in to the Friday Lunch Shuffle your name goes into a virtual hat with everybody else who signs up that day, and just before All-Hands your name will be pulled along with three other names...

The four of you go on to have a great time at lunch together! Boom!

“Google’s People Operations department has scrutinized how frequently particular people eat together (the most productive employees tend to build larger networks by rotating dining companions)“ - <http://www.nytimes.com/2016/02/28/magazine/what-google-learned-from-its-quest-to-build-the-perfect-team.html|NYTimes - What Google Learned From Its Quest to Build the Perfect Team>

*Where do we eat?*
Wherever you decide! Eat out, or order in. The world is your oyster. If you're into those...

*How do I know what group I'm in?*
I'll send you a message on Slack prior to All Hands.

*Will it be swank and chill?*
Try it!`
  }, {
    fallback: 'Everybody shuffling!',
    image_url: `${config.get('baseurl')}/images/shuffle.gif`
  }],
  notSetup: 'Sorry, it looks your team isn’t setup on Lunch Shuffle.',
  alreadyActiveInChannel: 'There’s already a lunch shuffle running in this channel.',
  noShuffleActiveInChannel: 'There’s no shuffle running in this channel.',
  noopButton: 'Oops, it looks like this button does nothing! 😅',
  invalidSubcommand: 'Sorry, I didn’t recognise that subcommand. Valid subcommands are `start`, `finish` and `cancel`.',
  groupChatMessageText: 'Here’s your Friday Lunch Shuffle group! Enjoy!',
  cancelledMessageText: 'Sorry, today’s Lunch Shuffle was cancelled. 😞'
}
