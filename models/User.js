const mongoose = require('mongoose');

//user model
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    follow :[
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }
    ],
    followi :[
      {
          user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User'
          }
      }
    ],
    followers:{
        type: String
    },
    followings:{
        type: String
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = User = mongoose.model('User', UserSchema);
