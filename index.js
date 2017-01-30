var http = require("http");
var fs = require("fs");

var urlCache = {};
var nextUrlId = 1;

loadUrlCache();
var server = http.createServer(onRequest);
server.listen(8080);
console.log("Listening to port 8080");

function onRequest(request, response)
{
	var hostHeader = request.headers.host;
	var path = request.url.substring(1).trim();
	if (path.length === 0)
		displayInstructions(response);
	else
	if (path.toLowerCase().startsWith("new/"))
		processNewUrl(hostHeader, path, response);
	else
		processShortUrl(hostHeader, path, response);
}

function displayInstructions(response)
{
	response.setHeader("Content-Type", "text/html");

	var out =
		"<body><head><title>Bob's URL shortener</title>" +
		"<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/" +
    	"bootstrap/3.3.6/css/bootstrap.min.css' />" +
		"<style>" +
		"body" +
		"{" +
		"	margin-left: 100px; " +
		"	margin-right: 100px; " +
		"	margin-top: 50px; " +
		"	background-color: cyan" +
		"}" +
		".indent" +
		"{" +
		"	margin-left: 20px;" +
		"}" +
		"</style>" +
		"</head>" +
		"<body>" +
		"<h1 class='text-center'>Bob's URL shortener</h1><br />" +
		"<h3>Instructions for use:</h3>" +
		"<p>To shorten a URL, append the text <code>New/</code> to the end " +
		"of the shortener's URL followed by the URL it will represent.  The " +
		"new URL will be returned in a JSON object.</p><p>Example:</p>" +
		"<div class='indent'><code>https://url-shortener-anischyros.c9users." +
		"io/new/google.com</code></div></p><p>This will return something " +
		"like the following:</p><div class='indent'><code>{&quot;original_url" +
		"&quot;:&quot;https://soylentnews.org&quot;,&quot;short_url&quot;:" +
		"&quot;https://url-shortener-anischyros.c9users.io/3&quot;}</code>" +
		"</div>" +
		"</body>";

	response.end(out);
}

function processNewUrl(hostHeader, path, response)
{
	var obj = {};

	// Trim "new/" from path
	var url = path.substring(4);

	obj.original_url = url;

	if (!isValidUrl(url))
		obj.error = "URL is not valid (error 1)";
	else
	if (urlCache[url])
	{
		// URL is already in cache
		var urlId = urlCache[url];

		obj.short_url = hostHeaderToShortUrl(hostHeader, urlId);
	}
	else
	{
		// Put urlId in cache
		urlCache[url] = nextUrlId;

		// Put url
		urlCache["" + nextUrlId] = url;

		obj.short_url = hostHeaderToShortUrl(hostHeader, nextUrlId);

		nextUrlId++;
	}

	response.setHeader("Content-Type", "text/json");
	var out = JSON.stringify(obj);
	response.setHeader("Content-Length", out.length);
	response.end(out);

	saveUrlCache();
}

function processShortUrl(hostHeader, path, response)
{
	// Get URL id from URL
	var redirectUrl = urlCache[path];
	if (redirectUrl)
	{
		// Send a 302 status code to browser to force redirect
		response.setHeader("Location", redirectUrl);
		response.writeHead(302);
		response.end();
	}
	else
	{
		var obj = { error: "URL is not valid (error 2)" };
		response.setHeader("Content-Type", "text/json");
		var out = JSON.stringify(obj);
		response.setHeader("Content-Length", out.length);
		response.end(out);
	}
}

function isValidUrl(url)
{
	url = url.trim();
	if (url.startsWith("http://"))
		url = url.substring(7);
	else
	if (url.startsWith("https://"))
		url = url.substring(8);
	else
		return false;

	return (url.indexOf(".") > 0);
}

function loadUrlCache()
{
	if (!fs.existsSync("urlCache.json"))
		return;

	var s = fs.readFileSync("urlCache.json", "utf8");

	var obj = JSON.parse(s);
	if (obj)
	{
		nextUrlId = obj.nextUrlId;
		urlCache = obj.urlCache;
	}
}

function saveUrlCache()
{
	var obj =
	{
		nextUrlId: nextUrlId,
		urlCache: urlCache
	};
	fs.writeFile("urlCache.json", JSON.stringify(obj));	
}

function hostHeaderToShortUrl(hostHeader, urlId)
{
	var a = hostHeader.split(":");
	if (a[1] === "80")
		var newUrl = "http://" + a[0];
	else
	if (a[1] === "443")
		var newUrl = "https://" + a[0];
	else
		var newUrl = "http://" + a[0] + ":" + a[1];
	newUrl += "/" + urlId;

	return newUrl;
}

