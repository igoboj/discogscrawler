const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlArtist = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title').text();

    let artistInfo = {};


    let jsonLD = $('script[type="application/ld+json"]');
    let jsonLDParsed = JSON.parse(jsonLD.html());

    artistInfo.name = jsonLDParsed.member[0].name;
    artistInfo.type = jsonLDParsed.member[0]["@type"];
    artistInfo.id = jsonLDParsed.member[0]["@id"].match(/.*\/artist\/([0-9]+)\-.*/i)[1];
    artistInfo.description = jsonLDParsed.description;
    artistInfo.siteList = jsonLDParsed.sameAs;

    
    log.info("=================");
    log.info(`ARTIST - ${artistInfo.name} [${artistInfo.id}]`);
    log.info("--------------");

    const $artistCreditsWrapper = $('ul.facets_nav > li a.credit_type');

    for (i = 0; i < $artistCreditsWrapper.length; i++) {
        let property = $artistCreditsWrapper[i].attribs["data-credit-subtype"];
        let creditType = $artistCreditsWrapper[i].attribs["data-credit-type"];
        if(!artistInfo[creditType]) {
            artistInfo[creditType] = {};
        }
        let countAppearances = parseInt($artistCreditsWrapper[1].children[1].children[0].data, 10);
        artistInfo[creditType][property] = countAppearances;
    }

    const $artistProfileWrapper = $('div.profile > div.head');

    let Aliases = [];
    for (i = 0; i < $artistProfileWrapper.length; i++) {
        if ($artistProfileWrapper[i].children[0].data == "Aliases:") {
            const contentLength = $artistProfileWrapper[i].next.next.children.length;
            Aliases = new Array((contentLength - 1) / 2);
            let aliasCount = 0;
            for (j = 1; j < contentLength; j++) {
                Aliases[aliasCount++] = $artistProfileWrapper[i].next.next.children[j++].children[0].data;
            }

            artistInfo.aliases = Aliases;
        }
    }

    //log.info(JSON.stringify(artistInfo));
    log.info("=================");

    // TODO add images 
    // 
};

exports.crawlArtist = crawlArtist;