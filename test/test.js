'use strict';
var cheerio = require('cheerio');
var request = require('request');
var assert = require('assert');
var urlInfoScraper = require('../');
var isLinkValid = require('../lib/validLink');
var httpPrefixer = require('../lib/httpPrefixer');
var metadata = require('../lib/metadata');

describe('HTTP Prefixer submodule', function () {
  it('must add http:// to a string that does not have it', function () {
    assert.equal(httpPrefixer('google.com'), 'http://google.com');
  });
  it('must NOT add http:// to a string that already has it', function () {
    assert.equal(httpPrefixer('http://google.com'), 'http://google.com');
  });
  it('must ignore non-strings', function () {
    var testObj = {};
    assert.equal(httpPrefixer(testObj), testObj);
  });
});

describe('validLink submodule', function () {
  it('must return true for a valid link', function () {
    assert(isLinkValid('http://google.com'));
  });
  it('must return true for a valid https link', function () {
    assert(isLinkValid('https://google.com'));
  });
  it('must return false for an invalid link', function () {
    assert(!isLinkValid('http://this is not a web link!!'));
  });
  it('must return false for an object', function () {
    assert(!isLinkValid({hello: 'this object is not a weblink'}));
  });
  it('must return false for obviously invalid links', function () {
    assert(!isLinkValid('go  ogle.  com'));
    assert(!isLinkValid('mailto:someemailaddress@email.com'));
    assert(!isLinkValid('javascript'));
  });
});

describe('Metadata submodule', function () {
  it('returns the first title if there are many', function (done) {
    var url = "https://twilio.com";
    var options = { timeout: 4000, url: url };
    request(options, function (error, res, body) {
      assert(!error);
      var $ = cheerio.load(body);
      var title = $('title').first().text();
      metadata.getMeta(res.headers, body, url, function(err, metadata) {
        assert.equal(title, metadata.title);
        done();
      });
    });
  });
});

describe('url-info-scraper node module', function () {
  this.timeout(25000);

  it('must return a status object', function (done) {
    urlInfoScraper('http://google.com', function(error, statusObj) {
      assert(typeof statusObj === 'object');
      done();
    });
  });

  it('must return a status object for links without an http prefix', function (done) {
    urlInfoScraper('google.com', function(error, statusObj) {
      assert(typeof statusObj === 'object');
      done();
    });
  });

  it('must return a status object with false in it if provided with a url that is invalid', function (done) {
    urlInfoScraper('THIS IS AN INVALID LINK', function(error, statusObj) {
      assert(!statusObj.isWebResource);
      done();
    });
  });

  it('must return a title in the status object', function (done) {
    urlInfoScraper('http://google.com', function(error, statusObj) {
      assert(statusObj.title);
      done();
    });
  });

  it('must return a mime type in the status object', function (done) {
    urlInfoScraper('http://google.com', function(error, statusObj) {
      assert(statusObj.mime);
      done();
    });
  });

  it('must return a mime type of image for an image resource', function (done) {
    urlInfoScraper('https://www.w3schools.com/w3css/img_lights.jpg', function(error, statusObj) {
      assert.equal(statusObj.mime.substring(0,5), 'image');
      done();
    });
  });

  it('must handle 404s', function (done) {
    urlInfoScraper('http://httpstat.us/404', function(error, statusObj) {
      assert(statusObj.isWebResource);
      done();
    });
  });

  it('must handle 500s', function (done) {
    urlInfoScraper('http://httpstat.us/500', function(error, statusObj) {
      assert(statusObj.isWebResource);
      done();
    });
  });

  it('must handle links that do not exist', function (done) {
    urlInfoScraper('http://fsdalfjsdlkfjlsdjflskajflaskdjfla.com/400/200/', function(error, statusObj) {
      assert(!statusObj.isWebResource);
      done();
    });
  });

  it('must not download files greater than 5mb, that have the correct content length header', function (done) {
    urlInfoScraper('http://edmullen.net/test/rc.jpg', function(error, statusObj) {
      assert(statusObj.tooLarge);
      done();
    });
  });

  it('must not download files greater than 5mb, that do not have the correct content length header', function (done) {
    urlInfoScraper('https://upload.wikimedia.org/wikipedia/commons/f/ff/Pizigani_1367_Chart_10MB.jpg', function(error, statusObj) {
      assert(statusObj.tooLarge);
      done();
    });
  });

  it('must not download items that have a mime type beginning with application', function (done) {
    urlInfoScraper('http://ipv4.download.thinkbroadband.com/5MB.zip', function(error, statusObj) {
      assert(!statusObj.parsable);
      done();
    });
  });

  it('must return a favicon url, from a url that has the favicon defined using the rel=icon tag', function (done) {
    urlInfoScraper('https://github.com/pauljohncleary/url-info-scraper', function(error, statusObj) {
      assert(statusObj.faviconUrl);
      done();
    });
  });

  it('must return a favicon url, from a url that has the favicon defined using the rel="shortcut icon" tag', function (done) {
    urlInfoScraper('https://en.wikipedia.org/wiki/Favicon#How_to_use', function(error, statusObj) {
      assert(statusObj.faviconUrl);
      done();
    });
  });

  it('must return a favicon url, from a url that has no link rel favicon defined', function (done) {
    urlInfoScraper('http://www.bbc.co.uk/', function(error, statusObj) {
      assert(statusObj.faviconUrl);
      done();
    });
  });

  it('must not crash when the mime type is missing from the HEAD response', function (done) {
    urlInfoScraper('www.hs.fi', function(error, statusObj) {
      assert(statusObj);
      done();
    });
  });

});
