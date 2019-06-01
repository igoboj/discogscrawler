
const Apify = require('apify');
const TrackCrawler = require('./routes/trackCrawler');
const ReleaseCrawler = require('./routes/compositionCrawler');
const ArtistCrawler = require('./routes/artistCrawler');
const { utils: { log } } = Apify;

function createRouter(globalContext) {
    return async function(requestContext) {
        const { page, request } = requestContext;

        if($('div#page_content > h1').length == 1 && $('div#page_content > h1')[0].children[0].data == "404! Oh no!") {
            log.info(`[[[[ 404 ${request.url} 404 ]]]]`);
            return () => {};
        }

        const urlArr = request.url.split('/').slice(2);
        let route;

        if(urlArr[2] === "master" || urlArr[2] === "release") {
            log.debug("Invoking route: release");
            route = ReleaseCrawler.releaseComposition;
        } else if(urlArr[1] === "track" || urlArr[1] === "composition") {
            log.debug("Invoking route: track");
            route = TrackCrawler.crawlTrack;
        } if(urlArr[1] === "artist") {
            log.debug("Invoking route: artist");
            //route = ArtistCrawler.crawlArtist;
            return () => {};
        }

        if(!route) {
            log.info(`!!!!!!! No route defined for url ${request.url} !!!!!!!`);
            return () => {};
        } else {
            return route(requestContext, globalContext);
        }
    }
}

exports.createRouter = createRouter;