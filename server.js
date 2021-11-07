require('dotenv').config();
const express= require('express');
const { MongoClient } = require('mongodb');
const mongoose= require('mongoose');
const cors= require('cors');
const dns= require('dns');
const url= require('url');

//const bodyParser = require('body-parser');
//console.log(process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

//Get the default connection
var db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const urlSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'url required']
  },
  created: {
    type: Date,
  },
  index:{
    type: Number,
  }
});

const UrlShort = mongoose.model('UrlShort', urlSchema);

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(function (req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next()
});


//app.use(bodyParser.urlencoded({ extended: false }))
const { body, validationResult } = require('express-validator');

// Basic Configuration
const port = process.env.PORT || 3000;


app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:thisIndex', (req, res) => {

  UrlShort.findOne({index : req.params.thisIndex, url : {$ne :"index"}},(err,rec) =>{
    if(rec === null)
      return res.status(422).send({"error" : "Index not found"});
    return res.redirect(301, rec.url);
  })


});

app.post('/api/shorturl',
body('url').exists().isURL(),
(req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({"error": "Invalid URL"});
  } 
  else {
    const hostname= url.parse(req.body.url).hostname;
    if(hostname){
      dns.lookup(hostname, (err,address,family) => {
        if(err){
          return res.status(422).send({"error" : "Invalid Hostname"})
        }
        const doc= UrlShort.findOneAndUpdate({url : "index"},{$inc : {index : 1}},{new : true, upsert : true},(err,rec) =>{
          if(err)
            return res.status(422).send({"error" : "DB error"})
          theIndex= Number(rec.index);
          console.log("hello",theIndex)
          UrlShort.create({ url: encodeURI(req.body.url),created : Date.now(), index : rec.index },(err, rec) => {
            if (err)
             return res.status(422).send({"error" : "Couldn't Create DB record"});
            // saved!
            const theLink= "<h3>Your link is </h3><a href=\"\/api\/shorturl\/"+ rec.index+ "\">" + req.protocol + "://" + req.headers.host + "/api/shorturl/" + rec.index + "</a>";
            res.status(201).send(theLink)
          });
        });
      });
    }
  }
});



// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
