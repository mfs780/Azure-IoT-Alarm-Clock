'use strict';

import path from 'path';
import { Server } from 'http';
import Express from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { match, RouterContext } from 'react-router';
import routes from './routes';
import NotFoundPage from './components/NotFoundPage';
import { Client } from 'azure-event-hubs';
import { clientFromConnectionString } from 'azure-iot-device-http';
import { Message } from 'azure-iot-device';

// Initialize Azure
const connectionString = '<REPLACE WITH DEVICE CONNECTION ID>';
const connectionStringHub = '<REPLACE WITH HUB CONNECTION ID>';
const httpClient = clientFromConnectionString(connectionString);

// initialize the server and configure support for ejs templates
const app = new Express();
const server = new Server(app);
const io = require('socket.io')(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// define the folder that will be used for static assets
app.use(Express.static(path.join(__dirname, 'static')));

// universal routing and rendering
app.get('*', (req, res) => {
  match(
    { routes, location: req.url },
    (err, redirectLocation, renderProps) => {

      // in case of error display the error message
      if (err) {
        return res.status(500).send(err.message);
      }

      // in case of redirect propagate the redirect to the browser
      if (redirectLocation) {
        return res.redirect(302, redirectLocation.pathname + redirectLocation.search);
      }

      // generate the React markup for the current route
      let markup;
      if (renderProps) {
        // if the current route matched we have renderProps
        markup = renderToString(<RouterContext {...renderProps} />);
      } else {
        // otherwise we can render a 404 page
        markup = renderToString(<NotFoundPage />);
        res.status(404);
      }

      // render the index template with the embedded React markup
      return res.render('index', { markup });
    }
  );
});

// start the server
const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'production';
server.listen(port, err => {
  if (err) {
    return console.error(err);
  }
  console.info(`Server running on http://localhost:${port} [${env}]`);
});

io.on('connection', function (socket) {
  console.log('a user connected');
});

//Azzure HTTP Client
var connectCallback = function (err) {
  if (err) {
    console.error('Could not connect: ' + err);
  } else {
    console.log('Client connected');

    httpClient.on('message', function (msg) {
      console.log(msg);

      var msgArr = msg.data.split('=');
      var type = msgArr[0];
      var datum = msgArr[1];

      switch (type) {
        case "Set":
          io.emit('set', datum);
          break;
        case "Tweet":
          io.emit('tweet', datum);
          break;
        case "Stop":
          io.emit('stop', datum);
          break;
      }

      httpClient.complete(msg, function () {
        console.log('completed');
      });
    });
  }
};
httpClient.open(connectCallback);

var printError = function (err) {
  console.log(err.message);
};

var printMessage = function (message) {
  let msg = JSON.stringify(message.body.toString('utf8')).split('"').join('');
  console.log('Message received: ');
  console.log(msg);
  console.log('');

  var msgArr = msg.split('=');
  var type = msgArr[0];
  var datum = msgArr[1];
  console.log(type);
  console.log(datum);
  switch (type) {
    case "Set":
      io.emit('set', datum);
      break;
    case "Tweet":
      io.emit('tweet', datum);
      break;
    case "Stop":
      io.emit('stop', datum);
      break;
  }
};

var hubclient = Client.fromConnectionString(connectionStringHub);
hubclient.open()
  .then(hubclient.getPartitionIds.bind(hubclient))
  .then(function (partitionIds) {
    return partitionIds.map(function (partitionId) {
      return hubclient.createReceiver('$Default', partitionId, { 'startAfterTime': Date.now() }).then(function (receiver) {
        console.log('Created partition receiver: ' + partitionId)
        receiver.on('errorReceived', printError);
        receiver.on('message', printMessage);
      });
    });
  })
  .catch(printError);
