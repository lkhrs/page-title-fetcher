const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const xml2js = require('xml2js');

/**
 * Fetches the content of a sitemap.xml file from a given URL.
 * @param {string} url - The URL of the sitemap.xml file.
 * @returns {Promise<string>} The content of the sitemap.xml file.
 */
const fetchSitemapXml = async (url) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching sitemap.xml from ${url}: ${error.message}`);
    return null;
  }
};

/**
 * Parses the content of a sitemap.xml file and returns an array of URLs.
 * @param {string} xmlContent - The content of the sitemap.xml file.
 * @returns {Promise<string[]>} An array of URLs.
 */
const parseSitemapXml = async (xmlContent) => {
  try {
    const parsedData = await xml2js.parseStringPromise(xmlContent);
    const urlArray = parsedData.urlset.url.map(url => url.loc[0]);
    return urlArray;
  } catch (error) {
    console.error(`Error parsing sitemap.xml content: ${error.message}`);
    return null;
  }
};

/**
 * Fetches the page title from a given URL.
 * @param {string} url - The URL of the page.
 * @returns {Promise<string>} The page title.
 */
const getPageTitle = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const pageTitle = $('title').text().trim();
    return pageTitle;
  } catch (error) {
    console.error(`Error fetching page title from ${url}: ${error.message}`);
    return null;
  }
};

/**
 * Fetches the page titles for an array of URLs.
 * @param {string[]} urls - An array of URLs.
 * @returns {Promise<{ url: string, pageTitle: string }[]>} An array of objects containing the URL and page title.
 */
const processUrls = async (urls) => {
  const titles = [];

  for (const url of urls) {
    const pageTitle = await getPageTitle(url);
    if (pageTitle) {
      titles.push({ url, pageTitle });
    }
  }

  return titles;
};

/**
 * Takes an xml sitemap URL as a command-line argument and outputs a CSV file with the page titles.
 * @returns {Promise<void>}
 * @example
 * node getTitlesFromUrls.js https://www.example.com/sitemap.xml
 * // Page titles extracted and saved to output/page-titles-20210901123456.csv
 */
(async () => {
  try {
    const sitemapUrl = process.argv[2];

    // Check if a sitemap URL is provided as a command-line argument
    if (!sitemapUrl) {
      console.error('Please provide a sitemap.xml URL as a command-line argument.');
      return;
    }

    // Fetch sitemap.xml content
    const sitemapXml = await fetchSitemapXml(sitemapUrl);
    if (!sitemapXml) {
      console.error('Could not fetch sitemap.xml content from the provided URL.');
      return;
    }

    // Parse sitemap.xml content and extract URLs
    const urls = await parseSitemapXml(sitemapXml);
    if (!urls) {
      console.error('No valid URLs found in the sitemap.xml content.');
      return;
    }

    // Process URLs and extract page titles
    const titles = await processUrls(urls);

    // Generate a timestamp with the desired format (YYYYMMDD-HHmm)
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Create an output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Construct the output file path with the timestamp
    const outputPath = path.join(outputDir, `page-titles-${timestamp}.csv`);

    // Create a CSV writer and write extracted titles to a CSV file
    const csvWriter = createCsvWriter({
      path: outputPath,
      header: [
        { id: 'pageTitle', title: 'Page Title' },
        { id: 'url', title: 'URL' }
      ]
    });

    await csvWriter.writeRecords(titles);
    console.log(`Page titles extracted and saved to ${outputPath}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();
