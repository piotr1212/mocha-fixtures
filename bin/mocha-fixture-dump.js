#!/usr/bin/env node

var getFixtures = require("../index");
var directory = process.argv[2] || process.cwd();
var fixtures = getFixtures(directory + "/tests/fixtures");
fs.writeFileSync(directory + "/test-fixtures.json", JSON.stringify(fixtures));
