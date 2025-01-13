const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 80;
let isListening = false;
const EVENTS_FILE = path.join(__dirname, 'database', 'events.json');
let receivedEvents = [];

// Ensure /database folder exists
if (!fs.existsSync(path.dirname(EVENTS_FILE))) {
  fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true });
}

// Ensure events.json exists or create it
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify([]));
}

// Load existing events from file on startup
if (fs.existsSync(EVENTS_FILE)) {
  const data = fs.readFileSync(EVENTS_FILE, 'utf-8');
  try {
    receivedEvents = JSON.parse(data);
  } catch (err) {
    console.error('Failed to parse events.json:', err);
    receivedEvents = [];
  }
}

app.use(bodyParser.json());

// Function to save events to file
function saveEventsToFile() {
  fs.writeFile(EVENTS_FILE, JSON.stringify(receivedEvents, null, 2), (err) => {
    if (err) {
      console.error('Error saving events:', err);
    }
  });
}

// Serve the UI with embedded HTML and JavaScript
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
          fetch('/start').then(res => res.text()).then(alert);
        }

        function stopServer() {
          fetch('/stop').then(res => res.text()).then(alert);
        }

        socket.on('status', status => {
          document.getElementById('status').innerHTML = 'Status: <strong>' + status + '</strong>';
        });

        socket.on('event', event => {
          const li = document.createElement('li');
          li.textContent = JSON.stringify(event, null, 2);
          document.getElementById('eventList').prepend(li);
        });

        fetch('/events')
          .then(res => res.json())
          .then(events => {
            events.forEach(event => {
              const li = document.createElement('li');
              li.textContent = JSON.stringify(event, null, 2);
              document.getElementById('eventList').prepend(li);
            });
          });

        fetch('/status')
          .then(res => res.json())
          .then(data => {
            document.getElementById('status').innerHTML = 'Status: <strong>' + data.status + '</strong>';
          });
      </script>
    </body>
    </html>
  `);
});

// Endpoint to retrieve stored events
app.get('/events', (req, res) => {
  res.json(receivedEvents);
});

// Endpoint to retrieve current server status
app.get('/status', (req, res) => {
  res.json({ status: isListening ? 'Listening' : 'Stopped' });
});

// Handle event notifications on any endpoint
app.post('*', (req, res) => {
  if (!isListening) {
    return res.status(403).send('Server is not listening for events.');
  }
  const event = { path: req.path, data: req.body };
  console.log(`Received Event on ${req.path}:`, req.body);
  receivedEvents.push(event);
  saveEventsToFile();
  io.emit('event', event);
  res.status(200).send('Success');
});

// Start the listener
app.get('/start', (req, res) => {
  if (!isListening) {
    isListening = true;
    io.emit('status', 'Listening');
    res.send('Server started listening for events.');
  } else {
    res.send('Server is already listening.');
  }
});

// Stop the listener
app.get('/stop', (req, res) => {
  if (isListening) {
    isListening = false;
    io.emit('status', 'Stopped');
    res.send('Server stopped listening for events.');
  } else {
    res.send('Server is already stopped.');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost`);
});
