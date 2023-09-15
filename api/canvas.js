var template = require('./template.js');
var config = require('../config.json');
var db = require('../database.js');

module.exports = {
    list: function(req, resp) {
        let limit = (req.query.limit === undefined) ? NaN : parseInt(req.query.limit);
        db.query("SELECT canvas_id AS 'id', disp_name AS 'name', width, height, c_date AS 'date' FROM " + config.database.prefix + "canvas_list ORDER BY c_date DESC"
                + ((!isNaN(limit)) ? (" LIMIT " + limit) : ""), function(err, result, fields) {
            if(err) resp.status(500).send(template(null, err + ''));
            else resp.send(template(result));
        });
    },

    fetch: function(req, resp) {
        let id = parseInt(req.params.id);
        if(isNaN(id)) resp.status(400).send(template(null, 'Invalid canvas ID'));
        db.query("SELECT tab_name FROM " + config.database.prefix + "canvas_list WHERE canvas_id = " + id, function(id_err, id_result, id_fields) {
            if(id_err) resp.status(500).send(template(null, id_err + ''));
            else if(id_result.length == 0) resp.status(400).send(template(null, 'Invalid canvas ID'));
            else {
                let name = id_result[0].tab_name;
                let start = (req.query.start === undefined || isNaN(parseFloat(req.query.start))) ? '' : new Date(parseFloat(req.query.start) * 1000).toISOString();
                // console.log(start);
                db.query("SELECT c.offset, c.color FROM " + name + " c, (SELECT offset, max(p_time) AS p_time FROM " + name + " GROUP BY offset) lt WHERE c.offset = lt.offset AND c.p_time = lt.p_time" + ((start !== '') ? (" AND c.p_time > '" + start + "'") : ""), function(p_err, p_result, p_fields) {
                    if(p_err) resp.status(500).send(template(null, p_err + ''));
                    else resp.send(template(p_result));
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
            else if(id_result.length == 0) resp.status(400).send(template(null, 'Invalid canvas ID'));
            else if(offset >= id_result[0].width * id_result[0].height) resp.status(400).send(template(null, 'Invalid offset'));
            else {
                let name = id_result[0].tab_name;
                let depth = (req.query.depth === undefined) ? NaN : parseFloat(req.query.depth);

                db.query("SELECT p_time AS 'time', color, user_id AS 'user' FROM " + name + " WHERE offset = " + offset + " ORDER BY p_time DESC" + ((isNaN(depth)) ? "" : (" LIMIT " + depth)), function(p_err, p_result, p_fields) {
                    if(p_err) resp.status(500).send(template(null, p_err + ''));
                    else resp.send(template(p_result));
                });
            }
        });
    }
};