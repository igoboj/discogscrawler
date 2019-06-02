const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlRelease = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title');
    log.info("--------------");
    log.info(`RELEASE - ${title.text()} []`);
    log.info("--------------");

    const options = {
        $,
        baseUrl: baseDomain,
        pseudoUrls: [`${baseDomain}/track/[.*]`],
        requestQueue,
    };


    const enqueued = await Apify.utils.enqueueLinks(options);

    console.log(`Enqueued ${enqueued.length} Tracks.`);
};

exports.crawlRelease = crawlRelease;