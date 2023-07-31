import fetch from 'node-fetch'
import puppeteer from 'puppeteer-core'
import createProfile from '../../lib/create-profile.js'
import sleep from 'sleep-promise'
import fs from 'fs/promises'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fsExists from 'fs.promises.exists'
import { dolphonToken, vpn } from '../../config.js'
import pageNetwork from '../../lib/page-network.js'
import TempMail from '../../lib/temp-mail/index.js'
import { generateFromEmail } from 'unique-username-generator'


import { exec, spawnSync } from 'child_process'
import os from 'os'
import chalk from 'chalk'

const isMac = os.platform() === 'darwin'

const __dirname = dirname(fileURLToPath(import.meta.url))

const configure = {
  isDev: false,
  iteration: 10
}

const createProfileFile = async (account, tm) => {
  try {
    const accountsPath = path.join(__dirname, '/../../accounts')
        , accountPath = path.join(accountsPath, `${account.username}.json`)

    if (!await fsExists(accountsPath)) {
      await fs.mkdir(accountsPath)
    }

    if (await fsExists(accountPath)) {
      console.log('ACCOUNT CREATED', account.username)
      return 
    }

    const proxys = await fetch('https://serverlist.piaservers.net/proxy').then(data => data.json())
    let proxy = proxys[parseInt(Math.random() * proxys.length)]

    console.log('- - - - - - - - - -')

    const { success, browserProfileId, fingerprint } = await createProfile({
      title: `${account.username.toUpperCase()}`,
      token: dolphonToken,
      comment: `<p>${account.username}:${account.password}</p>`
    })
    
    console.log(`Create profile: ${success ? 'yes' : 'no'}`)
    console.log('- - - - - - - - - -')

    account.id = browserProfileId
    account.fingerprint = fingerprint

    if (!account.id) {
      console.log('Error create profile...')
      return 
    }

    const response = await fetch(`http://localhost:3001/v1.0/browser_profiles/${account.id}/start?automation=1${configure.idDev ? `&headless=1` : ``}`)
        , data = await response.json() 

    const browser = await puppeteer.connect({
      browserWSEndpoint: `ws://127.0.0.1:${data.automation.port}${data.automation.wsEndpoint}`,
      defaultViewport: null,
      protocolTimeout: 60000 * 12000
    })

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
    }

    console.log('Register page')
    console.log(`  email: ${account.mail}`)
    console.log(`  username: ${account.username}`)
    console.log(`  password: ${account.password}`)
    console.log('- - - - - - - - - -')

    await page.goto('https://www.xvideos.com/account/create')
  
    await page.waitForSelector('[id="signup-form_details_login"]')

    const emailNode = await page.$('[id="signup-form_details_login"]')
        , usernameNode = await page.$('[id="signup-form_details_profile_name"]')
        , passwordNode = await page.$('[id="signup-form_details_password"]')

    await emailNode.type(account.mail)
    await sleep(1000)
    await usernameNode.type(account.username)
    await sleep(1000)
    await passwordNode.type(account.password)
    await sleep(1000)

    await page.evaluate(() => {
      document.querySelector('[id="signup-form_details_marketing_internal"]').click()
      document.querySelector('[id="signup-form_details_tos_pp"]').click()
    })

    await sleep(2000)

    await page.evaluate(() => {
      document.querySelector('[id="btn-signup2next"]').click()
    })

    await page.waitForSelector('[id="signup-form-submit"]')

    await page.evaluate(() => {
      document.querySelector('[id="signup-form-submit"]').click()
    })

    const dataSiteKey = await page.evaluate(() => document.querySelector('[data-sitekey]').getAttribute('data-sitekey'))
        , url = await page.evaluate(() => window.location.href)
        , token = 'ca9225a8286e156895054566a688267f'
    
    console.log(dataSiteKey, url, token)

    const { request } = await fetch(`http://rucaptcha.com/in.php?key=${token}&invisible=1&json=1&method=userrecaptcha&googlekey=${dataSiteKey}&pageurl=${url}`).then(data => data.json())

    let isGoodCaptcha = false

    for (let x = 0; x < 10; x++) {
      await sleep(5000)
      const resp = await fetch(`http://rucaptcha.com/res.php?key=${token}&json=1&action=get&id=${request}`).then(data => data.json())
      
      if (resp.status === 1) {
        console.log(resp.request)
        await page.evaluate(token => {
          document.querySelectorAll('form')[1].querySelector('.g-recaptcha-response').innerHTML = token
        }, resp.request)

        await sleep(5000)

        await page.evaluate(() => {
          window.OnSignupFormSubmit()
        })
        
        isGoodCaptcha = true
        break
      }
    } 

    if (isGoodCaptcha) {
      await page.waitForSelector('button[class="btn-clear head__btn head__btn--icf head__btn--settings head__btn--settings--account init-ok"]', {
        timeout: 60000 * 2
      })
  
      await page.evaluate(() => {
        try {
          document.querySelector('[id="disclaimer-accept_cookies"]').click()
        } catch (err) {
          // ok
        }
      })
  
      const confirmLink = await new Promise(res => {
        let r = 0
  
        const intervalId = setInterval(async () => {
          if (r > 10) {
            clearInterval(intervalId)
            res(false)
            return
          } 
  
          r++
  
          const messages = await tm.readMessages()
      
          messages.forEach(async message => {
            const { bodyHtml } = await tm.viewMessage(message._id)
            
            const link = bodyHtml.match(/href="[^"]+/gi)
      
            if (link) {
              res(link[4].replace(/(href="|")/gi, ''))
            }
          })
        }, 5000)
      })
  
      await page.goto(confirmLink)
  
      await page.waitForSelector('[class="form-control-static"]')
  
      const isGood = await page.evaluate(mail => document.querySelector('[class="form-control-static"]').innerText === mail, account.mail)
  
      console.log(`Confirm email: ${isGood ? 'yes' : 'no'}`)
      console.log('- - - - - - - - - -')
  
      account.localStorage = JSON.parse(await page.evaluate(() => JSON.stringify(localStorage)))
      account.sessionStorage = JSON.parse(await page.evaluate(() => JSON.stringify(localStorage)))
  
      await Promise.race(
        Array(10).fill(true).map(
          async (_, i) => {
            await sleep(i * 10000)
            await fetch(`http://localhost:3001/v1.0/browser_profiles/${account.id}/stop?plan=free`, {
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
  
      console.log('Happy end! 😄')
      
      for (let x = 0; x < 100; x++) {
        try {
          account.cookies = await fetch(`http://localhost:3001/v1.0/cookies/export?browserProfileId=${account.id}&transfer=0`, {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Accept-Encoding': 'gzip, deflate, br',
              'Authorization': `Bearer ${dolphonToken}`
            }
          }).then(data => data.json())
        
          
          if (account.cookies.length > 0) {
            break
          }
        } catch (e) {
          /// ...
        }
        await sleep(5000)
      }
  
      account.isFill = false
  
      console.log(account)
  
      await fs.writeFile(accountPath, JSON.stringify(account, null, 2))
    }

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
              ids: [account.id]
            }),
            method: 'DELETE'
          })
        }
      )
    )
  } catch (err) {
    console.log(account.username, err)
  }
}

;(async () => {
  for (let x = 0; x < 100; x++) {
    console.log(chalk.red('[ Kill Dolphin{anty} 🐬 ]'))
    if (isMac) {
      spawnSync('pkill', ['-x', 'Dolphin Anty'])
    } else {
      spawnSync('TASKKILL', ['/F', '/IM', "Dolphin Anty.exe", '/T'])
    }

    await sleep(5000)

    console.log(chalk.green('[ Start Dolphin{anty} 🐬 ]'))
    if (isMac) {
      exec('open -n "/Applications/Dolphin Anty.app"')
    } else {
      exec('"C:/Users/CykaBlyad/AppData/Local/Programs/Dolphin Anty/Dolphin Anty.exe" & exit')  
    } 

    await sleep(15000)

    for (let x = 0; x < 10; x++) {
      console.log(chalk.cyan('[ Removing profiles Dolphin{anty} 🐬 ]'))
      try {
        const { data } = await fetch('https://dolphin-anty-api.com/browser_profiles?page=1&limit=50', {
          headers: {
            'accept': 'application/json, text/plain, */*',
            'authorization': `Bearer ${dolphonToken}`
          },
          method: 'GET'
        }).then(data => data.json())

        if (data.length === 0) {
          break
        }

        const { success } = await fetch('https://dolphin-anty-api.com/browser_profiles', {
          headers: {
            'accept': 'application/json, text/plain, */*',
            'authorization': `Bearer ${dolphonToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            ids: data.map(({ id }) => id)
          }),
          method: 'DELETE',
        }).then(data => data.json())

        if (success) {
          break
        }
      } catch (e) {
        // ok
      }
    
      await sleep(5000)
    }

    await sleep(15000)

    await Promise.all(
      Array(10).fill(true).map(async () => {
        const tm = new TempMail()

        await tm.create()

        const username = generateFromEmail(
          tm.mailbox,
          3
        )
      
        await createProfileFile({
          id: null,
          mail: tm.mailbox,
          username: username,
          password: '2323fdg54vdgt46oWWWwfi43jf43j4gor',
          localStorage: null,
          sessionStorage: null,
          cookies: null
        }, tm)
      })
    )

    console.log(chalk.yellow('[ Remove Dolphin{anty} cache trash 🐬 ]'))
    const pathBrowserProfiles = isMac 
                                  ? '/Users/stas/Library/Application Support/dolphin_anty/browser_profiles' 
                                  : 'C:/Users/CykaBlyad/AppData/Roaming/dolphin_anty/browser_profiles'

    await Promise.all(
      (await fs.readdir(pathBrowserProfiles))
        .filter(file => file !== 'desktop.ini')
        .map(file => path.join(pathBrowserProfiles, file))
        .map(async file => {
          try {
            await fs.rm(file, { recursive: true, force: true })
          } catch (e) {
            // ok
          }
        })  
    )   

    await sleep(3000)
  }
})()

