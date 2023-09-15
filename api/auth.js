var template = require('./template.js');
var config = require('../config.json');
var db = require('../database.js');
var crypto = require('node:crypto');

module.exports = {
    verify_login: function(cookies, callback) {
        if(cookies.id === undefined || cookies.token === undefined) callback(false);
        else db.query("SELECT user_id FROM " + config.database.prefix + "auth WHERE user_id = " + cookies.id + " AND auth_id = '" + cookies.token + "'", function(err, result, fields) {
            if(err) throw err;
            else callback((result.length > 0));
        });
    },

    login: function(req, resp) {
        if(req.body.user === undefined || req.body.password === undefined)
            resp.status(400).send(template(null, 'Insufficient credentials'));
        let user = req.body.user; // user name or email
        let password = crypto.createHash('sha256').update(req.body.password).digest('hex');
        // console.log(user, password);
        
        /* retrieve user id and match password */
        db.query("SELECT user_id AS id, user_name AS user, pswd_hash AS password, moderator FROM " + config.database.prefix + "users WHERE user_name = '" + user + "' OR email = '" + user.toLowerCase() + "'", function(u_err, u_result, u_fields) {
            if(u_err) resp.status(500).send(template(null, u_err + ''));
            else if(u_result.length == 0 || u_result[0].password != password) resp.status(403).send(template(null, 'Invalid credentials'));
            else {
                /* valid credentials, so let's create a token */
                var uuid = ''; // will be populated
                function handle_token_search() {
                    var uuid = crypto.randomUUID();
                    // console.log('Searching for existing token', uuid);
                    /* check if UUID already exists */
                    db.query("SELECT auth_id FROM " + config.database.prefix + "auth WHERE auth_id = '" + uuid + "' AND user_id = " + u_result[0].id, function(s_err, s_result, s_fields) {
                        if(s_err) resp.status(500).send(template(null, s_err + ''));
                        else if(s_result.length > 0) handle_token_search();
                        else {
                            /* jackpot! */
                            // console.log('Searching completed');
                            let ua = req.get('User-Agent') || '';
                            db.query("INSERT INTO " + config.database.prefix + "auth (auth_id, user_id, ip, user_agent) VALUES ('" + uuid + "', " + u_result[0].id + ", '" + req.ip + "', '" + ua.substring(0, 256) + "')", function(i_err, i_result, i_fields) {
                                if(i_err) resp.status(500).send(template(null, i_err + ''));
                                else resp.send(template({
                                    "token": uuid,
                                    "user": u_result[0].user,
                                    "id": u_result[0].id,
                                    "moderator": (u_result[0].moderator == 1)
                                }));
                            });
                        }
                    });
                }
                handle_token_search();
            }
        });
    },

    query: function(req, resp) {
        let id = NaN;
        if(req.params.id !== undefined) id = parseInt(req.params.id);
        else if(req.cookies.id !== undefined) id = parseInt(req.cookies.id);

        if(isNaN(id)) resp.status(400).send(template(null, 'Valid ID not given'));
        else {
            let query_str = '';
            if(req.cookies.token !== undefined && parseInt(req.cookies.id) === id)
                query_str = "SELECT user_name AS user, email, moderator, (user_id IN (SELECT user_id FROM " + config.database.prefix + "auth WHERE auth_id = '" + req.cookies.token + "')) AS login FROM " + config.database.prefix + "users WHERE user_id = " + id;
            else
                query_str = "SELECT user_name AS user, email, moderator FROM " + config.database.prefix + "users WHERE user_id = " + id;
            db.query(query_str, function(err, result, fields) {
                if(err) resp.status(500).send(template(null, s_err + ''));
                else if(result.length == 0) resp.status(404).send(template(null, 'Invalid user ID'));
                else {
                    let payload = {
                        "user": result[0].user,
                        "moderator": (result[0].moderator == 1)
                    };
                    // console.log(result[0].login)
                    if(result[0].login === 1) payload.email = result[0].email;
                    resp.send(payload);
                }
            });
        }
    }
};