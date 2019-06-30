let Queue = require('better-queue');
let HashMap = require('hashmap');
const tr = require("tor-request");
const cheerio = require('cheerio')

var debug = typeof v8debug === 'object';

let handlePageFunction;
let queue;
let processedUrls;
let started = false;
let queueStats = {
    enqueued: 0,
    started: 0,
    finished: 0,
    failed: 0,
}


async function processUrl(input, callback) {
    await tr.request(input, function (err, res, body) {
        if (!err && res.statusCode == 200) {
            const $ = cheerio.load(body)
            let context = {
                url: input,
                $: $,
            }
            try {
                handlePageFunction(context);
                callback(null, true);
            } catch (error) {
                callback(error, false);
            }
        } else {
            callback(err, false);
        }
    });
}

function init(handleFunction, sources, options) {
    handlePageFunction = handleFunction;
    if (!options) {
        const defaultOptions = {
            maxRetries: 5,
            maxTimeout: 3000,
            concurrent: 3,
            precondition: function (cb) {
                if (started) {
                    cb(null, true);
                } else {
                    cb(null, true);
                }
            },
            preconditionRetryTimeout: 100
        }
        queue = new Queue(processUrl, defaultOptions)
            .on("task_queued", function (task_id, var1) {
                //queueStats.enqueued++;
            })
            .on("task_started", function (task_id, var1) {
                queueStats.started++;
            })
            .on("task_finish", function (task_id, var1) {
                queueStats.finished++;
            })
            .on("task_failed", function (task_id, var1) {
                queueStats.failed++;
            });
    } else {
        queue = new Queue(processUrl, options);
    }


    processedUrls = new HashMap();

    if (sources) {
        for (i = 0; i < sources.length; i++) {
            enqueue({ url: sources[i] });
        }
    }
}

function enqueue(options) {
    if (options.url && !processedUrls.get(options.url)) {
        processedUrls.set(options.url, true);
        queue.push(options.url).on("failed", (err) => {
            console.log(err);
        });
        queueStats.enqueued++;
    }
}

function stats() {
    return queueStats;
}

async function run() {
    started = true;
    return new Promise(resolve => {
        setTimeout(resolve, 1000)
    })
}

function isFinished() {

    return new Promise(function (resolve, reject) {
        (function checkIfFinished() {
            if ((queueStats.enqueued - queueStats.finished) == 0) return resolve();
            setTimeout(checkIfFinished, 150);
        })();
    });
}

function destroy() {
    if (queue) {
        queue.destroy();
    }
}

const api = {
    initialize: init,
    add: enqueue,
    stats: stats,
    run: run,
    finished: isFinished,
    destroy: destroy,
}

module.exports = api;