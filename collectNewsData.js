let axios = require("axios");
const cheerio = require("cheerio");

function msToTime(duration) {
  var milliseconds = Math.floor((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

function getNewsRestApiUrl(withoutCache = true) {
  let newsRestApiUrl =
    "https://actu.epfl.ch/api/v1/channels/571/news/?format=json&limit=1&lang=en";
  if (withoutCache) {
    let currentTime = Date.now();
    newsRestApiUrl += "&currentTime=" + currentTime;
  }
  return newsRestApiUrl;
}

async function getLastFromAPI() {
  let lastNews = {};
  try {
    let newsRestApiUrl = getNewsRestApiUrl();
    //console.log(newsRestApiUrl);
    let response = await axios.get(newsRestApiUrl);
    //console.log(response.headers);
    result = response.data.results[0];

    lastNews["url"] = newsRestApiUrl;
    lastNews["id"] = result.id;
    lastNews["title"] = result.title;
    lastNews["publish_date"] = result.publish_date;
    lastNews["channel_name"] = result.channel.name;
    lastNews["server"] = response.headers.server;
    lastNews["cf-cache-status"] = response.headers["cf-cache-status"];
    lastNews["call_api_date"] = response.headers.date;
    lastNews["x-varnish-cache"] =
      response.headers["x-varnish-cache"] || "no-information";
    lastNews["cache-control"] =
      response.headers["cache-control"] || "no-information";
    lastNews["expect-ct"] = response.headers["expect-ct"] || "no-information";
  } catch (error) {}
  return lastNews;
}

async function scrapeNewsFrom(url) {
  let news = {};
  try {
    const response = await axios.get(url);
    let $ = cheerio.load(response.data);

    //class="fullwidth-teaser-title"
    let newsTitle = $(".fullwidth-teaser-title").children("h3").first().html();

    news["url"] = url;
    news["title"] = newsTitle;
    news["call_api_date"] = response.headers.date;
    news["server"] = response.headers.server || "no-information";
    news["cf-cache-status"] =
      response.headers["cf-cache-status"] || "no-information";
    news["x-varnish-cache"] =
      response.headers["x-varnish-cache"] || "no-information";
    news["cache-control"] =
      response.headers["cache-control"] || "no-information";
    news["expect-ct"] = response.headers["expect-ct"] || "no-information";
  } catch (error) {}
  return news;
}

async function writeLog(jsonlogData) {
  const fs = require("fs");
  const os = require("os");

  const path =
    "/home/greg/workspace-idevfsd/collectNewsData/ws_call_log.delay-news.log";

  fs.writeFile(path, jsonlogData + os.EOL, { flag: "a" }, function (err) {
    if (err) {
      return console.log(err);
    }
  });
}

async function getJsonLogData(data) {
  let logData = {};

  try {
    // Todo:
    // - la vraie current date-time
    // - ajouter tous les champs: url, ...

    let currentTime = new Date(Date.now()).toISOString();
    logData["@timegenerated"] = currentTime;
    logData["priority"] = "INFO";
    logData["verb"] = "GET";
    logData["code"] = "200";

    logData["url"] = data["url"];
    logData["title"] = data["title"];
    logData["call_api_date"] = data["call_api_date"];
    logData["server"] = data["server"];
    logData["cf-cache-status"] = data["cf-cache-status"];
    logData["x-varnish-cache"] = data["x-varnish-cache"];

    logData["cache-control"] = data["cache-control"];
    logData["expect-ct"] = data["expect-ct"];
    logData["expect-ct"] = data["expect-ct"];
    logData["expect-ct"] = data["cache_type"]
    logData["news-delay"] = data["delay"];

    // All data for website call
    /*
    logData["localcache"] = "hit";
    logData["src"] = "https://www.epfl.ch/fr";
    logData["targethost"] = "https://memento.epfl.ch";
    logData["targetpath"] = "/api/v1/mementos/1/events/";
    logData["targetquery"] = "format=json&lang=fr,en&limit=5&period=upcoming";
    logData["responsetime"] = 0;
    */
  } catch (error) {}

  return JSON.stringify(logData);
}

async function main(cache) {
  // Call API REST
  let newsFromApi = await getLastFromAPI();

  let publishedDateFromApi = newsFromApi["publish_date"];

  let key0 = "apirest_" + newsFromApi.title;
  if (!cache.hasOwnProperty(key0)) {
    cache[key0] = newsFromApi["publish_date"];

    msDiff = Math.abs(
      new Date(newsFromApi["call_api_date"]) -
        new Date(publishedDateFromApi)
    );

    newsFromApi["delay"] = msDiff;
    newsFromApi["cache_type"] = "rest_api";

    let jsonlogData = await getJsonLogData(newsFromApi);
    console.log(jsonlogData);
    //await writeLog(jsonlogData);
  }

  // Call www - Page with cloudflare and varnish cache
  let urlWithVarnishAndCloudflare = "https://www.epfl.ch/campus/services/website/canari/actu-varnish-cloudflare/";
  let newsFromWww = await scrapeNewsFrom(urlWithVarnishAndCloudflare);

  let key1 = "www_" + newsFromWww.title;
  if (!cache.hasOwnProperty(key1)) {
    cache[key1] = newsFromWww["call_api_date"];

    newsFromWww["cache_type"] = "varnish_cloudflare";

    msDiff = Math.abs(
      new Date(newsFromWww["call_api_date"]) - new Date(publishedDateFromApi)
    );
    newsFromWww["delay"] = msDiff;
    //msToTime(msDiff);

    let jsonlogData = await getJsonLogData(newsFromWww);
    console.log(jsonlogData);
    //await writeLog(jsonlogData);
  }

  // Call page without cloudflare and without varnish cache
  let url2 = "https://servicedesk-sandbox.epfl.ch/actu-no-varnish-no-cloudflare/";
  let newsFromWithOutCache = await scrapeNewsFrom(url2);

  let key2 = "sans_varnish_sans_cloudflare_" + newsFromWithOutCache.title;
  if (!cache.hasOwnProperty(key2)) {
    cache[key2] = newsFromWithOutCache["call_api_date"];

    newsFromWithOutCache["cache_type"] = "novarnish_nocloudflare";

    msDiff = Math.abs(
      new Date(newsFromWithOutCache["call_api_date"]) -
        new Date(publishedDateFromApi)
    );
    newsFromWithOutCache["delay"] = msDiff;
    //msToTime(msDiff);

    let jsonlogData = await getJsonLogData(newsFromWithOutCache);
    console.log(jsonlogData);
    //await writeLog(jsonlogData);
  }

  // Call page with cloudflare and without varnish cache
  
  let url3 =
    "https://www.epfl.ch/campus/services/website/canari/actu-no-varnish-cloudflare/";
  let newsFromWithOutVarnish = await scrapeNewsFrom(url3);
  let key3 = "sans_varnish_avec_cloudflare_" + newsFromWithOutVarnish.title;
  if (!cache.hasOwnProperty(key3)) {
    cache[key3] = newsFromWithOutVarnish["call_api_date"];

    newsFromWithOutVarnish["cache_type"] = "novarnish_cloudflare";

    msDiff = Math.abs(
      new Date(newsFromWithOutVarnish["call_api_date"]) -
        new Date(publishedDateFromApi)
    );
    newsFromWithOutVarnish["delay"] = msDiff;

    let jsonlogData = await getJsonLogData(newsFromWithOutVarnish);
    console.log(jsonlogData);
    //await writeLog(jsonlogData);
  }

  // Call page without cloudflare and with varnish cache
  let url4 = "https://servicedesk-sandbox.epfl.ch/actu-varnish-no-cloudflare/";
  let newsFromWithOutCloudflare = await scrapeNewsFrom(url4);
  let key4 = "avec_varnish_sans_cloudflare_" + newsFromWithOutCloudflare.title;
  if (!cache.hasOwnProperty(key4)) {
    cache[key4] = newsFromWithOutCloudflare["call_api_date"];

    newsFromWithOutCloudflare["cache_type"] = "varnish_nocloudflare";

    msDiff = Math.abs(
      new Date(newsFromWithOutCloudflare["call_api_date"]) -
        new Date(publishedDateFromApi)
    );
    newsFromWithOutCloudflare["delay"] = msDiff;

    let jsonlogData = await getJsonLogData(newsFromWithOutCloudflare);
    console.log(jsonlogData);
    //await writeLog(jsonlogData);
  }
}

let cache = {};

setInterval(() => {
  try {
    main(cache);
  } catch (error) {}
}, 15000);
