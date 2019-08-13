let Queue = require('queue');
let HashMap = require('hashmap');
const tr = require("tor-request");
const cheerio = require('cheerio');
const deferred = require('deferred');
const fs = require('fs');

tr.TorControlPort.password = "SECRETPASSWORD";

let handlePageFunction;
let queue;
let processedUrls;
let finishedDef;
let queueStats = {
    enqueued: 0,
    started: 0,
    finished: 0,
    failed: 0,
    timedout: 0,
    retriedOut: 0,
}
let maxRetries = 5;
let concurrency = 10;
let timeout = 50000;
let changingIP = false;

async function processUrl(input, callback) {
    let urlEntry = processedUrls.get(input)
    urlEntry.status = "processing";
    processedUrls.set(input, urlEntry);

    tr.request(input, async function (err, res, body) {
        urlEntry.status = "fetched";
        processedUrls.set(input, urlEntry);
        if (!err && res.statusCode == 200) {
            const $ = cheerio.load(body)
            let context = {
                url: input,
                $: $,
            }
            try {
                handlePageFunction(context);

                callback(null, true);

                urlEntry.status = "finished";
                processedUrls.set(input, urlEntry);
            } catch (error) {
                callback(error, false);

                urlEntry.status = "failed";
                processedUrls.set(input, urlEntry);
            }
        } else {
            callback(null, true);

            console.log("TOR - Wants to change IP");
            if (!changingIP) {
                console.log("TOR - Changing IP");
                changingIP = true;
                await tr.newTorSession((error) => {
                    changingIP = false;
                    if (!error) {
                        tr.request('https://api.ipify.org', function (err, res, body) {
                            if (!err && res.statusCode == 200) {
                                console.log("TOR - Changed IP to: " + body);
                            }
                        });
                    } else {
                        console.log("TOR - Failed to change IP");
                    }
                });
            }
            if (!enqueue({ url: input })) {
                queueStats.retriedOut++;
            }
        }
    });
}

function enqueue(options) {
    if (queueStats.enqueued % 500 == 0) {
        dump();
    }

    let urlEntry = processedUrls.get(options.url)
    if (options.url) {
        if (!urlEntry) {

            processedUrls.set(options.url, {
                retries: 0,
                status: "enqueued",
            });

            queue.push(function (cb) {
                processUrl(options.url, cb);
            });
            queueStats.enqueued++;
            return true;

        } else if (urlEntry.retries < 5) {

            queue.push(function (cb) {
                processUrl(options.url, cb);
            });

            urlEntry.retries++;
            urlEntry.status = "requeued";
            processedUrls.set(options.url, urlEntry);
            queueStats.enqueued++;

            return true;
        } else {
            urlEntry.status = "retryLimitReached";
            processedUrls.set(options.url, urlEntry);
            return false;
        }
    }
    return false;
}

function init(handleFunction, sources, options) {
    handlePageFunction = handleFunction;

    maxRetries = options && options.maxRetries && options.maxRetries;
    concurrency = options && options.concurrency && options.concurrency
    finishedDef = deferred();

    queue = Queue()
        .on("start", function (next, job) {
            queueStats.started++;
        })
        .on("success", function (next, job) {
            queueStats.finished++;
        })
        .on("error", function (next, job) {
            queueStats.failed++;
        })
        .on("timeout", function (next, job) {
            queueStats.timedout++;
        })
        .on("end", function (err) {
            finishedDef.resolve("All requests finished.");
        });

    queue.timeout = timeout;
    queue.concurrency = concurrency;
    processedUrls = new HashMap();

    if (sources) {
        for (i = 0; i < sources.length; i++) {
            enqueue({ url: sources[i] });
        }
    }
}

function stats() {
    return queueStats;
}

async function run() {
    queue.start();
}

function isFinished() {
    return finishedDef.promise;
}

function dump() {
    let dumpContent = JSON.stringify(processedUrls);
    fs.writeFile("D:\\IGOR\\ETF backup\\PSZ\\discogscrawler\\crawler\\dump.txt", dumpContent, function (err) {
        if (err) {
            return console.log(err);
        }
    });
}

const api = {
    initialize: init,
    add: enqueue,
    stats: stats,
    run: run,
    finished: isFinished,
    dump: dump
}

module.exports = api;