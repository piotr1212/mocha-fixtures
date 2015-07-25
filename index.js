module.exports = buildFixtures;

var pathExists = require("path-exists");
var resolve    = require("try-resolve");
var path       = require("path");
var fs         = require("fs");
var _          = require("lodash");

function humanize(val, noext) {
  if (noext) val = path.basename(val, path.extname(val));
  return val.replace(/-/g, " ");
}

function get(entryName, entryLoc) {
  var suites = [];

  var rootOpts = {};
  var rootOptsLoc = resolve(entryLoc + "/options");
  if (rootOptsLoc) rootOpts = require(rootOptsLoc);

  _.each(fs.readdirSync(entryLoc), function (suiteName) {
    if (suiteName[0] === ".") return;

    var suite = {
      options: _.clone(rootOpts),
      tests: [],
      title: humanize(suiteName),
      filename: entryLoc + "/" + suiteName
    };
    suites.push(suite);

    var suiteOptsLoc = resolve(suite.filename + "/options");
    if (suiteOptsLoc) suite.options = require(suiteOptsLoc);

    if (fs.statSync(suite.filename).isFile()) {
      push(suiteName, suite.filename);
    } else {
      _.each(fs.readdirSync(suite.filename), function (taskName) {
        var taskDir = suite.filename + "/" + taskName;
        push(taskName, taskDir);
      });
    }

    function push(taskName, taskDir) {
      // tracuer error tests
      if (taskName.indexOf("Error_") >= 0) return;

      var actualLocAlias = suiteName + "/" + taskName + "/actual.js";
      var expectLocAlias = suiteName + "/" + taskName + "/expected.js";
      var execLocAlias   = suiteName + "/" + taskName + "/exec.js";

      var actualLoc = taskDir + "/actual.js";
      var expectLoc = taskDir + "/expected.js";
      var execLoc   = taskDir + "/exec.js";

      if (resolve.relative(expectLoc + "on")) {
        expectLoc += "on";
        expectLocAlias += "on";
      }

      if (fs.statSync(taskDir).isFile()) {
        var ext = path.extname(taskDir);
        if (ext !== ".js" && ext !== ".module.js") return;

        execLoc = taskDir;
      }

      var taskOpts = _.merge({
        filenameRelative: expectLocAlias,
        sourceFileName:   actualLocAlias,
        sourceMapName:    expectLocAlias
      }, _.cloneDeep(suite.options));

      var taskOptsLoc = resolve(taskDir + "/options");
      if (taskOptsLoc) _.merge(taskOpts, require(taskOptsLoc));

      var test = {
        title: humanize(taskName, true),
        disabled: taskName[0] === ".",
        options: taskOpts,
        exec: {
          loc: execLoc,
          code: readFile(execLoc),
          filename: execLocAlias,
        },
        actual: {
          loc: actualLoc,
          code: readFile(actualLoc),
          filename: actualLocAlias,
        },
        expect: {
          loc: expectLoc,
          code: readFile(expectLoc),
          filename: expectLocAlias
        }
      };

      // traceur checks

      var shouldSkip = function (code) {
        return code.indexOf("// Error:") >= 0 || code.indexOf("// Skip.") >= 0;
      };

      if (shouldSkip(test.actual.code) || shouldSkip(test.exec.code)) {
        return;
      } else if (test.exec.code.indexOf("// Async.") >= 0) {
        //test.options.asyncExec = true;
        return;
      }

      suite.tests.push(test);

      var sourceMappingsLoc = taskDir + "/source-mappings.json";
      if (pathExists.sync(sourceMappingsLoc)) {
        test.sourceMappings = JSON.parse(readFile(sourceMappingsLoc));
      }

      var sourceMapLoc = taskDir + "/source-map.json";
      if (pathExists.sync(sourceMapLoc)) {
        test.sourceMap = JSON.parse(readFile(sourceMapLoc));
      }
    }
  });

  return suites;
}

function buildFixtures(fixturesLoc, callback) {
  try {
    if (callback) return callback();
  } catch (err) {
    if (err.code !== "MODULE_NOT_FOUND") {
      throw err;
    }
  }

  var fixtures = {};
  var files    = fs.readdirSync(fixturesLoc);

  for (var i = 0; i < files.length; i++) {
    var filename = files[i];
    if (filename[0] === ".") continue;

    fixtures[filename] = get(filename, fixturesLoc + "/" + filename);
  }

  return fixtures;
}

//

buildFixtures.readFile = readFile;

function readFile(filename) {
  if (pathExists.sync(filename)) {
    var file = fs.readFileSync(filename, "utf8").trimRight();
    file = file.replace(/\r\n/g, "\n");
    return file;
  } else {
    return "";
  }
}
