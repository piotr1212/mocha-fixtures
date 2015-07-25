#!/usr/bin/env node

var getFixtures = require("../index");
var fs          = require("fs");

var directory         = process.argv[2] || process.cwd();
var fixturesDirectory = directory + "/tests/fixtures";
if (!fs.existsSync(fixturesDirectory)) return;

var fixtures = getFixtures(fixturesDirectory);
fs.writeFileSync(directory + "/test-fixtures.json", JSON.stringify(fixtures));
