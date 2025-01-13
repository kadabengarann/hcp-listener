// Install dependencies first:
// npm install express body-parser socket.io

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 80;
let isListening = false;

// Middleware to parse JSON data
app.use(bodyParser.json());

// Serve a simple UI
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Listener</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f0f0f0; padding: 20px; }
        button { padding: 10px 20px; margin: 5px; }
        #events { margin-top: 20px; background-color: #fff; padding: 10px; border-radius: 5px; max-height: 400px; overflow-y: auto; }
      </style>
    </head>
    <body>
      <h1>Event Listener Server</h1>
      <button onclick="startServer()">Start Listening</button>
      <button onclick="stopServer()">Stop Listening</button>
      <div id="status">Status: <strong>Stopped</strong></div>
      <div id="events">
        <h2>Received Events</h2>
        <ul id="eventList"></ul>
      </div>
      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();

        function startServer() {
          fetch('/start').then(res => res.text()).then(msg => alert(msg));
        }
        function stopServer() {
          fetch('/stop').then(res => res.text()).then(msg => alert(msg));
        }

        socket.on('status', status => {
          document.getElementById('status').innerHTML = 'Status: <strong>' + status + '</strong>';
        });

        socket.on('event', event => {
          const li = document.createElement('li');
          li.textContent = JSON.stringify(event, null, 2);
          document.getElementById('eventList').prepend(li);
        });
      </script>
    </body>
    </html>
  `);
});

// Start listening for event notifications on any endpoint
app.post('*', (req, res) => {
  if (!isListening) {
    return res.status(403).send('Server is not listening for events.');
  }
  console.log(`Received Event on ${req.path}:`, req.body);
  io.emit('event', { path: req.path, data: req.body });
  res.status(200).send('Success');
});

// Start listening
app.get('/start', (req, res) => {
  if (!isListening) {
    isListening = true;
    io.emit('status', 'Listening');
    res.send('Server started listening for events.');
  } else {
    res.send('Server is already listening.');
  }
});

// Stop listening
app.get('/stop', (req, res) => {
  if (isListening) {
    isListening = false;
    io.emit('status', 'Stopped');
    res.send('Server stopped listening for events.');
  } else {
    res.send('Server is already stopped.');
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
