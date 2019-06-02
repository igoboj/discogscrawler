const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlMaster = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title');
    log.info("--------------");
    log.info(`RELEASE - ${title.text()} []`);
    log.info("--------------");


    let masterInfo = {};

    let jsonLD = $('script[type="application/ld+json"]');
    let jsonLDParsed = JSON.parse(jsonLD.html());

    let dsDataScript = $('script[id="dsdata"]');
    let dsData = JSON.parse(dsDataScript.text().trim().slice(42, -15));

    let trackWrapper = $('tr.tracklist_track');

    const optionsTracks = {
        $,
        baseUrl: baseDomain,
        pseudoUrls: [`${baseDomain}/track/[.*]`],
        requestQueue,
    };

    let enqueued = await Apify.utils.enqueueLinks(optionsTracks);

    console.log(`Enqueued ${enqueued.length} Tracks.`);
};

exports.crawlMaster = crawlMaster;