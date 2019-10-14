const puppeteer = require('puppeteer');
const assert = require('@brillout/reassert');
const getTestPort = require('../getTestPort');

module.exports = launchBrowser;

async function launchBrowser() {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  page.on('console', consoleObj => console.log(consoleObj.text()));

	/*
	page.on("pageerror", function(err) {
			const theTempValue = err.toString();
			console.log("Page error: " + theTempValue);
	});
	page.on("error", function (err) {
			const theTempValue = err.toString();
			console.log("Error: " + theTempValue);
	});
	*/

  await page.goto('http://localhost:'+getTestPort());

  let _onHttpRequest;
  page.on('request', async request => {
    if( _onHttpRequest ){
      await _onHttpRequest(request);
      request.continue();
    }
  });

  return {
    browser,
    browserEval,
  };

  async function browserEval(fn, {offlineMode=false, args, onHttpRequest}={}) {
    // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#requestcontinueoverrides
    _onHttpRequest = onHttpRequest;
    await page.setRequestInterception(!!onHttpRequest);

    await page.setOfflineMode(offlineMode);

    let ret;
    try {
      ret = await page.evaluate(fn, args);
    } catch(err) {
      /*
      // Non-helpful error "Evaluation failed: [object Object]" is a bug:
      // - https://github.com/GoogleChrome/puppeteer/issues/4651
      console.log('bef');
      console.log(Object.getOwnPropertyNames(err));
      console.log(err);
      console.log(err.stack);
      console.log(err.message);
      console.log(2321);
      process.exit();
      */
      throw err;
    } finally {
      _onHttpRequest = null;
    }
    return ret;
  }
}
