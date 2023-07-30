import fetch from 'node-fetch'
import puppeteer from 'puppeteer-core'
import sleep from 'sleep-promise'
import fs from 'fs/promises'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { dolphonToken, vpn, userAgent } from '../../config.js'
import checkBan from '../../lib/check-ban.js'
import pageNetwork from '../../lib/page-network.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const configure = {
  isDev: false,
  iteration: 10
}

const fillProfile = async (account, fillData, update) => {
  const stopBrowser = async id => {
    await Promise.race(
      Array(10).fill(true).map(
        async (_, i) => {
          await sleep(i * 10000)
          await fetch(`http://localhost:3001/v1.0/browser_profiles/${id}/stop?plan=free`, {
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
              ids: [id]
            }),
            method: 'DELETE'
          })
        }
      )
    )
  }

  try {
    if (!account.isLogin) {
      //console.log('Account not login', account.username)
      //console.log('- - - - - - - - - -')
      //return
    }

    const proxys = await fetch('https://serverlist.piaservers.net/proxy').then(data => data.json())
    let proxy = proxys[parseInt(Math.random() * proxys.length)]
  
    const { proxy: _proxy, isBan } = await checkBan(proxys, vpn, account.username)
    proxy = _proxy
  
    account.isBan = isBan

    if (isBan) {
      console.log(`Account ${account.username} is blocked !`)
      await update({ ...account, isBan: true })
      console.log('- - - - - - - - - -')
      return
    }
  
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
      console.log('- - - - - - - - - -')
      return
    }
  
    const checkOldUseragent = await fetch('https://dolphin-anty-api.com/browser_profiles/check-old-useragents', {
      headers: {
        accept: 'application/json, text/plain, */*',
        authorization: `Bearer ${dolphonToken}`,
        'x-anty-app-version': getAppVersion.appVersion
      },
      body: null,
      method: 'GET'
    }).then(response => response.json())
  
    if (!checkOldUseragent.success) {
      console.log(`wait restart [checkOldUseragent]`, account.id, account.username)
      console.log('- - - - - - - - - -')
      return
    }
  
    if (checkOldUseragent.data.found) {
      console.log(`!!!! PROFILE NOT STARTED UPDATE USERAGENT VERSION ${account.username} ${checkOldUseragent.data.count > 1 ? `and ${checkOldUseragent.data.count - 1}` : ''} !!!!`)
      console.log('- - - - - - - - - -')
      await sleep(1000000000)
      return
    }
  
    if (!createProfile.success) {
      console.log(`wait restart [createProfile]`, account.id, account.username)
      return
    }

    const startProfile = await fetch(`http://localhost:3001/v1.0/browser_profiles/${createProfile.browserProfileId}/start?automation=1${configure.idDev ? `&headless=1` : ``}`)
                                  .then(response => response.json())

    if (!startProfile.automation) {
      console.log(startProfile)
      
      console.log(`wait restart`, account.id, account.username)
      await stopBrowser(createProfile.browserProfileId)
      console.log('- - - - - - - - - -')
      return
    }

    const browser = await puppeteer.connect({
      browserWSEndpoint: `ws://127.0.0.1:${startProfile.automation.port}${startProfile.automation.wsEndpoint}`,
      defaultViewport: null,
      protocolTimeout: 60000 * 12000
    })
        
    const context = browser.defaultBrowserContext()
    await context.overridePermissions('https://www.reddit.com', ['notifications'])
    await context.overridePermissions('https://reddit.com', ['notifications'])

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
      await stopBrowser(createProfile.browserProfileId)
      console.log('- - - - - - - - - -')
      return
    }

    await page.goto(`https://reddit.com`)

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

    await page.goto(`https://reddit.com/user/${account.username}`)

    console.log('- - - - - - - - - -')

    let isLogin = false

    try {
      await page.waitForSelector('circle[cx="6"][r="4"]')
      isLogin = true
    } catch (e) {
      // ok
    }

    console.log(`Login profile: ${isLogin ? 'yes' : 'no'}`, account.id, account.username)
    console.log('- - - - - - - - - -')

    if (!isLogin) {
      await update({ ...account, isLogin: false })
      await stopBrowser(createProfile.browserProfileId)
      console.log('- - - - - - - - - -')
      return
    } else {
      account.isLogin = true
    }

    let isCloseInterests = false

    for (let c = 0; c < 3; c++) {
      try {
        await page.waitForSelector('button[aria-label] > i.icon.icon-close', { timeout: 5000 })
        await page.evaluate(() => {
          document.querySelector('button[aria-label] > i.icon.icon-close').click()
        })
        isCloseInterests = true
        break
      } catch (e) {
        try {
          await page.evaluate(() => {
            window.location.reload()
          })
        } catch (e) {
          await page.goto(`https://www.reddit.com/user/${account.username}`)
        }
      }
    }

    console.log(`Close interests: ${isCloseInterests ? 'yes' : 'no'}`)
    console.log('- - - - - - - - - -')

    if (
      (fillData.background !== undefined && fillData.avatar !== undefined) && 
      (account.background !== fillData.background || account.avatar !== fillData.avatar)
    ) {
      await page.goto(`https://www.reddit.com/user/${account.username}`)

      let isPhotoUploaded = false

      for (let c = 0; c < configure.iteration && !isPhotoUploaded; c++) {
        try {
          await page.waitForSelector('i.icon.icon-add_media')

          const [background, avatar] = await page.$$('input[accept="image/x-png,image/jpeg"]')
      
          await background.uploadFile(fillData.background)
          await avatar.uploadFile(fillData.avatar)
          
          await sleep(3000)

          await page.evaluate(() => {
            document.querySelectorAll('input[accept="image/x-png,image/jpeg"]').forEach(input => {
              input[Object.keys(input).find(key => key.match(/__reactEvent/))].onChange(input)  
            })
          })

          await sleep(25000)

          await page.waitForSelector('img[alt="User avatar"]')
          await page.waitForSelector('span[role="presentation"] > div[style]')

          isPhotoUploaded = true
          break
        } catch (e) {
          console.log(e)
          try {
            await page.evaluate(() => {
              window.location.reload()
            })
          } catch (e) {
            await page.goto(`https://www.reddit.com/user/${account.username}`)
          }
        }
      }

      console.log(`Photo uploaded: ${isPhotoUploaded ? 'yes' : 'no'}`, account.id, account.username)

      if (isPhotoUploaded) {
        account.background = fillData.background
        account.avatar = fillData.avatar
        await update(account)
      }

      console.log('- - - - - - - - - -')    
    }

    if (
      fillData.link_label !== undefined && 
      account.link_label !== fillData.link_label
    ) {
      await page.goto(`https://www.reddit.com/settings/profile`)

      let isAddLink = false

      for (let c = 0; c < configure.iteration && !isAddLink; c++) {
        try {
          await page.waitForSelector('i.icon.icon-add')
          
          let isLink = false

          for (let l = 0; l < 10; l++) {
            isLink = !!await page.evaluate(() => !!document.querySelector('a > i.icon-clear'))
            await sleep(1000)
          }

          if (isLink) {
            await page.evaluate(() => {
              document.querySelector('a > i.icon-clear').addEventListener('click', event => 
                event.preventDefault()
              )
              document.querySelector('a > i.icon-clear').click()
            })
          }

          await sleep(5000)

          await page.evaluate(() => 
            document.querySelectorAll('i.icon.icon-add')[1].click()
          )

          await page.waitForSelector('img[src="https://www.redditstatic.com/desktop2x/img/social-links/custom.png"]')

          await page.evaluate(() => 
            document.querySelector('img[src="https://www.redditstatic.com/desktop2x/img/social-links/custom.png"]').click()
          )

          await page.waitForSelector('button[role="button"][disabled]')

          await page.evaluate((_label, _site) => {
            const button = document.querySelector('button[role="button"][disabled]')
                , root = button.parentElement.parentElement.parentElement.parentElement
                , [label, site] = root.querySelectorAll('input')

            label[Object.keys(label).find(key => key.match(/__reactEvent/))].onChange({ currentTarget: { value: _label } })
            site[Object.keys(site).find(key => key.match(/__reactEvent/))].onChange({ currentTarget: { value: _site } })
            
            button.click()
          }, fillData.link_label, `nsfw.red/e-${account.username}`)        

          isAddLink = true
          break
        } catch (e) {
          console.log(e)
          try {
            await page.evaluate(() => {
              window.location.reload()
            })
          } catch (e) {
            await page.goto(`https://www.reddit.com/settings/profile`)
          }
        }
      }

      console.log(`Add link: ${isAddLink ? 'yes' : 'no'}`)

      if (isAddLink) {
        account.link_label = fillData.link_label
        await update(account)
      }

      console.log('- - - - - - - - - -')
    }

    if (
      (fillData.bio !== undefined && fillData.displayName !== undefined) && 
      (account.bio !== fillData.bio || account.displayName !== fillData.displayName)
    ) {
      await page.goto('https://www.reddit.com/settings/profile')

      let isWriteBio = false
    
      for (let c = 0; c < configure.iteration && !isWriteBio; c++) {
        try {
          await page.waitForSelector('div[id="AppRouter-main-content"] > div > div input')
        
          await sleep(2000)
    
          await page.evaluate(async displayName => {
            await new Promise(res => {
              const input = document.querySelector('div[id="AppRouter-main-content"] > div > div input')
              input.focus()
              input[Object.keys(input).find(key => key.match(/__reactEvent/))].onChange({ target: { value: displayName } })
              
              setTimeout(() => {
                input.blur()
                input[Object.keys(input).find(key => key.match(/__reactEvent/))].onBlur({ target: { value: displayName } })  
                setTimeout(() => {
                  res()
                }, 500)
              }, 1000)
            })
          }, fillData.displayName)
    
          await sleep(2000)
    
          await page.evaluate(async bio => {
            await new Promise(res => {
              const textarea = document.querySelector('div[id="AppRouter-main-content"] > div > div textarea')
              textarea.focus()
              textarea[Object.keys(textarea).find(key => key.match(/__reactEvent/))].onChange({ target: { value: bio } })
              
              setTimeout(() => {
                textarea.blur()
                textarea[Object.keys(textarea).find(key => key.match(/__reactEvent/))].onBlur({ target: { value: bio } })  
                setTimeout(() => {
                  res()
                }, 500)
              }, 1000)
            })
          }, fillData.bio)
          
          await sleep(2000)
    
          isWriteBio = true
          break
        } catch (e) {
          try {
            await page.evaluate(() => {
              window.location.reload()
            })
          } catch (e) {
            await page.goto('https://www.reddit.com/settings/profile')
          }
        }
      }
    
      console.log(`Write bio ${isWriteBio ? 'yes' : 'no'}`)

      if (isWriteBio) {
        account.bio = fillData.bio
        account.displayName = fillData.displayName
        await update(account)
      }

      console.log('- - - - - - - - - -')
    }
  
    await page.goto(`https://www.reddit.com/settings/feed`)

    let isAllowNSFW = false 

    for (let c = 0; c < configure.iteration && !isAllowNSFW; c++) {
      try {
        await page.waitForSelector('button[role="switch"]')

        isAllowNSFW = !!await page.evaluate(() => document.querySelectorAll('button[role="switch"]')[0].getAttribute('aria-checked') === 'true')

        if (isAllowNSFW) {
          break
        }

        await page.evaluate(async () => {
          await new Promise(res => {
            document.querySelectorAll('button[role="switch"]')[0].click()

            setTimeout(() => {
              res()
            }, 1000)
          })
        })

        await sleep(2000)

        await page.evaluate(async () => {
          await new Promise(res => {
            const button = document.querySelectorAll('button[role="switch"]')[1]
              
            if (button.getAttribute('aria-checked') === 'true') {
              button.click()
            }

            setTimeout(() => {
              res()
            }, 1000)
          })
        })

        await sleep(2000)

        isAllowNSFW = true
        break
      } catch (e) {
        try {
          await page.evaluate(() => {
            window.location.reload()
          })
        } catch (e) {
          await page.goto('https://www.reddit.com/settings/feed')
        }
      }
    }

    console.log(`Allow NSFW ${isAllowNSFW ? 'yes' : 'no'}`)
    console.log('- - - - - - - - - -')
  
    console.log('Happy end! 😄')

    account.isFill = true

    await update(account)

    await stopBrowser(createProfile.browserProfileId)
  } catch (err) {
    console.log(account.username, err)
  }
}

;(async () => {
  const accountsPath = path.join(__dirname, '/../../accounts~')
      //, photosPath = path.join(__dirname, '/photos')
      //, backgroundsPath = path.join(__dirname, '/backgrounds')

  const accounts = await fs.readdir(accountsPath)
      //, photos = (await fs.readdir(photosPath)).map(photo => path.join(photosPath, photo))
      //, backgrounds = (await fs.readdir(backgroundsPath)).map(background => path.join(backgroundsPath, background))

  for (let x = 36; x < accounts.length; x++) {
    console.log('Account index:', x)
    const account = JSON.parse(await fs.readFile(path.join(accountsPath, accounts[x]), 'utf8'))

    const fillData = {
      displayName: 'Eva T.',
      bio: 'The girl is a blogger, model, traveler, I am fond of a lot of hobbies. I like to meet and correspond with new people ❤️🥰 Write to me if you want to chat, link to my messenger in my profile ⬇️ ⬇️ ⬇️',
      //avatar: photos[parseInt(Math.random() * photos.length)],
      //background: backgrounds[parseInt(Math.random() * backgrounds.length)],
      link_label: '💬 My messager 💬',
    }

    if (Object.keys(fillData).find(key => JSON.stringify(fillData[key]) !== JSON.stringify(account[key]))) {
      await fillProfile(account, fillData, async account => {
        await fs.writeFile(path.join(accountsPath, accounts[x]), JSON.stringify(account, null, 2))
      })
    }
  }
})()