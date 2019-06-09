const Apify = require('apify');
const { utils: { log } } = Apify;

const crawlSearch = async ({ request, $ }, { requestQueue, baseDomain }) => {
    const title = $('title');
    log.info("=================");
    log.info(`SEARCH - ${title.text()} []`);
    log.info("--------------");

    let pageNumber = request.url.match(/.*page=([0-9]+).*/i);

    if (!pageNumber) {
        let pageSize = parseInt(request.url.match(/.*limit=([0-9]+).*/i)[1], 10);
        if (!pageSize) {
            pageSize = 50;
        }

        let pagination = $('strong.pagination_total');
        let totalItemCount = 0;
        if (pagination && pagination.length) {
            const dotless = pagination[0].children[0].data.replace(",", "");
            totalItemCount = parseInt(dotless.match(/.*of ([0-9]+)/i)[1], 10);
        }

        log.info(`PageSize: ${pageSize}`);
        log.info(`ItemCount: ${totalItemCount}`);

        const pageCount = Math.ceil(totalItemCount / pageSize);
        for (i = 0; i < pageCount; i++) {
            requestQueue.addRequest({ url: request.url + `&page=${i}` });
        }
        log.info(`Enqueued ${pageCount} search pages.`);

    } else {
        log.info("Processing page: " + pageNumber[1]);
        // TODO queue albums
    }


    log.info("=================");
};

exports.crawlSearch = crawlSearch;