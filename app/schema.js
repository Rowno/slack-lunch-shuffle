'use strict'
const mongoose = require('mongoose')

const Schema = mongoose.Schema

const TeamSchema = new Schema({
  _id: {type: String, required: true},
  name: {type: String},
  accessToken: {type: String, required: true},
  botUserId: {type: String, required: true},
  botAccessToken: {type: String, required: true}
}, {
  _id: false,
  timestamps: true // Automatically set createdAt and updatedAt fields
})

exports.Team = mongoose.model('Team', TeamSchema)

const PersonSchema = new Schema({
  _id: {type: String, required: true},
  name: {type: String, required: true}
}, {
  _id: false
})

const ShuffleSchema = new Schema({
  teamId: {type: String, required: true},
  channelId: {type: String, required: true},
  active: {type: Boolean, required: true, default: true},
  cancelled: {type: Boolean, required: true, default: false},
  messageTimestamp: {type: String, required: true},
  people: [PersonSchema],
  groups: [{type: String}]
}, {
  timestamps: true
})

exports.Shuffle = mongoose.model('Shuffle', ShuffleSchema)
