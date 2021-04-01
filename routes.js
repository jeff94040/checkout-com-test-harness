import express from 'express';
import fs from 'fs';
import fetch from 'node-fetch'; 

const router = express.Router();

const keys = JSON.parse(fs.readFileSync('./keys.json'));
const webhookNotifications = './webhook-notifications.log';

// Render CKO Test Harness homepage
router.get('/', (req, res) => {
  res.render('index');
});

// Render Frames page
router.get('/frames', (req, res) => {
  res.render('frames');
});

// Webhook notification listener
router.post('/webhook-listener', (req, res) => {
  fs.appendFile(webhookNotifications, JSON.stringify(req.body), (err) => {
    if(err) {
      res.status(500).end();
      throw err;
    }
    res.status(200).end();
  });

});

// Return webhook notifications
router.get('/webhook-notifications', (req, res) => {
  
  const events = fs.readFileSync(webhookNotifications, {encoding: 'utf-8'});

  res.render('webhook-notifications', {events: events});

});

// REST API listens for async fetch() requests from client browser & invokes CKO API
router.post('/fetch-api-request', async (req, res) => {

  let key;
  if(req.body.path === '/payment-links' || req.body.path === '/hosted-payments')
    key = keys.hpp.secret;
  else if(req.body.path === '/tokens')
    key = keys.hpp.public;
  else
    key = keys.frames.secret;

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
    if (response.headers.get('Content-Length') === '0'){
      res.send({status: response.status, statusText: response.statusText, body: {}});
    }
    else{
      const body = await response.json();
      res.send({status: response.status, statusText: response.statusText, body: body});     
    }
  }
  catch (error) {
    console.error('status: exception');
    console.error(`error: ${error}`);
    res.send({status: 'exception', body: error});
  }
});

export {router};