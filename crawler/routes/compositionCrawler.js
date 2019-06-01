const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlRelease = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title').text();
    log.info(`The title of "${request.url}" is: ${title}.`);

    const options = {
        $,
        baseUrl: baseDomain,
        pseudoUrls: [`${baseDomain}/track/[.*]`],
        requestQueue,
    };


    const enqueued = await Apify.utils.enqueueLinks(options);

    console.log(`Enqueued ${enqueued.length} Tracks.`);
};

exports.releaseComposition = crawlRelease;