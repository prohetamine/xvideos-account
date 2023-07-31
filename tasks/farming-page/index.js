import path from 'path'
import sleep from 'sleep-promise'
import fs from 'fs/promises'
import puppeteer from 'puppeteer-core'
import fetch from 'node-fetch'
import { dolphonToken, vpn, userAgent } from '../../config.js'
import pageNetwork from '../../lib/page-network.js'

;(async ([,, username, accountsPath, headless = 'true']) => {
  const account = JSON.parse(await fs.readFile(path.join(accountsPath, `${username}.json`)))
  
  const proxys = await fetch('https://serverlist.piaservers.net/proxy').then(data => data.json())
  let proxy = proxys[parseInt(Math.random() * proxys.length)]

  const { uaFullVersion } = await fetch(`https://dolphin-anty-api.com/fingerprints/fingerprint?platform=windows&browser_type=anty&browser_version=${userAgent}&type=fingerprint&screen=1440x900`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      authorization: `Bearer ${dolphonToken}`
    },
    body: null,
    method: 'GET'
  }).then(data => data.json())

  account.fingerprint.useragent.value = account.fingerprint.useragent.value.replace(/\d+\.\d+\.\d+\.\d+/, `${uaFullVersion.split('.')[0]}.0.0.0`)
  account.fingerprint.mediaDevices.uaFullVersion = uaFullVersion

  const createProfile = await fetch('https://dolphin-anty-api.com/browser_profiles', {
    headers: {
      accept: 'application/json, text/plain, */*',
      authorization: `Bearer ${dolphonToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(account.fingerprint),
    method: 'POST'
  })
  .then(response => response.json())

  const getAppVersion = await fetch('http://localhost:3001/v1.0/get-app-version', {
    headers: {
      accept: 'application/json, text/plain, */*',
      authorization: `Bearer ${dolphonToken}`,
    },
    body: null,
    method: 'GET'
  })
  .then(response => response.json())

  if (!getAppVersion.success) {
    console.log(`wait restart [getAppVersion]`, account.id, account.username)
    process.exit()
  }

  const checkOldUseragent = await fetch('https://dolphin-anty-api.com/browser_profiles/check-old-useragents', {
    headers: {
      accept: 'application/json, text/plain, */*',
      authorization: `Bearer ${dolphonToken}`,
      "x-anty-app-version": getAppVersion.appVersion
    },
    body: null,
    method: 'GET'
  }).then(response => response.json())

  if (!checkOldUseragent.success) {
    console.log(`wait restart [checkOldUseragent]`, account.id, account.username)
    process.exit()
  }

  if (checkOldUseragent.data.found) {
    console.log(`!!!! PROFILE NOT STARTED UPDATE USERAGENT VERSION ${account.username} ${checkOldUseragent.data.count > 1 ? `and ${checkOldUseragent.data.count - 1}` : ''} !!!!`)
    await sleep(1000000000)
    process.exit()
  }

  if (!createProfile.success) {
    console.log(`wait restart [createProfile]`, account.id, account.username)
    process.exit()
  }

  const startProfile = await fetch(`http://localhost:3001/v1.0/browser_profiles/${createProfile.browserProfileId}/start?automation=1${headless === 'true' ? `&headless=1` : ``}`)
                      .then(response => response.json())

  console.log(startProfile)

  if (!startProfile.automation) {
    console.log(`wait restart`, account.id, account.username)
    process.exit()
  }

  const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://127.0.0.1:${startProfile.automation.port}${startProfile.automation.wsEndpoint}`,
    defaultViewport: null,
    protocolTimeout: 60000 * 12000
  })

  try {
    const pages = await browser.pages()
            
    pages.forEach(page => {
      page.close()
    })
      
    const page = await browser.newPage()

    page.setDefaultNavigationTimeout(120000)
    
    await pageNetwork(page, `https://${vpn.password}:${vpn.password}@${proxy.dns}:443`)

    await page.setViewport({
      width: 1440,
      height: 900
    })

    await page.setCookie(...account.cookies)

    let isConnection = false

    for (let i = 0; i < 100; i++) {
      try {
        await page.goto('https://api.ipify.org')
        isConnection = true
        break
      } catch (e) {
        proxy = proxys[parseInt(Math.random() * proxys.length)]
        await sleep(2000)
      }
    }

    if (!isConnection) {
      console.log(`Bad connection: (${account.id}) ${account.username}`)
      process.send && process.send({ restartTimeout: 60000 * 5 })
      process.exit()
    }
      
    await page.goto(`https://www.xvideos.com/`)

    await page.evaluate(ls => 
      Object.keys(ls).forEach(key => 
        window.localStorage.setItem(key, ls[key])
      )
      , account.localStorage
    )

    await page.evaluate(ss => 
      Object.keys(ss).forEach(
        key => 
          window.sessionStorage.setItem(key, ss[key])
      )
      , account.sessionStorage
    )

    // <...>
      
    await page.goto('https://xvideos.com/video4423182/_')

    //await page.goto('https://www.xvideos.com/video77771589/oops_i_accidentally_posted_this')

    await page.evaluate(() => {
      try {
        document.querySelector('[id="disclaimer-accept_cookies"]').click()
      } catch (err) {
        // ok
      }
    })

    await page.waitForSelector('button[class="vote-action-good"]')
    
    const { x, y } = await page.evaluate(() => {
      const { x, y } = document.querySelector('button[class="vote-action-good"]').getBoundingClientRect()
      return { x, y }
    }) 
    await page.hover('button[class="vote-action-good"]')
    await sleep(1000)
    await page.mouse.move(x, y)
    await sleep(1000)
    await page.mouse.click(x, y)

    await sleep(5000)

    await page.goto('https://www.xvideos.com/profiles/styxmib')

    await page.waitForSelector('[class="sub-state-text"]')

    await page.evaluate(() => {
      document.querySelector('[class="sub-state-text"]').click()
      document.querySelector('a.vote-action-good').click()
    })
    

    await sleep(5000)

    // <...>
    
    console.log(`\n>>> ${account.username} GOOD VOTE\n`)

    process.send && process.send({ restartTimeout: 60000 * (parseInt(Math.random() * 10) + 2005) })
  } catch (err) {
    console.log(err.name, err.message, err.stack, account.id, account.username)
    process.send && process.send({ restartTimeout: 60000 * 0 }) 
  }

  await Promise.race(
    Array(10).fill(true).map(
      async (_, i) => {
        await sleep(i * 10000)
        await fetch(`http://localhost:3001/v1.0/browser_profiles/${createProfile.browserProfileId}/stop?plan=free`, {
          headers: {
            accept: 'application/json, text/plain, */*',
            authorization: `Bearer ${dolphonToken}`,
          },
          body: null,
          method: 'GET'
        })
      }
    )
  )

  await Promise.race(
    Array(10).fill(true).map(
      async (_, i) => {
        await sleep(i * 10000)
        await fetch('https://dolphin-anty-api.com/browser_profiles', {
          headers: {
            'accept': 'application/json, text/plain, */*',
            'authorization': `Bearer ${dolphonToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            ids: [createProfile.browserProfileId]
          }),
          method: 'DELETE',
        })
      }
    )
  )

  process.exit()
})(process.argv)