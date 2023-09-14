module.exports = function(data, msg = null) {
    return {
        "time": Date.now() / 1000, // TODO: do we even need this?
        "payload": data,
        "message": msg
    }
}