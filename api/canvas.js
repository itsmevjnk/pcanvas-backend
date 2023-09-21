var template = require('./template.js');
var config = require('../config.json');
var db = require('../database.js');
var auth = require('./auth.js');
var index = require('../index.js');

var fn_check_cooldown = function(tab_name, id, callback) {
    db.query("SELECT p_time FROM " + tab_name + " ORDER BY p_time DESC LIMIT 1", function(p_err, p_result, p_fields) {
        if(p_err) throw err;
        else db.query("SELECT moderator FROM " + config.database.prefix + "users WHERE user_id = " + id, function(m_err, m_result, m_fields) {
            if(m_err) throw err;
            else if(m_result[0].moderator == 1 || p_result.length == 0) callback(0);
            else callback(Math.max(0, (new Date(p_result[0].p_time).getTime() - Date.now()) / 1000 + config.cooldown_timer));
        });
    });
};

module.exports = {
    list: function(req, resp) {
        let limit = (req.query.limit === undefined) ? NaN : parseInt(req.query.limit);
        db.query("SELECT canvas_id AS 'id', disp_name AS 'name', width, height, c_date AS 'date', is_read_only AS 'readonly' FROM " + config.database.prefix + "canvas_list ORDER BY c_date DESC"
                + ((!isNaN(limit)) ? (" LIMIT " + limit) : ""), function(err, result, fields) {
            if(err) resp.status(500).send(template(null, err + ''));
            else {
                result.forEach((r) => r.readonly = Boolean(r.readonly));
                resp.send(template(result));
            }
        });
    },

    fetch: function(req, resp) {
        let query_params = '';
        if(req.params.id === 'latest')
            query_params = "ORDER BY c_date DESC LIMIT 1";
        else {
            let id = parseInt(req.params.id);
            if(isNaN(id)) resp.status(400).send(template(null, 'Invalid canvas ID'));
            query_params = "WHERE canvas_id = " + id;
        }
        db.query("SELECT canvas_id AS id, tab_name FROM " + config.database.prefix + "canvas_list " + query_params, function(id_err, id_result, id_fields) {
            if(id_err) resp.status(500).send(template(null, id_err + ''));
            else if(id_result.length == 0) resp.status(404).send(template(null, 'Invalid canvas ID'));
            else {
                let name = id_result[0].tab_name;
                let start = (req.query.start === undefined || isNaN(parseFloat(req.query.start))) ? '' : new Date(parseFloat(req.query.start) * 1000).toISOString();
                // console.log(start);
                db.query("SELECT c.offset, c.color FROM " + name + " c, (SELECT offset, max(p_time) AS p_time FROM " + name + " GROUP BY offset) lt WHERE c.offset = lt.offset AND c.p_time = lt.p_time" + ((start !== '') ? (" AND c.p_time > '" + start + "'") : ""), function(p_err, p_result, p_fields) {
                    if(p_err) resp.status(500).send(template(null, p_err + ''));
                    else resp.send(template(p_result, (req.params.id === 'latest') ? id_result[0].id : null));
                });
            }
        });
    },

    history: function(req, resp) {
        let id = parseInt(req.params.id);
        let offset = parseInt(req.params.offset);
        if(isNaN(id)) resp.status(400).send(template(null, 'Invalid canvas ID'));
        if(isNaN(offset)) resp.status(400).send(template(null, 'Invalid offset'));
        db.query("SELECT tab_name, width, height FROM " + config.database.prefix + "canvas_list WHERE canvas_id = " + id, function(id_err, id_result, id_fields) {
            if(id_err) resp.status(500).send(template(null, id_err + ''));
            else if(id_result.length == 0) resp.status(404).send(template(null, 'Invalid canvas ID'));
            else if(offset < 0 || offset >= id_result[0].width * id_result[0].height) resp.status(404).send(template(null, 'Invalid offset'));
            else {
                let name = id_result[0].tab_name;
                let depth = (req.query.depth === undefined) ? NaN : parseFloat(req.query.depth);

                db.query("SELECT p_time AS 'time', color, user_id AS 'user' FROM " + name + " WHERE offset = " + offset + " ORDER BY p_time DESC" + ((isNaN(depth)) ? "" : (" LIMIT " + depth)), function(p_err, p_result, p_fields) {
                    if(p_err) resp.status(500).send(template(null, p_err + ''));
                    else resp.send(template(p_result));
                });
            }
        });
    },

    check_cooldown: fn_check_cooldown,

    cooldown: function(req, resp) {
        auth.verify_login(req.cookies, (valid, moderator) => {
            if(!valid) resp.status(401).send(template(null, 'Not logged in'));
            else {
                let id = parseInt(req.params.id);
                if(isNaN(id)) resp.status(400).send(template(null, 'Invalid canvas ID'));
                else db.query("SELECT tab_name, width, height FROM " + config.database.prefix + "canvas_list WHERE canvas_id = " + id, function(id_err, id_result, id_fields) {
                    if(id_err) resp.status(500).send(template(null, id_err + ''));
                    else if(id_result.length == 0) resp.status(404).send(template(null, 'Invalid canvas ID'));
                    else fn_check_cooldown(id_result[0].tab_name, id, (timer) => {
                        resp.send(template({
                            "timer": timer
                        }));
                    });
                });
            }
        });
    },

    place: function(req, resp) {
        auth.verify_login(req.cookies, (valid, moderator) => {
            if(!valid) resp.status(401).send(template(null, 'Not logged in'));
            else {
                if(req.body.offset === undefined || req.body.color === undefined) resp.status(400).send(template(null, 'Insufficient data'));
                else if(typeof req.body.offset !== 'number' || typeof req.body.color !== 'number') resp.status(400).send(template(null, 'Invalid data'));
                else if(req.body.color < 0 || req.body.color > 15) resp.status(400).send(template(null, 'Invalid color'));
                else {
                    let id = parseInt(req.params.id);
                    if(isNaN(id)) resp.status(400).send(template(null, 'Invalid canvas ID'));
                    else db.query("SELECT tab_name, width, height, is_read_only AS 'readonly' FROM " + config.database.prefix + "canvas_list WHERE canvas_id = " + id, function(id_err, id_result, id_fields) {
                        if(id_err) resp.status(500).send(template(null, id_err + ''));
                        else if(id_result.length == 0) resp.status(404).send(template(null, 'Invalid canvas ID'));
                        else if(req.body.offset < 0 || req.body.offset >= id_result[0].width * id_result[0].height) resp.status(404).send(template(null, 'Invalid offset'));
                        else fn_check_cooldown(id_result[0].tab_name, id, (timer) => {
                            if(timer > 0) resp.status(403).send(template({
                                "timer": timer
                            }, 'User is under cooldown'));
                            else if(id_result[0].readonly && !moderator) {
                                resp.status(403).send(template(null, 'Canvas is read-only'));
                            } else db.query("INSERT INTO " + id_result[0].tab_name + " (offset, color, user_id) VALUES (" + req.body.offset + ", " + req.body.color + ", " + req.cookies.id + ")", function(p_err, p_result, p_fields) {
                                if(p_err) resp.status(500).send(template(null, p_err + ''));
                                else {
                                    resp.send(template({
                                        "offset": req.body.offset,
                                        "color": req.body.color,
                                        "timer": (moderator) ? 0 : config.cooldown_timer
                                    }));
                                    index.io.sockets.in(id).emit('place', {
                                        "offset": req.body.offset,
                                        "color": req.body.color,
                                        "user": parseInt(req.cookies.id)
                                    });
                                }
                            });
                        });
                    });
                }
            }
        });
    }
};