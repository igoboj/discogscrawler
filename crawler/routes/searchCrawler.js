const Apify = require('apify');
const { utils: { log } } = Apify;


const pageSize = 250;

const crawlSearch = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title');
    log.info("=================");
    log.info(`SEARCH - ${title.text()} []`);
    log.info("--------------");

    let defaultMatch = request.url.match(/.*\/search\/\?country_exact=([a-zA-Z]+)$/i);
    let pageNumberMatch = request.url.match(/.*&page=([0-9]+)/i);

    if (defaultMatch && defaultMatch.length == 2) {
        // Starting SearchPage

        let decadeWrapper = $('ul.facets_nav > li > a');
        let max = 1800;
        let min = 2020;
        for (i = decadeWrapper.length - 1; i >= 0; i--) {
            let decadeHref = decadeWrapper[i].attribs.href;
            let decadeMatch = decadeHref.match(/decade=([0-9]+)/i);
            if (decadeMatch) {
                let decade = parseInt(decadeMatch[1], 10);
                if (decade < min) {
                    min = decade;
                }
                if (decade > max) {
                    max = decade;
                }
            } else {
                break;
            }
        }

        let UrlQueryParams = "&limit=250&sort=title%2Casc&layout=sm";
        for (i = min; i <= (max + 9); i++) {
            let yearQueryParam = "&year=" + i.toString();
            requestQueue.addRequest({ url: request.url + UrlQueryParams + yearQueryParam });
        }
    } else if (!pageNumberMatch) {
        // Year SearchPage

        let pagination = $('strong.pagination_total');
        let totalItemCount = 0;
        if (pagination && pagination.length) {
            const dotless = pagination[0].children[0].data.replace(",", "");
            totalItemCount = parseInt(dotless.match(/.*of ([0-9]+)/i)[1], 10);
        }

        log.info(`PageSize: ${pageSize}`);
        log.info(`ItemCount: ${totalItemCount}`);


        const pageCount = Math.ceil(totalItemCount / pageSize);
        for (i = 1; i <= pageCount; i++) {
            requestQueue.addRequest({ url: request.url + `&page=${i.toString()}` });
        }
        log.info(`Enqueued ${pageCount} search pages.`);
    } else {
        // Default SearchPage
        let pageNumber = request.url.match(/.*page=([0-9]+).*/i);
        log.info("Processing page: " + pageNumber[1]);
        // TODO queue albums
    }


    log.info("=================");
};

exports.crawlSearch = crawlSearch;