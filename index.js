var express = require('express');
var cors = require('cors');
var compression = require('compression');

var config = require('./config.json');
var db = require('./database.js');

var app = express();
app.use(compression());
app.use(express.json());
app.use(cors());

/* API setup */

var utils = require('./api/utils.js');
app.get('/utils/ping', utils.ping);
app.post('/utils/ping', utils.ping);
app.put('/utils/ping', utils.ping);
app.delete('/utils/ping', utils.ping);

var canvas = require('./api/canvas.js');
app.get('/canvas/list', canvas.list);
app.get('/canvas/fetch/:id', canvas.fetch);
app.get('/canvas/history/:id/:offset', canvas.history);

var auth = require('./api/auth.js');
app.put('/auth/login', auth.login);

let listen_port = process.env.PORT || config.fallback_port;
app.listen(listen_port, function() {
    console.log('Listening on port', listen_port);
});