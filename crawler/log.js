
function info(input) {
    console.log("INFO:  " + input);
}

function error(input) {
    console.log("ERROR: " + input);
}

const api = {
    info: info,
    error: error,
}

module.exports = api;