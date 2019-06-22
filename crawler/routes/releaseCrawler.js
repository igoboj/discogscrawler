const Apify = require('apify');
const sql = require("mssql");
const { utils: { log } } = Apify;

const crawlRelease = async ({ request, $ }, { requestQueue, baseDomain }, connectionPool) => {
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
            //requestQueue.addRequest({ url: baseDomain + "/label/" + labelId });
            log.info(`Enqueued Label (${labelId}) - ${labelWrapper[i].attribs.href} from Release.`);
        }
    }

    releaseInfo.id = parseInt(request.url.match(/.*\/release\/([0-9]+)/i)[1], 10);
    let enqueueTracks = true;
    if (masterWrapper.length > 0) {
        let masterUrl = masterWrapper[0].attribs.href;
        let masterId = masterUrl.match(/.*\/master\/([0-9]+)/i)[1];
        releaseInfo.masterId = masterId;
        requestQueue.addRequest({ url: baseDomain + "/rls/master/" + masterId });
        log.info(`Enqueued Master (${masterId}) - ${masterUrl} from Release.`);
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
                //requestQueue.addRequest({ url: baseDomain + "/track/" + trackId });
            }
        }
    }

    releaseInfo.releaseDuration = releaseDuration;
    insertData(connectionPool, releaseInfo);

    if (enqueueTracks) {
        //log.info(`Enqueued ${trackTitles.length} Tracks from Release.`);
    }
    ////////////////////////////////

    //log.info(`Release: ${JSON.stringify(releaseInfo)}`);
    log.info("=================");

};

async function insertData(connectionPool, releaseInfo) {

    connectionPool.then(async (pool) =>  {
        if (releaseInfo.masterId) {
            const sqlRequest = new sql.Request(pool);
            await sqlRequest
                .input('masterId', sql.Int, releaseInfo.masterId)
                .query('SELECT * FROM Master WHERE IdMaster=@masterId')
                .then(async result => {
                    if (result.recordset.length == 0) {
                        const masterRequest = new sql.Request(pool);
                        await masterRequest
                            .input('id', sql.Int, releaseInfo.masterId)
                            .input('have', sql.Int, 0)
                            .input('want', sql.Int, 0)
                            .input('published', sql.Int, 1800)
                            .input('name', sql.NVarChar, "")
                            .input('trackCount', sql.Int, 0)
                            .query('INSERT INTO Master VALUES(@id,@have,@want,@published,@name,@trackCount)')
                            .then(result => {
                                log.info(`Inserted empty Master: ${result.rowsAffected}`);
                            })
                            .catch(err => {
                                log.error(`Error while inserting row in Master: ${err.message}`);
                            });
                    }
                })
                .catch(err => {
                    log.error(`Error while inserting row in Master: ${err.message}`);
                });
        }

        const sqlRequest = new sql.Request(pool);
        await sqlRequest
            .input('id', sql.Int, releaseInfo.id)
            .input('have', sql.Int, releaseInfo.have || 0)
            .input('want', sql.Int, releaseInfo.want || 0)
            .input('published', sql.Int, releaseInfo.datePublished)
            .input('name', sql.NVarChar, releaseInfo.name)
            .input('trackCount', sql.Int, releaseInfo.numTracks)
            .input('description', sql.NVarChar, releaseInfo.description)
            .input('ratingCount', sql.Int, releaseInfo.rating ? releaseInfo.rating.ratingCount : 0)
            .input('ratingValue', sql.Float, releaseInfo.rating ? releaseInfo.rating.ratingValue : 0)
            .input('format', sql.NVarChar, releaseInfo.format)
            .input('country', sql.NVarChar, releaseInfo.country)
            .input('duration', sql.Int, releaseInfo.releaseDuration)
            .input('masterId', sql.Int, releaseInfo.masterId)
            .query('INSERT INTO Release ([IdRelease],[Have],[Want],[Published],[Name],[TrackCount],[Description],[RatingCount],[RatingValue],[Format],[Country],[Duration],[IdMaster]) ' +
                'VALUES(@id,@have,@want,@published,@name,@trackCount,@description,@ratingCount,@ratingValue,@format,@country,@duration,@masterId)')
            .then(result => {
                log.info(`Inserted row in Release: ${result.rowsAffected}`);
            })
            .catch(err => {
                log.error(`Error while inserting row in Release: ${err.message}`);
            });
    });
}

exports.crawlRelease = crawlRelease;