var template = require('./template.js');
var config = require('../config.json');
var db = require('../database.js');
var crypto = require('node:crypto');

module.exports = {
    login: function(req, resp) {
        if(req.body.user === undefined || req.body.password === undefined)
            resp.status(400).send(template(null, 'Insufficient credentials'));
        let user = req.body.user; // user name or email
        let password = crypto.createHash('sha256').update(req.body.password).digest('hex');
        console.log(user, password);
        
        /* retrieve user id and match password */
        db.query("SELECT user_id AS id, pswd_hash AS password FROM " + config.database.prefix + "users WHERE user_name = '" + user + "' OR email = '" + user.toLowerCase() + "'", function(u_err, u_result, u_fields) {
            if(u_err) resp.status(500).send(template(null, u_err + ''));
            else if(u_result.length == 0 || u_result[0].password != password) resp.status(400).send(template(null, 'Invalid credentials'));
            else {
                /* valid credentials, so let's create a token */
                var uuid = ''; // will be populated
                function handle_token_search() {
                    var uuid = crypto.randomUUID();
                    console.log('Searching for existing token', uuid);
                    /* check if UUID already exists */
                    db.query("SELECT auth_id FROM " + config.database.prefix + "auth WHERE auth_id = '" + uuid + "'", function(s_err, s_result, s_fields) {
                        if(s_err) resp.status(500).send(template(null, s_err + ''));
                        else if(s_result.length > 0) handle_token_search();
                        else {
                            /* jackpot! */
                            console.log('Searching completed');
                            let ua = req.get('User-Agent') || '';
                            db.query("INSERT INTO " + config.database.prefix + "auth (auth_id, user_id, ip, user_agent) VALUES ('" + uuid + "', " + u_result[0].id + ", '" + req.ip + "', '" + ua.substring(0, 256) + "')", function(i_err, i_result, i_fields) {
                                if(i_err) resp.status(500).send(template(null, i_err + ''));
                                else resp.send(template({
                                    "token": uuid
                                }));
                            });
                        }
                    });
                }
                handle_token_search();
            }
        });
    }
};