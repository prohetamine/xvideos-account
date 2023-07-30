import fs from 'fs/promises'
import md5 from 'md5'
import useProxy from 'puppeteer-page-proxy'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fsExists from 'fs.promises.exists'
import fetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'

const __dirname = dirname(fileURLToPath(import.meta.url))

const pageNetwork = async (page, proxy) => {
  await page.setRequestInterception(true)
    
  const mainPath = path.join(__dirname, '../system')

  const cachePath = path.join(mainPath, 'cache')
      , assetsPath = path.join(mainPath, 'assets')

  if (!await fsExists(cachePath)) {
    await fs.mkdir(cachePath)
  }

  const jpg = await fs.readFile(path.join(assetsPath, 'i.jpg'))
      , png = await fs.readFile(path.join(assetsPath, 'i.png'))
      , svg = await fs.readFile(path.join(assetsPath, 'i.svg'))
      , gif = await fs.readFile(path.join(assetsPath, 'i.gif'))
      , mp4 = await fs.readFile(path.join(assetsPath, 'i.mp4'))
      , m3u8 = await fs.readFile(path.join(assetsPath, 'i.m3u8'))
      , ts = await fs.readFile(path.join(assetsPath, 'i.ts'))
      , dashMp4 = await fs.readFile(path.join(assetsPath, 'DASH_96.mp4'))
      , dashAudio = await fs.readFile(path.join(assetsPath, 'DASH_audio.mp4'))
      , staticFiles = (
          await Promise.all(
            (await fs.readdir(cachePath))
              .map(
                async file => ({ 
                  data: await fs.readFile(path.join(cachePath, file), file.match(/^headers/) ? 'utf8' : undefined), 
                  file 
                })
              )
          )
        ).reduce((ctx, elem) => {
          ctx[elem.file] = elem.data
          return ctx
        }, {})
    
  page.on('request', async request => {
    const url = request.url()

    if (
      url.match(/https:\/\/(oauth\.reddit\.com\/api\/media\/asset\.json\?raw_json=1&gilding_detail=1|reddit-uploaded-media\.s3-accelerate\.amazonaws\.com|reddit-uploaded-video\.s3-accelerate\.amazonaws\.com|reddit-subreddit-uploaded-media\.s3-accelerate\.amazonaws\.com)/) || 
      request.resourceType() === 'image' || 
      request.resourceType() === 'stylesheet' ||
      request.resourceType() === 'media' ||
      request.resourceType() === 'font' || 
      request.resourceType() === 'script' ||
      url.match(/\.m3u8$/) ||
      url.match(/\.ts$/) ||
      url.match(/\.mp4$/)
    ) {
      if (
        request.resourceType() === 'script' && 
        url.match(/redditstatic/) &&
        url.match(/\.js$/)
      ) {
        const { headers, body } = await fetch(url, {
          headers: request.headers()
        }).then(async data => ({
          body: await data.text(),
          headers: data.headers
        }))

        return request.respond({ 
          status: 200, 
          contentType: 'application/javascript',
          headers,
          body: `
          if (!window.isH) {
            window.isH = true
            const _addEventListener = window.addEventListener
  
            window.addEventListener = function (...args) {
              if (args[0] !== 'beforeunload') {
                _addEventListener.call(this, ...args)
              }
            }
          };
          `+ body 
        })
      }

      if (url.match(/\.jpg/) || url.match(/=jpg/) || url.match(/\.jpeg/)) {
        //console.log(url)

        return request.respond({ 
          status: 200, 
          contentType: 'image/jpeg',
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': 42,
            'Content-Type': 'image/jpeg'
          },
          body: jpg,
        })
      }

      if (!url.match(/(https:|http:)\/\/(www\.|)reddit\.com\/static\/pixel\.png/) && !url.match(/data:image\/png;base64/) && (url.match(/\.png/) || url.match(/=png/))) {
        //console.log(url)

        return request.respond({ 
          status: 200, 
          contentType: 'image/png',
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': 42,
            'Content-Type': 'image/png'
          },
          body: png,
        })
      }

      if (url.match(/\.svg/) || url.match(/=svg/)) {
        //console.log(url)

        return request.respond({ 
          status: 200, 
          contentType: 'image/svg+xml',
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': 42,
            'Content-Type': 'image/svg+xml'
          },
          body: svg,
        })
      }

      if (!url.match(/alb\.reddit\.com/) && (url.match(/\.gif/) || url.match(/=gif/))) {
        //console.log(url)

        return request.respond({ 
          status: 200, 
          contentType: 'image/gif',
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': 42,
            'Content-Type': 'image/gif'
          },
          body: gif,
        })
      }

      if (url.match(/\.mp4/)) {
        return request.respond({ 
          status: 200, 
          contentType: 'video/mp4',
          body: mp4
        })
      }

      if (url.match(/\.m3u8/)) {
        //console.log(url)

        return request.respond({ 
          status: 200, 
          contentType: 'application/x-mpegurl',
          headers: {
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'x-cdn-server-region, x-cdn-client-region, x-cdn-name, x-cdn',
            'Cache-Control': 'public, max-age=1209600, s-maxage=86400, must-revalidate',
            'Content-Encoding': 'gzip',
            'Content-Length': 378,
            'Content-Type': 'application/x-mpegurl',
            'Nel': '{"report_to": "w3-reporting-nel", "max_age": 14400, "include_subdomains": false, "success_fraction": 0.02, "failure_fraction": 0.02}',
            'Report-To': '{"group": "w3-reporting-nel", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting-nel.reddit.com/reports" }]}, {"group": "w3-reporting", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting.reddit.com/reports" }]}, {"group": "w3-reporting-csp", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting-csp.reddit.com/reports" }]}',
            'Server': 'snooserv-ps',
            'Vary': 'Accept-Encoding,x-reddit-video-features',
            'X-Cdn': 'fastly',
            'X-Cdn-Client-Region': 'EU',
            'X-Cdn-Name': 'fastly',
            'X-Cdn-Server-Region': 'EU-East',
            'X-Reddit-Cdn': 'fa',
            'X-Reddit-Video-Features': 'sd'
          },
          body: m3u8
        })
      }

      if (url.match(/\.ts/)) {
        //console.log(url)

        return request.respond({ 
          status: 200, 
          contentType: 'application/x-mpegurl',
          headers: {
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'x-cdn-server-region, x-cdn-client-region, x-cdn-name, x-cdn',
            'Cache-Control': 'public, max-age=1209600, s-maxage=86400, must-revalidate',
            'Content-Length': 145136,
            'Content-Range': 'bytes 229360-374495/3872424',
            'Content-Type': 'video/MP2T',
            'Nel': '{"report_to": "w3-reporting-nel", "max_age": 14400, "include_subdomains": false, "success_fraction": 0.02, "failure_fraction": 0.02}',
            'Report-To': '{"group": "w3-reporting-nel", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting-nel.reddit.com/reports" }]}, {"group": "w3-reporting", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting.reddit.com/reports" }]}, {"group": "w3-reporting-csp", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting-csp.reddit.com/reports" }]}',
            'Server': 'snooserv',
            'X-Amz-Server-Side-Encryption': 'AES256',
            'X-Cdn': 'fastly',
            'X-Cdn-Client-Region': 'EU',
            'X-Cdn-Name': 'fastly',
            'X-Cdn-Server-Region': 'EU-East'
          },
          body: ts
        })
      }

      if (url.match(/www\.redditstatic\.com/) && !url.match(/redesignFont2020/)) {
        if (staticFiles[md5(url)]) {
          try {
            return request.respond({
              ...JSON.parse(staticFiles[`headers-${md5(url)}`]),
              body: staticFiles[md5(url)]
            })
          } catch (e) {
            ///
          }
        } else {
          const { headers, body } = await fetch(url, {
            headers: request.headers()
          }).then(async data => ({
            body: await data.text(),
            headers: data.headers
          }))

          const _headers = {}

          for (let pair of headers.entries()) {
            _headers[pair[0]] = pair[1]
          }

          const response = { 
            status: 200, 
            contentType: _headers['content-type'],
            headers: _headers
          }

          await fs.writeFile(path.join(cachePath, md5(url)), body)
          await fs.writeFile(path.join(cachePath, `headers-${md5(url)}`), JSON.stringify(response)) 
        
          return request.respond({
            ...response,
            body: svg
          })
        }
      }

      if (url.match(/redditmedia\.com\/mediaembed/)) {
        return request.respond({ 
          status: 200, 
          contentType: 'text/html',
          body: '0'
        })
      }

      return await request.continue()
    } else {
      if (request.resourceType() === 'xhr') {
        if (url.match(/DASH_[^\\.]+\.mp4/)) {            
          return request.respond({ 
            status: 200, 
            contentType: 'video/mp4',
            headers: {
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Expose-Headers': 'x-cdn-server-region, x-cdn-client-region, x-cdn-name, x-cdn',
              'Cache-Control': 'public, max-age=1209600, s-maxage=86400, must-revalidate',
              'Connection': 'close',
              'Content-Length': 45480,
              'Content-Range': 'bytes 825-904/330202',
              'Nel':'{"report_to": "w3-reporting-nel", "max_age": 14400, "include_subdomains": false, "success_fraction": 0.02, "failure_fraction": 0.02}',
              'Report-To':'{"group": "w3-reporting-nel", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting-nel.reddit.com/reports" }]}, {"group": "w3-reporting", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting.reddit.com/reports" }]}, {"group": "w3-reporting-csp", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting-csp.reddit.com/reports" }]}',
              'Server': 'snooserv',
              'X-Amz-Server-Side-Encryption': 'AES256',
              'X-Cdn': 'fastly',
              'X-Cdn-Client-Region': 'EU',
              'X-Cdn-Name': 'fastly',
              'X-Cdn-Server-Region': 'EU-East'
            },
            body: url.match(/DASH_\d+\.mp4/)
                    ? dashMp4
                    : dashAudio
          })
        }

        if (request.url().match(/\.ts/)) {
          //console.log(url)

          return request.respond({ 
            status: 200, 
            contentType: 'application/x-mpegurl',
            headers: {
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Expose-Headers': 'x-cdn-server-region, x-cdn-client-region, x-cdn-name, x-cdn',
              'Cache-Control': 'public, max-age=1209600, s-maxage=86400, must-revalidate',
              'Content-Length': 145136,
              'Content-Range': 'bytes 229360-374495/3872424',
              'Content-Type': 'video/MP2T',
              'Nel': '{"report_to": "w3-reporting-nel", "max_age": 14400, "include_subdomains": false, "success_fraction": 0.02, "failure_fraction": 0.02}',
              'Report-To': '{"group": "w3-reporting-nel", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting-nel.reddit.com/reports" }]}, {"group": "w3-reporting", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting.reddit.com/reports" }]}, {"group": "w3-reporting-csp", "max_age": 14400, "include_subdomains": true, "endpoints": [{ "url": "https://w3-reporting-csp.reddit.com/reports" }]}',
              'Server': 'snooserv',
              'X-Amz-Server-Side-Encryption': 'AES256',
              'X-Cdn': 'fastly',
              'X-Cdn-Client-Region': 'EU',
              'X-Cdn-Name': 'fastly',
              'X-Cdn-Server-Region': 'EU-East'
            },
            body: ts
          })
        }
      }
      
      if (url.match(/redditmedia\.com\/mediaembed/)) {
        return request.respond({ 
          status: 200, 
          contentType: 'text/html',
          body: '0'
        })
      }

      /*if (request.resourceType() === 'xhr') {
        const response = await fetch(request.url(), {
          agent: new HttpsProxyAgent(proxy),
          headers: request.headers(),
          method: request.method(),
          body: request.postData()
        })
    
        let headers = response.headers.raw()
    
        headers = Object.keys(headers).reduce((ctx, key) => {
          ctx[key] = headers[key].join(';')
          return ctx
        }, {})
    
        let body = null

        try {
          body = headers['content-type'].match(/^text\//) 
                  ? await response.text()
                  : await response.arrayBuffer()
        } catch (err) {
          /// ok
        }
    
        return request.respond({ 
          status: 200, 
          contentType: headers['content-type'],
          headers,
          body
        })
      }*/

      return await useProxy(request, proxy)

      //request.continue()
    }
  })
}

export default pageNetwork