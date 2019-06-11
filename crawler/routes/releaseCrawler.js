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

    let trackTitles = $('td.tracklist_track_title > a');
    let trackDurations = $('td.tracklist_track_duration > span');
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

    let enqueueTracks = false;
    if (masterWrapper.length > 0) {
        let masterUrl = masterWrapper[0].attribs.href;
        let masterId = masterUrl.match(/.*\/master\/([0-9]+)/i)[1];
        requestQueue.addRequest({ url: baseDomain + "/rls/master/" + masterId });
        log.info(`Enqueued Master (${masterId}) - ${masterUrl} from Release.`);
    } else {
        enqueueTracks = true;
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

    releaseInfo.tracks = new Array(trackTitles.length);
    let releaseDuration = 0;

    for (i = 0; i < trackTitles.length; i++) {

        let trackDuration = trackDurations[i].children.length != 0 ? trackDurations[i].children[0].data : "00:00";

        releaseDuration += parseInt(trackDuration.match(/([0-9]+):([0-9]+)/i)[1], 10) * 60 +
            parseInt(trackDuration.match(/([0-9]+):([0-9]+)/i)[2], 10);

        if (trackTitles[i].attribs.href) {
            const trackId = trackTitles[i].attribs.href.match(/\/track\/(.+)/i)[1];
            releaseInfo.tracks[i] = trackId;
            if (enqueueTracks) {
                requestQueue.addRequest({ url: baseDomain + "/track/" + trackId });
            }
        }
    }

    releaseInfo.releaseDuration = releaseDuration;

    if (enqueueTracks) {
        log.info(`Enqueued ${trackTitles.length} Tracks from Release.`);
    }
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