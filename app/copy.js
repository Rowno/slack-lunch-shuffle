'use strict';

module.exports = {
    joinMessageText: "Would you like to join today's Lunch Shuffle?",
    joinMessageButtons: [{
        fallback: "Your current Slack client doesn't support Lunch Shuffle.",
        callback_id: 'start',
        actions: [{
            name: 'join',
            text: 'Join',
            type: 'button',
            style: 'primary',
        }, {
            name: 'leave',
            text: 'Leave',
            type: 'button',
            style: 'danger',
        }]
    }],
    notSetup: "Sorry, it looks your team isn't setup on Lunch Shuffle.",
    alreadyActiveInChannel: "There's already a lunch shuffle running in this channel.",
    noopButton: 'Oops, it looks like this button does nothing! 😅',
    leaveSuccessMessage: "You've been removed from the lunch shuffle, your colleagues miss you already. 😞",
};
