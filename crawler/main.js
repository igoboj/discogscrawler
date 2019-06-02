
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
        'https://www.discogs.com/Deep-Purple-Made-In-Japan/release/8428577'
    ];

    const requestList = await Apify.openRequestList('categories', sources);
    const URLrouter = router.createRouter({ requestQueue, baseDomain });

    log.debug('Setting up crawler.');
    
    const handlePageFunction = async (context) => {
        const { request } = context;
        log.info(`Processing ${request.url}`);
        log.debug('Debug message', { debugData: 'hello' }); // doesn't print anything

        await URLrouter(context);
    }
    
    const crawler = new Apify.CheerioCrawler({
        requestList,
        requestQueue,
        handlePageFunction: handlePageFunction,
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Actor finished.');
});