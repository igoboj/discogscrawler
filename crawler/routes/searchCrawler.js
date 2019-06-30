
const log = require("./../log");


const pageSize = 250;

const crawlSearch = async ({ url, $ }, { RequestQueue, baseDomain }, connectionPool) => {
    const title = $('title');
    log.info("=================");
    log.info(`SEARCH - ${title.text()} []`);
    log.info("--------------");

    let defaultMatch = url.match(/.*\/search\/\?.*country_exact=([a-zA-Z]+)$/i);
    let pageNumberMatch = url.match(/.*&page=([0-9]+)/i);

    if (defaultMatch && defaultMatch.length == 2) {
        // Starting SearchPage

        let decadeWrapper = $('ul.facets_nav > li > a');
        for (i = decadeWrapper.length - 1; i >= 0; i--) {
            let decadeHref = decadeWrapper[i].attribs.href;
            let decadeMatch = decadeHref.match(/decade=([0-9]+)/i);
            if (decadeMatch) {
                let decadeItemCount = parseInt(decadeWrapper[i].children[1].children[0].data.replace(",", ""), 10);

                let decade = parseInt(decadeMatch[1], 10);
                let UrlQueryParams = "&limit=250&sort=title%2Casc&layout=sm";
                if (decadeItemCount < 10000) {
                    // Enqueue all
                    let decadeQueryParam = "&decade=" + decade.toString();
                    RequestQueue.add({ url: url + UrlQueryParams + decadeQueryParam + "&page=1" });
                } else {
                    // Split by year
                    for (j = decade; j <= (decade + 9); j++) {
                        let yearQueryParam = "&year=" + j.toString();
                        RequestQueue.add({ url: url + UrlQueryParams + yearQueryParam });
                    }
                }
            } else {
                break;
            }
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
            RequestQueue.add({ url: url + `&page=${i.toString()}` });
        }
        log.info(`Enqueued ${pageCount} search pages.`);
    } else {
        // Default SearchPage
        let pageNumber = url.match(/.*page=([0-9]+).*/i);
        log.info("Processing search page: " + pageNumber[1]);

        let searchResults = $('a.search_result_title');
        for (i = 0; i < searchResults.length; i++) {
            let resultMatch = searchResults[i].attribs.href.match(/.*\/(release|master)\/([0-9]+)$/i);
            let resultId = resultMatch[2];
            let resultType = resultMatch[1];
            RequestQueue.add({ url: baseDomain + `/rls/${resultType}/${resultId}` });
        }

        let pagination = $('strong.pagination_total');
        let totalItemCount = 0;
        if (pagination && pagination.length) {
            const dotless = pagination[0].children[0].data.replace(/\,/g, "");
            totalItemCount = parseInt(dotless.match(/.*of ([0-9]+)/i)[1], 10);
            if (totalItemCount > 250 * pageNumber[1]) {
                const nextSearchPage = "page=" + (parseInt(pageNumber[1], 10) + 1).toString(10);
                RequestQueue.add({
                    url: url.replace(/page=[0-9]+/i, nextSearchPage)
                });
            }
        }
        log.info(`Enqueued: ${searchResults.length} Releases/Masters`);
    }


    log.info("=================");
};

exports.crawlSearch = crawlSearch;