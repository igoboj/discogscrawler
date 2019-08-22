
const log = require("./../log");
const DBContext = require('./../dbContext');

const crawlMaster = async ({ url, $ }, { requestQueue, baseDomain }, connectionPool) => {
    const title = $('title');
    log.info("=================");
    log.info(`MASTER - ${title.text()} []`);
    log.info("--------------");

    let masterInfo = {};

    let jsonLD = $('script[type="application/ld+json"]');
    let jsonLDParsed = JSON.parse(jsonLD[0].children[0].nodeValue)

    let dsDataScript = $('script[id="dsdata"]');
    let dsData = JSON.parse(dsDataScript[0].children[0].nodeValue.trim().slice(42, -15));


    let trackTitles = $('td.tracklist_track_title > a');
    let trackDurations = $('td.tracklist_track_duration > span');
    let labelWrapper = $('div.profile>div.content>a');
    for (i = 0; i < labelWrapper.length; i++) {
        if (labelWrapper[i].attribs.href &&
            labelWrapper[i].parent.prev &&
            labelWrapper[i].parent.prev.prev &&
            labelWrapper[i].parent.prev.prev.children.length &&
            labelWrapper[i].parent.prev.prev.children[0].data === "Label:") {

            const labelUrl = labelWrapper[i].attribs.href;
            const labelId = labelUrl.match(/.*\/label\/([0-9]+).*/i)[1];
            await requestQueue.add({ url: baseDomain + "/label/" + labelId });
            log.info(`Enqueued Label (${labelId}) - ${labelWrapper[i].attribs.href} from Release.`);
        }
    }

    let enqueueTracks = true;
    let have = $("li>a.coll_num");
    let want = $("li>a.want_num");
    let releaseMatch = url.match(/.*\/master\/([0-9]+)$/i);

    masterInfo.name = jsonLDParsed.name;
    masterInfo.description = jsonLDParsed.description;
    masterInfo.datePublished = jsonLDParsed.datePublished;
    if (jsonLDParsed.aggregateRating) {
        masterInfo.rating = {
            ratingCount: jsonLDParsed.aggregateRating.ratingCount,
            ratingValue: jsonLDParsed.aggregateRating.ratingValue,
        }
    }
    masterInfo.format = jsonLDParsed.musicReleaseFormat;
    masterInfo.numTracks = jsonLDParsed.numTracks;
    masterInfo.genres = dsData.pageObject.genres;
    masterInfo.styles = dsData.pageObject.styles;
    if (have && have.length > 0) {
        masterInfo.have = parseInt(have[0].children[0].data, 10);
    }
    if (want && want.length > 0) {
        masterInfo.want = parseInt(want[0].children[0].data, 10);
    }
    if (releaseMatch && releaseMatch.length > 0) {
        masterInfo.id = releaseMatch[1];
    }


    masterInfo.tracks = new Array(trackTitles.length);
    let releaseDuration = 0;
    let enqueuedTracks = 0;
    for (i = 0; i < trackTitles.length; i++) {

        let trackDuration = trackDurations[i].children.length != 0 ? trackDurations[i].children[0].data : "00:00";

        releaseDuration += parseInt(trackDuration.match(/([0-9]+):([0-9]+)/i)[1], 10) * 60 +
            parseInt(trackDuration.match(/([0-9]+):([0-9]+)/i)[2], 10);

        if (trackTitles[i].attribs.href) {
            const trackId = trackTitles[i].attribs.href.match(/\/track\/(.+)/i)[1];
            masterInfo.tracks[i] = trackId;
            if (enqueueTracks) {
                //await  requestQueue.add({ url: baseDomain + "/track/" + trackId });
                //enqueuedTracks++;
            }
        }
    }
    log.info(`Enqueued: ${enqueuedTracks} Tracks from Master`);

    let searchResults = $('td.title>a');
    for (i = 0; i < searchResults.length; i++) {
        let releaseMatch = searchResults[i].attribs.href.match(/.*\/release\/([0-9]+)$/i);
        let resultId = releaseMatch[1];
        //await requestQueue.add({ url: baseDomain + `/rls/release/${resultId}` });
    }
    //log.info(`Enqueued: ${searchResults.length} Releases from Master`);
    //log.info(`Master: ${JSON.stringify(masterInfo)}`);
    masterInfo.releaseDuration = releaseDuration;

    ////////////////////////////////
    
    DBContext.insertOrUpdateMaster(connectionPool, masterInfo);

    ///////////////////////////////


    log.info("=================");
};

exports.crawlMaster = crawlMaster;