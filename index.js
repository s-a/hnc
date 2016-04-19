#!/usr/bin/env node
"use strict";
var unirest = require("unirest");
var headers = {"Accept": "application/json"};
var ProgressBar = require("progress");
var inquirer = require("inquirer");
var colors = require("colors/safe");
var htmlToText = require("html-to-text");
var open = require("open");
var moment = require("moment");

var extractDomain = function(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split("/")[2];
    }
    else {
        domain = url.split("/")[0];
    }

    //find & remove port number
    domain = domain.split(":")[0];

    return domain;
}

var browse = function(url, stories) {

	var qa = {
		"type": "confirm",
		"message": "output website to console?",
		"name": "confirm",
		"choices": ["y", "n"],
		"default":"y"
	};


	inquirer.prompt(qa).then(function (answer) {
		if (answer.confirm){
			var done = function (text) {
				console.log(colors.white(text));
				processStories(stories);
			};
		 	unirest.get(url).headers({"Accept": "text/html", "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36"}).end(function (response) {
				var text = htmlToText.fromString(response.body, {
				    wordwrap: process.stdout.columns
				});
				done(text);
			});
		} else {
			open(url);
			processStories(stories);
		}
	});

};

var processStories = function (stories) {

	/*stories = stories.sort(function(a,b) {
		return new Date(a.time*1000) < new Date(b.time*1000);
	});*/

	//console.log(stories[0]);return;
	var choices = [];
	for (var i = 0; i < stories.length; i++) {
		var story = stories[i];
		if (story && story.url){
			var uri = extractDomain(story.url);
			var item = {
				name:colors.bold.cyan(story.title) + " " + colors.yellow(moment(new Date(story.time*1000)).fromNow()) + " " +  colors.cyan("(Score:" + story.score + " on " + uri + ")"),
				value:story.url,
				short:story.url
			};
			choices.push(item);
		}
	}

	var qa = {
		"type": "list",
		"message": "Choose a story",
		"name": "url",
		"choices": choices
	};

	inquirer.prompt(qa).then(function (answer) {
		browse(answer.url, stories);
	});

};

var fetchStories = function(done) {
	var dataUrl = "https://hacker-news.firebaseio.com/v0/newstories.json?print=pretty";
	unirest.get(dataUrl).headers(headers).end(function (response) {
		done(response.body);
	});
};


var fetchStory = function(storyId, done) {
	var dataUrl = "https://hacker-news.firebaseio.com/v0/item/" + storyId + ".json?print=pretty";
	unirest.get(dataUrl).headers(headers).end(function (response) {
		done(response.body);
	});
};


fetchStories(function(stories) {
	var bar = new ProgressBar("  downloading [:bar] :percent :etas", {
		complete: "=",
		incomplete: " ",
		width: 20,
		total: stories.length
	});

	var result = [];
	for (var i = 0; i < stories.length; i++) {
		var storyId = stories[i];
		fetchStory(storyId, function(story) {
			result.push(story);
		  	bar.tick(1);
			if (result.length === stories.length){
				processStories(result);
			}
		});
	};
});