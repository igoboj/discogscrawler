
const Apify = require('apify');
const ArtistCrawler = require('./routes/artistCrawler');
const CompositionCrawler = require('./routes/compositionCrawler.js');
const MasterCrawler = require('./routes/masterCrawler.js');
const ReleaseCrawler = require('./routes/releaseCrawler');
const { utils: { log } } = Apify;

function createRouter(globalContext) {
    return async function (requestContext) {
        const { $, request } = requestContext;

        if ($('div#page_content > h1').length == 1 && $('div#page_content > h1')[0].children[0].data == "404! Oh no!") {
            log.info(`[[[[ 404 ${request.url} 404 ]]]]`);
            return () => { };
        }

        const urlArr = request.url.split('/').slice(2);
        let route;

        if (urlArr[2] === "master") {
            route = MasterCrawler.crawlMaster;

        } else if (urlArr[2] === "release") {
            route = ReleaseCrawler.crawlRelease;

        } else if (urlArr[1] === "track" || urlArr[1] === "composition") {
            route = CompositionCrawler.crawlComposition;

        } if (urlArr[1] === "artist") {
            route = ArtistCrawler.crawlArtist;
            
        }

        if (!route) {
            log.info(`!!!!!!! No route defined for url ${request.url} !!!!!!!`);
            return () => { };
        } else {
            return route(requestContext, globalContext);
        }
    }
}

exports.createRouter = createRouter;