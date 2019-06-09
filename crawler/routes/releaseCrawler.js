const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlRelease = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title');
    log.info("=================");
    log.info(`RELEASE - ${title.text()} []`);
    log.info("--------------");


    let releaseInfo = {};

    let jsonLD = $('script[type="application/ld+json"]');
    let jsonLDParsed = JSON.parse(jsonLD.html());

    let dsDataScript = $('script[id="dsdata"]');
    let dsData = JSON.parse(dsDataScript.text().trim().slice(42, -15));

    let trackWrapper = $('tr.tracklist_track');
    let masterWrapper = $('a[id="all-versions-link"]');
    let labelWrapper = $('div.profile>div.content>a');
    for (i = 0; i < labelWrapper.length; i++) {
        if (labelWrapper[i].attribs.href &&
            labelWrapper[i].parent.prev &&
            labelWrapper[i].parent.prev.prev &&
            labelWrapper[i].parent.prev.prev.children.length &&
            labelWrapper[i].parent.prev.prev.children[0].data === "Label:") {

            const labelUrl = labelWrapper[i].attribs.href;
            const labelId = labelUrl.match(/.*\/label\/([0-9]+).*/i)[1];
            requestQueue.addRequest({ url: baseDomain + "/label/" + labelId });
            log.info(`Enqueued Label (${labelId}) - ${labelWrapper[i].attribs.href} from Release.`);
        }
    }

    if (masterWrapper.length > 0) {
        let masterUrl = masterWrapper[0].attribs.href;
        let masterId = masterUrl.match(/.*\/master\/([0-9]+)/i)[1];
        requestQueue.addRequest({ url: baseDomain + "/rls/master/" + masterId });
        log.info(`Enqueued Master (${masterId}) - ${masterUrl} from Release.`);
    } else {
        log.error("A Release has no Master!");
    }

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
        if (trackWrapper[i].children.length === 5) {
            continue;
        }

        let trackDuration = "00:00";
        if (trackWrapper[i].children[5].children[1].children[0]) {
            trackDuration = trackWrapper[i].children[5].children[1].children[0].data;
        }
        releaseDuration += parseInt(trackDuration.match(/([0-9]+):([0-9]+)/i)[1], 10) * 60 +
            parseInt(trackDuration.match(/([0-9]+):([0-9]+)/i)[2], 10);

        if (trackWrapper[i].children[3].children[0].attribs.href) {
            const trackId = trackWrapper[i].children[3].children[0].attribs.href.match(/\/track\/(.+)/i)[1];
            releaseInfo.tracks[i] = trackId;
        }
    }
    releaseInfo.releaseDuration = releaseDuration;

    log.info("=================");
    /*
    const optionsLabels = {
        $,
        baseUrl: baseDomain,
        pseudoUrls: [`${baseDomain}/label/[.*]`],
        requestQueue,
    };

    let enqueued = await Apify.utils.enqueueLinks(optionsLabels);

    console.log(`Enqueued ${enqueued.length} Labels from Release.`);
    */

    /*
    const optionsTracks = {
        $,
        baseUrl: baseDomain,
        pseudoUrls: [`${baseDomain}/track/[.*]`],
        requestQueue,
    };

    enqueued = await Apify.utils.enqueueLinks(optionsTracks);

    console.log(`Enqueued ${enqueued.length} Tracks from Release.`);
    */

};

exports.crawlRelease = crawlRelease;