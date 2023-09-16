var template = require('./template.js');
var config = require('../config.json');
var db = require('../database.js');
var crypto = require('node:crypto');

module.exports = {
    verify_login: function(cookies, callback) {
        if(cookies.id === undefined || cookies.token === undefined) callback(false);
        else db.query("SELECT a.user_id, u.moderator FROM " + config.database.prefix + "auth a JOIN " + config.database.prefix + "users u ON a.user_id = u.user_id WHERE a.user_id = " + cookies.id + " AND a.auth_id = '" + cookies.token + "'", function(err, result, fields) {
            if(err) throw err;
            else callback((result.length > 0), ((result.length > 0) && (result[0].moderator == 1)));
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
                    resp.send(template(payload));
                }
            });
        }
    },

    logout: function(req, resp) {
        if(req.cookies.id === undefined || req.cookies.token === undefined)
            resp.status(401).send(template(null, 'Not logged in'));
        else
            db.query("DELETE FROM " + config.database.prefix + "auth WHERE user_id = " + req.cookies.id + " AND auth_id = '" + req.cookies.token + "'", function(err, result, fields) {
                resp.send(template({
                    "success": (result.affectedRows != 0)
                }))
            });
    },

    exists: function(req, resp) {
        let user = (req.query.user === undefined) ? null : req.query.user;
        let email = (req.query.email === undefined) ? null : req.query.email.toLowerCase();
        
        if(user === null && email === null) resp.send(template({})); // nothing to check
        else db.query("SELECT user_name AS user, email FROM " + config.database.prefix + "users WHERE "
                    + ((user !== null) ? ("user_name = '" + user + "'") : "")
                    + ((user !== null && email !== null) ? " OR " : "")
                    + ((email !== null) ? ("email = '" + email + "'") : ""), function(err, result, fields) {
                        if(err) resp.status(500).send(template(null, err + ''));
                        else {
                            let payload = {};
                            if(user !== null) payload.user = false;
                            if(email !== null) payload.email = false;
                            result.forEach((record) => {
                                if(record.user == user) payload.user = true;
                                if(record.email == email) payload.email = true;
                            });
                            resp.send(template(payload));
                        }
                    });
    },

    register: function(req, resp) {
        if(typeof req.body.user !== 'string' || typeof req.body.password !== 'string' || typeof req.body.email !== 'string')
            resp.status(400).send(template(null, 'Insufficient or invalid data'));
        else if(req.body.password.length < config.min_pw_length)
            resp.status(400).send(template(null, 'Password length is below minimum requirement'));
        else {
            let password = crypto.createHash('sha256').update(req.body.password).digest('hex');
            db.query("INSERT INTO " + config.database.prefix + "users (user_name, email, pswd_hash) VALUES ('" + req.body.user + "', '" + req.body.email.toLowerCase() + "', '" + password + "')", function(i_err, i_result, i_fields) {
                if(i_err) {
                    /* registration failed, let's figure out why */
                    if(i_err.code == 'ER_DUP_ENTRY') {
                        /* duplicate field */
                        let field = (i_err + '').replace(new RegExp("^.*\\'" + config.database.prefix + "users\\.", 'g'), "").replaceAll("'", "");
                        resp.status(403).send(template({
                            "field": (field == "user_name") ? "user" : "email"
                        }, 'Duplicate field'));
                    } else resp.status(500).send(template(null, i_err + '')); // unknown error, so let's just send it back to the source
                } else {
                    /* registration completed, let's get the user logged in */
                    db.query("SELECT user_id AS id, moderator FROM " + config.database.prefix + "users WHERE user_name = '" + req.body.user + "'", function(id_err, id_result, id_fields) {
                        if(id_err) resp.status(500).send(template(null, id_err + ''));
                        else {
                            /* we now have the user ID, now we only need to create a token */
                            let token = crypto.randomUUID(); // we don't need to bother with duplicate checking since this will be the first entry for the user anyway
                            let ua = req.get('User-Agent') || '';
                            db.query("INSERT INTO " + config.database.prefix + "auth (auth_id, user_id, ip, user_agent) VALUES ('" + token + "', " + id_result[0].id + ", '" + req.ip + "', '" + ua.substring(0, 256) + "')", function(a_err, a_result, a_fields) {
                                if(a_err) resp.status(500).send(template(null, a_err + ''));
                                else resp.send(template({
                                    "token": token,
                                    "user": req.body.user,
                                    "id": id_result[0].id,
                                    "moderator": (id_result[0].moderator == 1)
                                }));
                            });
                        }
                    });
                }
            });
        }
    }
};