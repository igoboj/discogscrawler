const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlLabel = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title').text();

    let labelInfo = {};


    let jsonLD = $('script[type="application/ld+json"]');
    let jsonLDParsed = JSON.parse(jsonLD.html());

    labelInfo.name = jsonLDParsed.name;
    labelInfo.type = jsonLDParsed["@type"];
    labelInfo.id = jsonLDParsed["@id"].match(/.*\/label\/([0-9]+)\-.*/i)[1];
    labelInfo.description = jsonLDParsed.description;

    
    log.info("=================");
    log.info(`LABEL - ${labelInfo.name} [${labelInfo.id}]`);
    log.info("--------------");

    log.info("=================");
};

exports.crawlLabel = crawlLabel;