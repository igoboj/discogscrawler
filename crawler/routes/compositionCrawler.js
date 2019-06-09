const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlComposition = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title').text();

    let dsDataScript = $('script[id="dsdata"]');
    let dsData = JSON.parse(dsDataScript.text().trim().slice(42, -15));

    let compositionInfo = {};
    const songTitle = dsData.pageObject.title;
    const compId = dsData.pageObject.objectId;

    log.info("=================");
    log.info(`COMPOSITION - ${songTitle} [${compId}]`);
    log.info("--------------");

    // Crawl through dsdata.releases and collect facets (styles, genres, etc)
    let facetCounters = {};
    const releases = dsData["tracks/table:discography"].releases;
    for (i = 0; i < releases.length; i++) {
        const release = releases[i];
        handleArrayFacet("styles", release, facetCounters);
        handleArrayFacet("genres", release, facetCounters);
        handleFacet("country", release, facetCounters);
        handleFacet("decade", release, facetCounters, (year) => { return year.toString(); });
        handleArrayFacet("formats", release, facetCounters, (formatObj) => { return formatObj.name });
    }
    compositionInfo.facets = facetCounters;

    const $compositionFactWrapper = $('div.TrackFact > div.content');
    for (i = 0; i < $compositionFactWrapper.length; i++) {
        const compositionFact = $compositionFactWrapper[i];
        const factName = compositionFact.children[1].children[0].data;
        switch (factName) {
            case "Release Date":
                compositionInfo.releaseDate = compositionFact.children[2].data.trim();
                break;
            case "Stats":
                const factHave = compositionFact.children[3].children[0].data.trim().match(/Have: ([0-9]+)/i)[1];
                const factWant = compositionFact.children[5].children[0].data.trim().match(/Want: ([0-9]+)/i)[1];
                compositionInfo.have = parseInt(factHave, 10);
                compositionInfo.want = parseInt(factWant, 10);

                break;
            case "Notes":
                compositionInfo.notes = compositionFact.children[3].children[1].children[0].data.trim();
                break;
            case "written-by":
                compositionInfo.writtenBy = await handleArtistList(compositionFact.children, requestQueue, $);
                break;
            case "composed by":
                compositionInfo.composedBy = await handleArtistList(compositionFact.children, requestQueue, $);
                break;
            case "concept by":
                compositionInfo.conceptBy = await handleArtistList(compositionFact.children, requestQueue, $);
                break;
            case "created by":
                compositionInfo.createdBy = await handleArtistList(compositionFact.children, requestQueue, $);
                break;
            case "lyrics by":
                compositionInfo.lyricsBy = await handleArtistList(compositionFact.children, requestQueue, $);
                break;
            case "music by":
                compositionInfo.musicBy = await handleArtistList(compositionFact.children, requestQueue, $);
                break;
            case "arranged by":
                compositionInfo.arrangedBy = await handleArtistList(compositionFact.children, requestQueue, $);
                break;
            case "programmed by":
                compositionInfo.programmedBy = await handleArtistList(compositionFact.children, requestQueue, $);
                break;
            case "songwriter":
                compositionInfo.songwriters = await handleArtistList(compositionFact.children, requestQueue, $);
                break;
            default:
                log.error(`Unscraped composition fact - ${factName}`);
        }
    };

    //log.info(JSON.stringify(compositionInfo));
    log.info("=================");

    // TODO add youtube links to compositions
    // 
};

function handleArrayFacet(facetName, release, facetCounters, facetMapFunction) {
    if (release[facetName] && release[facetName].length > 0) {
        for (j = 0; j < release[facetName].length; j++) {
            const facetValue = facetMapFunction ? facetMapFunction(release[facetName][j]) : release[facetName][j];

            if (!facetCounters[facetName]) {
                facetCounters[facetName] = {
                    "all": 0,
                }
            }

            if (!facetCounters[facetName][facetValue]) {
                facetCounters[facetName][facetValue] = 0;
            }

            facetCounters[facetName][facetValue]++;
            facetCounters[facetName]["all"]++;
        }
    }
}

function handleFacet(facetName, release, facetCounters, facetMapFunction) {
    if (release[facetName]) {
        const facetValue = facetMapFunction ? facetMapFunction(release[facetName]) : release[facetName];

        if (!facetCounters[facetName]) {
            facetCounters[facetName] = {
                "all": 0,
            }
        }

        if (!facetCounters[facetName][facetValue]) {
            facetCounters[facetName][facetValue] = 0;
        }

        facetCounters[facetName][facetValue]++;
        facetCounters[facetName]["all"]++;
    }
}

async function handleArtistList(list, requestQueue, $) {
    let artistList = new Array((list.length - 3) / 2);
    let artistIndex = 0;
    for (listIterator = 3; listIterator < list.length; listIterator++) {
        let artistName = list[listIterator].children[3].children[1].children[0].data.trim();
        let artistId = list[listIterator].attribs.href.match(/.*\/artist\/([0-9]+)\-.*/i)[1];
        let artistLink = list[listIterator++].attribs.href.match(/(.*)\/track/i)[1];
        artistList[artistIndex++] = {
            name: artistName,
            id: artistId,
        };

        await requestQueue.addRequest({ url: artistLink });
    }
    return artistList;
}

exports.crawlComposition = crawlComposition;