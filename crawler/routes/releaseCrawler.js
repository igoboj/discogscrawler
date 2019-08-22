
const log = require("./../log");
const DBContext = require('./../dbContext');

const crawlRelease = async ({ url, $ }, { RequestQueue, baseDomain }, connectionPool) => {
    const title = $('title');
    log.info("=================");
    log.info(`RELEASE - ${title.text()} []`);
    log.info("--------------");

    if (!RequestQueue) {
        console.log("err");
    }
    let releaseInfo = {};

    let jsonLD = $('script[type="application/ld+json"]');
    let jsonLDParsed = JSON.parse(jsonLD[0].children[0].nodeValue)

    let dsDataScript = $('script[id="dsdata"]');
    let dsData = JSON.parse(dsDataScript[0].children[0].nodeValue.trim().slice(42, -15));

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
            //await RequestQueue.add({ url: baseDomain + "/label/" + labelId });
            log.info(`Enqueued Label (${labelId}) - ${labelWrapper[i].attribs.href} from Release.`);
        }
    }

    releaseInfo.id = parseInt(url.match(/.*\/release\/([0-9]+)/i)[1], 10);
    let enqueueTracks = true;
    let masterDB;
    if (masterWrapper.length > 0) {
        let masterUrl = masterWrapper[0].attribs.href;
        let masterId = masterUrl.match(/.*\/master\/([0-9]+)/i)[1];
        releaseInfo.masterId = masterId;
        masterDB = await DBContext.getMaster(connectionPool, masterId);
        if (!masterDB) {
            await RequestQueue.add({ url: baseDomain + "/rls/master/" + masterId });
            log.info(`Enqueued Master (${masterId}) - ${masterUrl} from Release.`);
        }
    } else {
        enqueueTracks = true;
        releaseInfo.masterId = null;
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
                //await RequestQueue.add({ url: baseDomain + "/track/" + trackId });
            }
        }
    }

    releaseInfo.releaseDuration = releaseDuration;
    /////////////////////////////////

    masterDB = await DBContext.getMaster(connectionPool, masterId);
    if (!masterDB) {
        if (releaseInfo.masterId) {
            let masterInfo = {
                id: releaseInfo.masterId,
                have: 0,
                want: 0,
                datePublished: 1800,
                name: "",
                numTracks: 0,
            }

            DBContext.insertOrUpdateMaster(connectionPool, masterInfo);
        }
    }

    DBContext.insertRelease(connectionPool, releaseInfo);
    ////////////////////////////////

    if (enqueueTracks) {
        //log.info(`Enqueued ${trackTitles.length} Tracks from Release.`);
    }

    //log.info(`Release: ${JSON.stringify(releaseInfo)}`);
    log.info("=================");

};

exports.crawlRelease = crawlRelease;