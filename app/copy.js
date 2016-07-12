'use strict';

module.exports = {
    joinMessageText: "Would you like to join today's Lunch Shuffle?",
    joinMessageButtons: [{
        fallback: "You're unable to join the lunch shuffle",
        callback_id: 'join',
        actions: [{
            name: 'yes',
            text: 'Yes!',
            type: 'button',
            style: 'primary',
        }]
    }],
    notSetup: "Sorry, it looks your team isn't setup on Lunch Shuffle.",
    alreadyActiveInChannel: "There's already a lunch shuffle running in this channel.",
    noopButton: 'Oops, it looks like this button does nothing! 😅',
    noShuffleActive: "There doesn't seem to be lunch shuffle running in this channel. 😕",
    alreadyInShuffle: "You're already in the lunch shuffle!",
    addedToShuffle: "Sweet, you've been added to the lunch shuffle! 😎",
};
