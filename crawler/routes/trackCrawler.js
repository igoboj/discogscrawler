const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlTrack = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title').text();
    log.info(`The title of "${request.url}" is: ${title}.`);

    let dsDataScript = $('script[id="dsdata"]');
    let data = dsDataScript[0].children[0].data;
    let dsData = JSON.parse("{\"" + data.slice(data.indexOf("apiServer"), -17).trim().slice(0, -1));

    let trackInfo = {};
    const songTitle = dsData.pageObject.title;
    const compId = dsData.pageObject.objectId;

    log.info("--------------");
    log.info("TRACK");
    log.info("--------------");
    log.info(`Title - ${songTitle}`);
    log.info(`CompositionId - ${compId}`);


    const $trackFacetWrapper = $('div.facets_nav');
    for (i = 0; i < $trackFacetWrapper.length; i++) {
        const group = $trackFacetWrapper[i];
        const groupName = group.match(/FacetGroup (.*)/i)[1];
        if(!trackInfo[groupName]) {
            trackInfo[groupName] = {};
        }
        trackInfo[groupName].all = group.children[0].children[1].data;

        for (j = 1; j < group.children.length; j++) {
            const valueName = group.children[j].children[0].data;
            const valueCount = parse_int(group.children[j].children[1].data,10);
            trackInfo[groupName][valueName] = valueCount;
        }
    }

    const $trackFactWrapper = $('div.TrackFact > div.content');
    for (i = 0; i < $trackFactWrapper.length; i++) {
        const trackFact = $trackFactWrapper[i];
        const factName = trackFact.children[1].children[0].data;
        log.info(`${factName}:`);
        switch (factName) {
            case "Release Date":
                trackInfo.releaseDate = trackFact.children[2].data.trim();
                log.info(trackInfo.releaseDate);
                break;
            case "Stats":
                const factHave = trackFact.children[3].children[0].data.trim().match(/Have: ([0-9]+)/i)[1];
                const factWant = trackFact.children[5].children[0].data.trim().match(/Want: ([0-9]+)/i)[1];
                trackInfo.have = parseInt(factHave, 10);
                trackInfo.want = parseInt(factWant, 10);
                log.info(`Have - ${trackInfo.have}`);
                log.info(`Want - ${trackInfo.want}`);

                break;
            case "Notes":
                trackInfo.notes = trackFact.children[3].children[1].children[0].data.trim();
                log.info(trackInfo.notes);
                break;
            case "written-by":
                trackInfo.writtenBy = await handleArtistList(trackFact.children, baseDomain, requestQueue, $);
                break;
            case "composed by":
                trackInfo.composedBy = await handleArtistList(trackFact.children, baseDomain, requestQueue, $);
                break;
            case "concept by":
                trackInfo.conceptBy = await handleArtistList(trackFact.children, baseDomain, requestQueue, $);
                break;
            case "created by":
                trackInfo.createdBy = await handleArtistList(trackFact.children, baseDomain, requestQueue, $);
                break;
            case "lyrics by":
                trackInfo.lyricsBy = await handleArtistList(trackFact.children, baseDomain, requestQueue, $);
                break;
            case "music by":
                trackInfo.musicBy = await  handleArtistList(trackFact.children, baseDomain, requestQueue, $);
                break;
            case "arranged by":
                trackInfo.arrangedBy = await handleArtistList(trackFact.children, baseDomain, requestQueue, $);
                break;
            case "programmed by":
                trackInfo.programmedBy = await handleArtistList(trackFact.children, baseDomain, requestQueue, $);
                break;
            case "songwriter":
                trackInfo.songwriters = await handleArtistList(trackFact.children, baseDomain, requestQueue, $);
                break;
            default:
                log.error(`Unscraped track fact - ${factName}`);
        }
    };
    
    log.info(JSON.stringify(trackInfo));
    log.info("--------------");

    // TODO add youtube links to compositions
    // 
};

async function handleArtistList(list, baseDomain, requestQueue, $) {
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

exports.crawlTrack = crawlTrack;