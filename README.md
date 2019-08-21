# discogscrawler
www.discogs.com Crawler

This repo contains a nodejs crawler/scrapper of the Discogs website.
It collects data about albums & more and stores them to a SQL database.
HTTP Requests are sent over a TOR proxy, and the IP is dynamically changed when the Discogs rate limit is reached.

Running the crawler: 
1. Run tor.exe with the path pointing to the torcc file - tor.exe -f ../Data/Tor/torrc
2. Specify the root country to start the crawl from
3. node main.js
