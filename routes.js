import express from 'express';
import fetch from 'node-fetch'; 
import mongoose from 'mongoose';
import crypto from 'crypto';

const router = express.Router();

// database credentials
const mongo_db_name = process.env.MONGO_DB_NAME;
const mongo_db_user = process.env.MONGO_DB_USER;
const mongo_db_password = process.env.MONGO_DB_PASSWORD;

// database schema
const eventSchema = new mongoose.Schema({any: {}});
const keySchema = new mongoose.Schema({structure: String, secret_key: String, public_key: String});

// database model
const Event = mongoose.model('Event', eventSchema);
const Key = mongoose.model('Key', keySchema);

// initialize database connection
mongoose.connect(`mongodb+srv://${mongo_db_user}:${mongo_db_password}@cluster0.3gcos.mongodb.net/${mongo_db_name}?authSource=admin&replicaSet=atlas-h15pmt-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true`, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true});

// connection object
const db = mongoose.connection;

// fires on database connection error
db.on('error', console.error.bind(console, 'connection error:'));

// fires on successful database connection
db.once('open', function() { console.log(`Connected to mongodb+srv://${mongo_db_user}:*****@cluster0.3.gcos.mongodb.net/${mongo_db_name}`) });

// Render CKO Test Harness homepage
router.get('/', (req, res) => {
  res.render('index');
});

// Render Frames page
router.get('/frames', (req, res) => {
  res.render('frames', {key: process.env.CKO_PUBLIC_KEY});
  //res.render('frames', {key: process.env.CKO_NAS_PUBLIC_KEY});
});

// Event notification listener
router.post('/event-listener/:accountStructure', (req, res) => {

  console.log(`received ${req.params.accountStructure} event notification...`);
  console.log(req.headers);
  console.log(req.body);

  // Verify authenticity of CKO event notification

  const server_signature = req.header('cko-signature'); // the cko-signature header
  const stringified_body = JSON.stringify(req.body); // the request body
  
  const hmac_password = req.params.accountStructure === 'abc' ? process.env.CKO_SECRET_KEY : process.env.CKO_NAS_SECRET_KEY;

  const client_signature = crypto.createHmac('sha256', hmac_password)
    .update(stringified_body)
    .digest('hex');

  // if signature matches, write event to DB
  if(server_signature === client_signature){

    console.log('signature match...');

    const event = new Event({any: {path: req.path, headers: req.headers, body: req.body}});

    event.save(function (err, event) {
      if(err) {
        res.status(500).end();
        return console.error(err);
      }
      console.log('wrote event to database...');
      res.status(200).end();
    });

  }
  else{
    console.log('signature mismatch...');
  }

});

router.get('/events', (req, res) => {
  res.render('events');
});

router.get('/keys', (req, res) => {
  res.render('keys');
});

router.get('/pan-generator', (req, res) => {
  res.render('pan-generator');
});

// Return events
router.post('/fetch-events', (req, res) => {

  // console.log('request received @ /fetch-events');
  
  Event.find(function (err, events) {
    if (err) return console.error(err);
    // console.log(events);
    // console.log('sending response from /fetch-events');
    res.status(200).json(events);
  }).sort({_id: -1});

});

// REST API listens for async fetch() requests from client browser & invokes CKO API
router.post('/fetch-api-request', async (req, res) => {

  // default key to sk, reassign to pk for /tokens endpoint only
  let key = process.env.CKO_SECRET_KEY;
  if(req.body.path === '/tokens')
    key = process.env.CKO_PUBLIC_KEY;

  const data = {
    method: req.body.verb,
    headers: {
      'Authorization': key,
      'Content-Type': 'application/json'
    },
    body: req.body.verb === 'GET' ? null : JSON.stringify(req.body.body)
  }

  try {
    // Invoke HTTP request to CKO REST API
    const response = await fetch(`${req.body.domain}${req.body.path}`, data);

    // Parse and handle reply from CKO REST API
    if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')){
      const body = await response.json();
      res.send({status: response.status, statusText: response.statusText, body: body});        
    }
    else{
      res.send({status: response.status, statusText: response.statusText, body: {}});   
    }
  }
  catch (error) {
    console.error('status: exception');
    console.error(`error: ${error}`);
    res.send({status: 'exception', body: error});
  }
});

export {router};