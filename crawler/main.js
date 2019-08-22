
const router = require('./router');
const readline = require('readline');
const sql = require("mssql");
const log = require("./log");
const RequestQueue = require("./requestQueue");
const DBContext = require('./dbContext');


function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

(async () => {
    //ans = await askQuestion("Are you sure you want to deploy to PRODUCTION? ");

    var config = {
        user: 'sa',
        password: 'Password1!',
        server: 'localhost',
        database: 'discogs',
        pool: {
            max: 100,
            min: 1
        }
    };

    const connectionPoolPromise = new sql.ConnectionPool(config);
    connectionPoolPromise.on('error', (err) => {
        if (err) console.log(err);
    });
    await connectionPoolPromise.connect();

    log.info('Starting crawler.');
    const baseDomain = 'https://www.discogs.com';
    const sources = [
        'https://www.discogs.com/search/?country_exact=Yugoslavia'
    ];

    const URLrouter = router.createRouter({ RequestQueue, baseDomain });
    let failedRequests = [];
    let timeoutRequests = [];

    const handlePageFunction = async (context) => {
        log.info(`Processing ${context.url}`);

        await URLrouter(context, connectionPoolPromise);
        const queueStats = RequestQueue.stats();
        log.info(`Queue status: ${JSON.stringify(queueStats)}`);
    }

    RequestQueue.initialize(handlePageFunction, sources, { maxRetries: 10, concurrency: 10 });
    DBContext.initialize(connectionPoolPromise);

    const startTime = new Date();
    log.info('<<<<<<<<<<>>>>>>>>>>');
    log.info('Starting the crawl.');
    log.info(startTime);
    await RequestQueue.run();
    log.info('<<<<<<<<<<>>>>>>>>>>');

    await RequestQueue.finished().then((result) => {
        const endTime = new Date();
        log.info('<<<<<<<<<<>>>>>>>>>>');
        log.info('Actor finished.');
        log.info(endTime);
        log.info(`Total duration: ${(endTime - startTime) / 1000}s`);
        log.info(`Total time spent on timeouts was: ${router.getTotalTimeoutTime()}s`)
        log.info('<<<<<<<<<<>>>>>>>>>>');
        connectionPoolPromise.close();
        RequestQueue.dump();
    });



    const handleFailFunction = async (request, error) => {
        log.error(`URL: ${request.url} Failed with error: ${error}`);
        if (error === "429_too_many_requests_429") {
            timeoutRequests.push({ request: request, error: error });
        } else {
            failedRequests.push({ request: request, error: error });
        }
        log.error(`Request failed: ${request.url}, with error: ${error}`);
    }
})();