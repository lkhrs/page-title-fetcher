import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';

import { fetchSitemapXml, getPageTitle } from './getTitlesFromUrls.js';

const withServer = async (handler, callback) => {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
};

test('fetchSitemapXml returns sitemap response text', async () => {
  await withServer((request, response) => {
    response.setHeader('Content-Type', 'application/xml');
    response.end('<urlset><url><loc>https://example.com/</loc></url></urlset>');
  }, async (baseUrl) => {
    const sitemapXml = await fetchSitemapXml(`${baseUrl}/sitemap.xml`);

    assert.equal(sitemapXml, '<urlset><url><loc>https://example.com/</loc></url></urlset>');
  });
});

test('getPageTitle returns the parsed HTML title', async () => {
  await withServer((request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html><head><title> Example Title </title></head></html>');
  }, async (baseUrl) => {
    const pageTitle = await getPageTitle(`${baseUrl}/page`);

    assert.equal(pageTitle, 'Example Title');
  });
});

test('fetch helpers return null for non-2xx responses', async () => {
  await withServer((request, response) => {
    response.writeHead(404);
    response.end('not found');
  }, async (baseUrl) => {
    assert.equal(await fetchSitemapXml(`${baseUrl}/missing-sitemap.xml`), null);
    assert.equal(await getPageTitle(`${baseUrl}/missing-page`), null);
  });
});
