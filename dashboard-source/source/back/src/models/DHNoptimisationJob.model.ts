// models/Job.js

const mongoose = require("mongoose");

const DHNoptimisationJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  status: {
    type: String,
    enum: ["queued", "running", "completed", "failed"],
    default: "queued"
  },

  params: {
    param1: Number,
    param2: Number,
    param3: String,
    param4: Boolean
  },

  results: {
    type: Array,
    default: []
  },

  error: String,

  submittedAt: {
    type: Date,
    default: Date.now
  },

  startedAt: Date,
  completedAt: Date
});

module.exports = mongoose.model("Job", JobSchema);