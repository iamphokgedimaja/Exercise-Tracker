const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/**set up mongo */
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

// body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


/** Model */
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    dropDups: true
  },
  log: [{
    description: {type: String, required: true, dropDups: true},
    duration: {type: Number, required: true, dropDups: true},
    date: Date
  }]
})

const User = mongoose.model('fccuser', UserSchema)

/** API's */
app.post('/api/users', (req, res) => {
  let username = req.body.username
  const user = new User({username});
  user.save().then(user => {
    res.json(user);
  }).catch(err => {
    res.json({error: 'username is taken'});
  });
});

app.get('/api/users', (req, res) => {
  User.find((err, users) => {
    res.json(users);
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const input = req.body;
  const userId = req.params._id
  if(!input.duration || !input.description){
    res.send('Fill in all the necessary fields.');
  }
  if(!input.date){
    input.date = new Date();
  }
  const date = new Date(input.date).toDateString();
  const duration = parseInt(input.duration);
  const exercise = {
    description: input.description,
    duration: duration,
    date: date
  }
  User.findByIdAndUpdate(
    userId, 
    {$push: {log: exercise}},
    (err, doc) => {
      if(err) return console.log('Error - ', err);
      res.json({
        _id: doc._id,
        username: doc.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date
      });
    });
});


app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id
  User.findById(userId).then(user => {
    const from = req.query.from;
    const to = req.query.to;
    const limit = req.query.limit;
    let filtered = null;
    if(from){
      const fromTime = new Date(from).getTime();
      if(to){
        const toTime = new Date(to).getTime();
        filtered = user.log.filter(log => new Date(log.date).getTime() >= fromTime && new Date(log.date).getTime() <toTime);
      }else{
        filtered = user.log.filter(log => new Date(log.date).getTime() >= fromTime);
      }
    }
    if(limit){
      filtered = user.log.slice(0, limit);
    }
    
    if(!filtered){
      filtered = [...user.log]
    }
    
    let logs = []
    for (let index = 0; index < filtered.length; index++) {
      let element = filtered[index];
      let newDate = element['date'].toDateString()
      let obj = {
        description: element.description,
        duration: element.duration,
        date: newDate,
        _id:element._id
      }
      logs.push(obj)
    }
    
    res.json({
      _id: user._id,
      username: user.username,
      count: user.log.length,
      log: logs
    });
  });
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
