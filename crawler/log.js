
function info(input) {
    console.log("INFO:  " + input);
}

function error(input) {
    console.log('\x1b[31mError: %s\x1b[0m', input);
}

const api = {
    info: info,
    error: error,
}

module.exports = api;