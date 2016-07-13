'use strict';

module.exports = {
    joinMessageText: "Would you like to join today's Lunch Shuffle?",
    joinMessageButtons: [{
        fallback: "Your current Slack client doesn't support Lunch Shuffle.",
        callback_id: 'join',
        actions: [{
            name: 'yes',
            text: 'Yes!',
            type: 'button',
            style: 'primary',
        }]
    }],
    leaveMessageText: 'Let me know if you change your mind so I can keep the groups even.',
    leaveMessageButtons: [{
        fallback: "Your current Slack client doesn't support Lunch Shuffle.",
        callback_id: 'leave',
        actions: [{
            name: 'yes',
            text: "I can't make it",
            type: 'button',
            style: 'danger',
        }]
    }],
    notSetup: "Sorry, it looks your team isn't setup on Lunch Shuffle.",
    alreadyActiveInChannel: "There's already a lunch shuffle running in this channel.",
    noopButton: 'Oops, it looks like this button does nothing! 😅',
    leaveSuccessMessage: "You've been removed from the lunch shuffle, your colleagues miss you already. 😞",
};
