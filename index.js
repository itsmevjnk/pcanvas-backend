var cors = require('cors');
var compression = require('compression');
var cookie_parser = require('cookie-parser')

var config = require('./config.json');
var db = require('./database.js');

var express = require('express');
var app = express();
app.use(compression());
app.use(express.json());
app.use(cors({
    credentials: true,
    origin: config.cors.origin
}));
app.use(cookie_parser());

/* API setup */

var utils = require('./api/utils.js');
app.get('/utils/ping', utils.ping);
app.post('/utils/ping', utils.ping);
app.put('/utils/ping', utils.ping);
app.delete('/utils/ping', utils.ping);

var canvas = require('./api/canvas.js');
app.get('/canvas/list', canvas.list);
app.get('/canvas/info', canvas.info);
app.get('/canvas/:id/info', canvas.info);
app.get('/canvas/:id/fetch', canvas.fetch);
app.get('/canvas/:id/history/:offset', canvas.history);
app.get('/canvas/:id/cooldown', canvas.cooldown);
app.put('/canvas/:id/place', canvas.place);

var auth = require('./api/auth.js');
app.put('/auth/login', auth.login);
app.post('/auth/register', auth.register);
app.get('/auth/query', auth.query); // using ID in cookies
app.get('/auth/query/:id', auth.query); // using externally supplied ID
app.get('/auth/exists', auth.exists);
app.delete('/auth/logout', auth.logout);

let listen_port = process.env.PORT || config.fallback_port;
let http_server = app.listen(listen_port, function() {
    console.log('Listening on port', listen_port);
});

var io = require('socket.io')(http_server, {
    cors: {
        origin: config.cors.origin
    }
});

io.sockets.on('connection', function(client) {
    client.on('subscribe', function(canvas_id) {
        client.join(canvas_id);
        // console.log('Client joined room', canvas_id);
    });

    client.on('unsubscribe', function(canvas_id) {
        client.leave(canvas_id);
        // console.log('Client left room', canvas_id);
    });
})

exports.io = io;