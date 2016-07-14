'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const TeamSchema = new Schema({
    _id: { type: String, required: true },
    name: { type: String },
    accessToken: { type: String, required: true },
    botUserId: { type: String, required: true },
    botAccessToken: { type: String, required: true },
}, {
    _id: false,
    timestamps: true,
});

// Initialise the collection (table) from the schema
exports.Team = mongoose.model('Team', TeamSchema);


const PersonSchema = new Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
}, {
    _id: false
});

const ShuffleSchema = new Schema({
    teamId: { type: String, required: true },
    channelId: { type: String, required: true },
    active: { type: Boolean, required: true, default: true },
    messageTimestamp: { type: String, required: true },
    people: [PersonSchema],
    groups: [{ type: String }],
}, {
    timestamps: true, // Automatically add/update createdAt and updatedAt fields
});

// Initialise the collection (table) from the schema
exports.Shuffle = mongoose.model('Shuffle', ShuffleSchema);
