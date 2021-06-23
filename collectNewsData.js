let axios = require("axios");
const cheerio = require("cheerio");

let debug = false;

/*
function msToTime(duration) {
  var milliseconds = Math.floor((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}*/

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

    if (debug) {
      console.log("Title: " + result.title);
      console.log("Publish date: " + result.publish_date);
    }

    let publishDateInTitle = result.title.substring(9, 25).replace(" ", "T");
    
    if (!result.publish_date.startsWith(publishDateInTitle)) {
      console.log("ERROR !!!");
      console.log("Title: " + result.title);
      console.log("Publish date: " + result.publish_date);
      console.log("publishDateInTitle: " + publishDateInTitle);

      setTimeout(function(){
        // Do nothing
        let veritas = 42;
      }, 2000);//wait 2 seconds
      
      let response = await axios.get(newsRestApiUrl);
      //console.log(response.headers);
      result = response.data.results[0];

      console.log("Mieux ???");
      console.log("Title: " + result.title);
      console.log("Publish date: " + result.publish_date);
      console.log("publishDateInTitle: " + publishDateInTitle);
    }


    lastNews["url"] = newsRestApiUrl;
    lastNews["id"] = result.id;
    lastNews["title"] = result.title;

    const date = new Date(result.publish_date).toUTCString();
    const dec = 1000 * 60 * 60 * -2; // 2 hours

    const _date = new Date(date);
    lastNews["publish_date"] = new Date(_date.getTime() + dec).toUTCString();

    lastNews["channel_name"] = result.channel.name;
    lastNews["server"] = response.headers.server;
    lastNews["cf-cache-status"] = response.headers["cf-cache-status"];
    lastNews["call_api_date"] = new Date(response.headers.date).toUTCString();
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
    news["call_api_date"] = new Date(response.headers.date).toUTCString();
    news["server"] = response.headers.server || "no-information";
    news["cf-cache-status"] =
      response.headers["cf-cache-status"] || "no-information";
    news["x-varnish-cache"] =
      response.headers["x-varnish-cache"] || "no-information";

    //"x-varnish-cache-hits"
    news["x-varnish-cache-hits"] =
      response.headers["x-varnish-cache-hits"] || "no-information";
    // Age
    news["age"] = response.headers["age"];

    news["cache-control"] =
      response.headers["cache-control"] || "no-information";
    news["expect-ct"] = response.headers["expect-ct"] || "no-information";
  } catch (error) {}
  return news;
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
    logData["call-api-date"] = data["call_api_date"];
    logData["publish-date"] = data["publish_date"];
    logData["server"] = data["server"];
    logData["cf-cache-status"] = data["cf-cache-status"];
    logData["x-varnish-cache"] = data["x-varnish-cache"];
    logData["x-varnish-cache-hits"] = data["x-varnish-cache-hits"];

    logData["age"] = data["age"];
    logData["cache-control"] = data["cache-control"];
    logData["expect-ct"] = data["expect-ct"];
    logData["expect-ct"] = data["expect-ct"];
    logData["cache-type"] = data["cache_type"];
    logData["news-delay"] = data["delay"];

  } catch (error) {}

  return JSON.stringify(logData);
}

function calculateDiff(date1, date2) {
  return Math.abs(new Date(date1) - new Date(date2));
}

async function main(cache) {
  

  // Call API REST
  let newsFromApi = await getLastFromAPI();

  let publishedDateFromApi = newsFromApi["publish_date"];

  let key0 = "apirest_" + newsFromApi.title;
  if (!cache.hasOwnProperty(key0)) {
    cache[key0] = publishedDateFromApi;

    if (debug) {
      console.log("--------------------------------------------------");
      console.log("rest_api");

      console.log("DATE callApiDate: " + newsFromApi["call_api_date"]);
      console.log("DATE publishedDateFromApi: " + publishedDateFromApi);
    }

    msDiff = calculateDiff(newsFromApi["call_api_date"], publishedDateFromApi);

    if (debug) {
      console.log("msDiff API REST: " + msDiff);
    }

    newsFromApi["delay"] = msDiff;
    newsFromApi["cache_type"] = "rest_api";

    let jsonlogData = await getJsonLogData(newsFromApi);
    console.log(jsonlogData);
  }

  // Call www - Page with cloudflare and varnish cache
  let urlWithVarnishAndCloudflare =
    "https://www.epfl.ch/campus/services/website/canari/actu-varnish-cloudflare/";
  let newsFromWww = await scrapeNewsFrom(urlWithVarnishAndCloudflare);
  newsFromWww["publish_date"] = publishedDateFromApi;

  let key1 = "www_" + newsFromWww.title;
  if (!cache.hasOwnProperty(key1)) {
    cache[key1] = newsFromWww["call_api_date"];

    newsFromWww["cache_type"] = "varnish_cloudflare";
    if (debug) {
      console.log("--------------------------------------------------");
      console.log("varnish_cloudflare");

      console.log("DATE callApiDate: " + newsFromWww["call_api_date"]);
      console.log("DATE publishedDateFromApi: " + publishedDateFromApi);
    }
    msDiff = calculateDiff(newsFromWww["call_api_date"], publishedDateFromApi);
    if (debug) {
      console.log("msDiff varnish_cloudflare: " + msDiff);
    }

    newsFromWww["delay"] = msDiff;
    //msToTime(msDiff);

    let jsonlogData = await getJsonLogData(newsFromWww);
    console.log(jsonlogData);
    //await writeLog(jsonlogData);
  }

  // Call page without cloudflare and without varnish cache
  let url2 =
    "https://servicedesk-sandbox.epfl.ch/actu-no-varnish-no-cloudflare/";
  let newsFromWithOutCache = await scrapeNewsFrom(url2);
  newsFromWithOutCache["publish_date"] = publishedDateFromApi;

  let key2 = "sans_varnish_sans_cloudflare_" + newsFromWithOutCache.title;
  if (!cache.hasOwnProperty(key2)) {
    cache[key2] = newsFromWithOutCache["call_api_date"];

    newsFromWithOutCache["cache_type"] = "novarnish_nocloudflare";
    if (debug) {
      console.log("--------------------------------------------------");
      console.log("novarnish_nocloudflare");

      console.log("DATE callApiDate: " + newsFromWithOutCache["call_api_date"]);
      console.log("DATE publishedDateFromApi: " + publishedDateFromApi);
    }
    msDiff = calculateDiff(
      newsFromWithOutCache["call_api_date"],
      publishedDateFromApi
    );
    if (debug) {
      console.log("msDiff novarnish_nocloudflare: " + msDiff);
    }
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
  newsFromWithOutVarnish["publish_date"] = publishedDateFromApi;

  let key3 = "sans_varnish_avec_cloudflare_" + newsFromWithOutVarnish.title;
  if (!cache.hasOwnProperty(key3)) {
    cache[key3] = newsFromWithOutVarnish["call_api_date"];

    newsFromWithOutVarnish["cache_type"] = "novarnish_cloudflare";
    if (debug) {
      console.log("--------------------------------------------------");
      console.log("novarnish_cloudflare");

      console.log(
        "DATE callApiDate: " + newsFromWithOutVarnish["call_api_date"]
      );
      console.log("DATE publishedDateFromApi: " + publishedDateFromApi);
    }
    msDiff = calculateDiff(
      newsFromWithOutVarnish["call_api_date"],
      publishedDateFromApi
    );
    if (debug) {
      console.log("msDiff novarnish_cloudflare: " + msDiff);
    }
    newsFromWithOutVarnish["delay"] = msDiff;

    let jsonlogData = await getJsonLogData(newsFromWithOutVarnish);
    console.log(jsonlogData);
    //await writeLog(jsonlogData);
  }

  // Call page without cloudflare and with varnish cache
  let url4 = "https://servicedesk-sandbox.epfl.ch/actu-varnish-no-cloudflare/";
  let newsFromWithOutCloudflare = await scrapeNewsFrom(url4);
  newsFromWithOutCloudflare["publish_date"] = publishedDateFromApi;

  let key4 = "avec_varnish_sans_cloudflare_" + newsFromWithOutCloudflare.title;
  if (!cache.hasOwnProperty(key4)) {
    cache[key4] = newsFromWithOutCloudflare["call_api_date"];

    newsFromWithOutCloudflare["cache_type"] = "varnish_nocloudflare";
    if (debug) {
      console.log("--------------------------------------------------");
      console.log("varnish_nocloudflare");

      console.log(
        "DATE callApiDate: " +
          new Date(newsFromWithOutCloudflare["call_api_date"])
      );
      console.log("DATE publishedDateFromApi: " + publishedDateFromApi);
    }
    msDiff = calculateDiff(
      newsFromWithOutCloudflare["call_api_date"],
      publishedDateFromApi
    );
    if (debug) {
      console.log("msDiff varnish_nocloudflare: " + msDiff);
    }
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
