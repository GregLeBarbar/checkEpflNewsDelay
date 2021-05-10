let axios = require('axios');
const cheerio = require('cheerio');

function getNewsRestApiUrl(withoutCache=true) {
  let newsRestApiUrl = 'https://actu.epfl.ch/api/v1/channels/1/news/?format=json&limit=1&lang=en';
  if (withoutCache) {
    let currentTime = Date.now();
    newsRestApiUrl += '&currentTime=' + currentTime;
  }
  return newsRestApiUrl;
}

async function getLastFromAPI() {

  let newsRestApiUrl = getNewsRestApiUrl();
  //console.log(newsRestApiUrl);
  let response = await axios.get(newsRestApiUrl);
  //console.log(response.headers);
  result = response.data.results[0];
  let lastNews = {};
  lastNews['id'] = result.id;
  lastNews['title'] = result.title;
  lastNews['publish_date'] = result.publish_date;
  lastNews['channel_name'] = result.channel.name;
  lastNews['server'] = response.headers.server;
  lastNews['cf-cache-status'] = response.headers['cf-cache-status'];
  lastNews['call_api_date'] = response.headers.date;
  return lastNews;
}

async function scrapeNewsFrom(url) {
  const response = await axios.get(url);
  let $ = cheerio.load(response.data);

  //class="fullwidth-teaser-title"
  let newsTitle = $(".fullwidth-teaser-title").children("h3").first().html();

  let newsFromWww = {};
  newsFromWww['title'] = newsTitle;
  newsFromWww['call_api_date'] = response.headers.date;
  newsFromWww['server'] = response.headers.server;
  newsFromWww['cf-cache-status'] = response.headers['cf-cache-status'];
  newsFromWww['x-varnish-cache'] = response.headers['x-varnish-cache'];

  return newsFromWww;
}

async function main(cache) {


  /*
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  console.log('\x1b[36m', "Informations provenant de l'API REST d'actu: ", '\x1b[0m');
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  */
  let lastNewsFromApi = await getLastFromAPI();
  
  //console.log(lastNewsFromApi);

  /*
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  console.log('\x1b[36m', "Informations provenant de www avec caches  : ", '\x1b[0m');
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  */
  let url1 = "https://www.epfl.ch/en";
  let newsFromWww = await scrapeNewsFrom(url1);
  let key1 = 'www_' + newsFromWww.title;
  if (!cache.hasOwnProperty(key1)) {
    cache[key1] = newsFromWww['call_api_date'];
  }

  // console.info(newsFromWww);

  /*
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  console.log('\x1b[36m', "Informations sans varnish sans cloudflare  : ", '\x1b[0m');
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  */
  let url2 = "https://servicedesk-sandbox.epfl.ch/actu-without-varnish/";
  let newsFromWithOutCache = await scrapeNewsFrom(url2);
  let key2 = 'sans_varnish_sans_cloudflare_' + newsFromWithOutCache.title;
  if (!cache.hasOwnProperty(key2)) {
    cache[key2] = newsFromWithOutCache['call_api_date'];
  }
  //console.info(newsFromWithOutCache);

  /*
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  console.log('\x1b[36m', "Informations sans varnish avec cloudflare  : ", '\x1b[0m');
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  */
  let url3 = "https://www.epfl.ch/campus/services/website/canari/actu-without-varnish/";
  let newsFromWithOutVarnish = await scrapeNewsFrom(url3);
  let key3 = 'sans_varnish_avec_cloudflare_' + newsFromWithOutVarnish.title;
  if (!cache.hasOwnProperty(key3)) {
    cache[key3] = newsFromWithOutVarnish['call_api_date'];
  }
  //console.info(newsFromWithOutVarnish);

  /*
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  console.log('\x1b[36m', "Informations avec varnish sans cloudflare  : ", '\x1b[0m');
  console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
  */
  let url4 = "https://servicedesk-sandbox.epfl.ch/actu/";
  let newsFromWithOutCloudflare = await scrapeNewsFrom(url4);
  let key4 = 'avec_varnish_sans_cloudflare_' + newsFromWithOutCloudflare.title;
  if (!cache.hasOwnProperty(key4)) {
    cache[key4] = newsFromWithOutCloudflare['call_api_date'];
  }
  //console.info(newsFromWithOutCloudflare);
    if (nbKeys !== Object.keys(cache).length) {
      console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
      console.log('\x1b[36m', "Cache : ", '\x1b[0m');
      console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
      console.log(cache);
    }
    nbKeys = Object.keys(cache).length;
    
}

let index = 1;
let cache = {};
let nbKeys = 0;

setInterval(() => {
  
/*
    console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
    console.log('\x1b[36m', "Itération " + index, '\x1b[0m');
    console.log('\x1b[36m', "-------------------------------------------: ", '\x1b[0m');
*/
  
  main(cache);
  
  index++;
}, 15000);

