process.on("unhandledRejection", (err) => {
  throw err;
});

const assert = require("@brillout/assert");
global.assert = assert;

const WildcardApi = require("@wildcard-api/server/WildcardApi");
const WildcardClient = require("@wildcard-api/client/WildcardClient");

const bundle = require("./browser/bundle");
const launchBrowser = require("./browser/launchBrowser");

const startAllServers = require("./servers/startAllServers");

const {
  symbolSuccess,
  symbolError,
  colorError,
} = require("@brillout/cli-theme");
const chalk = require("chalk");

/*
const DEBUG = true;
/*/
const DEBUG = false;
//*/

(async () => {
  await bundle();

  const log_suppressor = new LogSupressor();

  const wildcardApiHolder = {};
  const servers = await startAllServers(wildcardApiHolder);

  const { browserEval: browserEval_org, browser } = await launchBrowser();
  for (let { serverFramework, httpPort } of servers) {
    let browserEval = browserEval_org.bind(null, httpPort);
    for (let { test, file } of getTests()) {
      const wildcardApi = new WildcardApi();
      wildcardApiHolder.wildcardApi = wildcardApi;
      const wildcardClient = new WildcardClient();
      wildcardClient.__INTERNAL__wildcardApi = wildcardApi;

      const testName =
        "[" + serverFramework + "] " + test.name + " (" + file + ")";

      !DEBUG && log_suppressor.enable();
      try {
        await test({
          wildcardApi,
          wildcardClient,
          WildcardClient,
          browserEval,
          httpPort,
        });
      } catch (err) {
        !DEBUG && log_suppressor.flush();
        !DEBUG && log_suppressor.disable();
        console.log(colorError(symbolError + "Failed test: " + testName));
        throw err;
      }
      !DEBUG && log_suppressor.disable();

      console.log(symbolSuccess + testName);
    }
  }

  await browser.close();

  await Promise.all(servers.map(({ stop }) => stop()));

  console.log(chalk.bold.green("All tests successfully passed."));
})();

function getTests() {
  const glob = require("glob");
  const path = require("path");

  const projectRoot = __dirname + "/..";

  const testFiles = glob.sync(projectRoot + "/tests/*.js");
  const tests = [];
  testFiles.forEach((filePath) => {
    require(filePath).forEach((test) => {
      const file = path.relative(projectRoot, filePath);
      tests.push({ test, file });
    });
  });

  return tests;
}

function LogSupressor() {
  let stdout__calls;
  let stderr__calls;

  let stdout__original;
  let stderr__original;

  return { enable, disable, flush };

  function enable() {
    stdout__original = process.stdout.write;
    stderr__original = process.stderr.write;
    stdout__calls = [];
    stderr__calls = [];
    process.stdout.write = (...args) => {
      stdout__calls.push(args);
    };
    process.stderr.write = (...args) => {
      stderr__calls.push(args);
    };
  }
  function disable() {
    process.stdout.write = stdout__original;
    process.stderr.write = stderr__original;
  }
  function flush() {
    stdout__calls.forEach((args) =>
      stdout__original.apply(process.stdout, args)
    );
    stderr__calls.forEach((args) =>
      stderr__original.apply(process.stderr, args)
    );
  }
}
