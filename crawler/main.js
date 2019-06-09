
const Apify = require('apify');
const router = require('./router');
const readline = require('readline');
const { utils: { log } } = Apify;
const { URL } = require('url'); // <------ This is new.

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



Apify.main(async () => {
    const ans = await askQuestion("Are you sure you want to deploy to PRODUCTION? ");
    log.info('Starting actor.');
    const baseDomain = 'https://www.discogs.com';
    const requestQueue = await Apify.openRequestQueue();
    const sources = [
        'https://www.discogs.com/search/?limit=250&sort=title%2Casc&layout=sm&country_exact=Serbia'
    ];

    const requestList = await Apify.openRequestList('categories', sources);
    const URLrouter = router.createRouter({ requestQueue, baseDomain });
    let failedRequests = [];
    let timeoutRequests = [];

    log.debug('Setting up crawler.');

    const handlePageFunction = async (context) => {
        const { request } = context;
        log.info(`Processing ${request.url}`);
        log.debug('Debug message', { debugData: 'hello' }); // doesn't print anything

        await URLrouter(context);
    }

    const handleFailFunction = async (request, error) => {
        log.error(`URL: ${request.url} Failed with error: ${error}`);
        if (error === "429_too_many_requests_429") {
            timeoutRequests.push({ request: request, error: error });
        } else {
            failedRequests.push({ request: request, error: error });
        }
        log.error(`Request failed: ${request.url}, with error: ${error}`);
    }

    const crawler = new Apify.CheerioCrawler({
        requestList,
        requestQueue,
        handleFailedRequestFunction: handleFailFunction,
        handlePageFunction: handlePageFunction,
        maxRequestRetries: 5,
    });

    const startTime = new Date();
    log.info('<<<<<<<<<<>>>>>>>>>>');
    log.info('Starting the crawl.');
    log.info(startTime);
    log.info('<<<<<<<<<<>>>>>>>>>>');
    
    await crawler.run();

    const endTime = new Date();
    log.info('<<<<<<<<<<>>>>>>>>>>');
    log.info('Actor finished.');
    log.info(endTime);
    log.info(`Total duration: ${(endTime - startTime)/1000}s`);
    log.info(`Total time spent on timeouts was: ${router.getTotalTimeoutTime()}s`)
    log.info('<<<<<<<<<<>>>>>>>>>>');

    if (failedRequests.length > 0) {
        log.error(`Failed requests: ${failedRequests.length}`);
        ans = await askQuestion("Do you wish to list all failed requests? y/n");
        if (ans === "Y" || ans === "y") {
            for (i = 0; i < failedRequests.length; i++) {
                log.info(failedRequests[i].request.url);
            }
        }
    }

    
    if (timeoutRequests.length > 0) {
        log.error(`Timeout requests: ${timeoutRequests.length}`);
        ans = await askQuestion("Do you wish to list all failed requests? y/n");
        if (ans === "Y" || ans === "y") {
            for (i = 0; i < timeoutRequests.length; i++) {
                log.info(timeoutRequests[i].request.url);
            }
        }

        // TODO retry
    }
});