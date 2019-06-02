const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlRelease = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title');
    log.info("--------------");
    log.info(`RELEASE - ${title.text()} []`);
    log.info("--------------");


    let releaseInfo = {};

    let jsonLD = $('script[type="application/ld+json"]');
    let jsonLDParsed = JSON.parse(jsonLD.html());

    let dsDataScript = $('script[id="dsdata"]');
    let dsData = JSON.parse(dsDataScript.text().trim().slice(42, -15));

    let trackWrapper = $('tr.tracklist_track');

    releaseInfo.name = jsonLDParsed.name;
    releaseInfo.description = jsonLDParsed.description;
    releaseInfo.datePublished = jsonLDParsed.datePublished;
    if (jsonLDParsed.aggregateRating) {
        releaseInfo.rating = {
            ratingCount: jsonLDParsed.aggregateRating.ratingCount,
            ratingValue: jsonLDParsed.aggregateRating.ratingValue,
        }
    }
    releaseInfo.format = jsonLDParsed.musicReleaseFormat;
    releaseInfo.numTracks = jsonLDParsed.numTracks;
    releaseInfo.genres = dsData.pageObject.genres;
    releaseInfo.styles = dsData.pageObject.styles;
    releaseInfo.artists = jsonLDParsed.releaseOf.byArtist;
    releaseInfo.country = jsonLDParsed.releasedEvent.location.name;

    releaseInfo.tracks = new Array(trackWrapper.length);
    let releaseDuration = 0;
    for (i = 0; i < trackWrapper.length; i++) {
        const trackDuration = trackWrapper[i].children[5].children[1].children[0].data;
        releaseDuration += parseInt(trackDuration.match(/([0-9]+):([0-9]+)/i)[1],10)*60 + 
                            parseInt(trackDuration.match(/([0-9]+):([0-9]+)/i)[2],10);
        const trackId = trackWrapper[i].children[3].children[0].attribs.href.match(/\/track\/(.+)/i)[1];
        releaseInfo.tracks[i] = trackId;
    }
    releaseInfo.releaseDuration = releaseDuration;

    log.info(JSON.stringify(releaseInfo));

    const optionsLabels = {
        $,
        baseUrl: baseDomain,
        pseudoUrls: [`${baseDomain}/label/[.*]`],
        requestQueue,
    };

    let enqueued = await Apify.utils.enqueueLinks(optionsLabels);

    // TODO START - Remove
    const optionsTracks = {
        $,
        baseUrl: baseDomain,
        pseudoUrls: [`${baseDomain}/track/[.*]`],
        requestQueue,
    };

    let enqueued = await Apify.utils.enqueueLinks(optionsTracks);

    console.log(`Enqueued ${enqueued.length} Tracks.`);
    // TODO END

    console.log(`Enqueued ${enqueued.length} Labels.`);
};

exports.crawlRelease = crawlRelease;