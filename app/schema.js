'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const TeamSchema = new Schema({
    id: { type: String },
    name: { type: String },
    accessToken: { type: String },
    botUserId: { type: String },
    botAccessToken: { type: String },
}, {
    timestamps: true, // Automatically add/update createdAt and updatedAt fields
});

// Initialise the collection (table) from the schema
exports.Team = mongoose.model('Team', TeamSchema);
