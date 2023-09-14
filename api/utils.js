var template = require('./template.js');

module.exports = {
    ping: function(req, resp) {
        resp.send(template({
            "ip": req.ip,
            "protocol": req.protocol,
            "url": req.originalUrl,
            "method": req.method
        }, 'pong'));
    }
};