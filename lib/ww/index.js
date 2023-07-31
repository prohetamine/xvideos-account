import { exec, spawnSync, fork } from 'child_process'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import sleep from 'sleep-promise'
import moment from 'moment'
import fs from 'fs/promises'
import fsc from 'fs'
import fsExists from 'fs.promises.exists'
import express from 'express'
import os from 'os'
import PQueue from 'p-queue'
import chalk from 'chalk'
import fetch from 'node-fetch'
import { dolphonToken } from './../../config.js'

const configure = {
  speed: 10
}

const queue = new PQueue({ concurrency: configure.speed })
    , app = express()
    , timein = {}

let validQueue = []

const isMac = os.platform() === 'darwin'
    , __dirname = dirname(fileURLToPath(import.meta.url))

let isKill = false
  , headless = process.argv[4] || 'false'
  , isLaunched = false

app.get('/kill', (req, res) => {
  isKill = true
  res.end('ok')
})

// https://localhost:9989/

app.get('/headless/*', (req, res) => {
  headless = req.params[0] === 'off' ? 'false' : 'true'
  res.end(headless)
})

// http://localhost:9989/headless/off - false (default)
// http://localhost:9989/headless/on - true

const init = async () => {
  let index = 0

  const accountsPath = path.join(__dirname, '/../../', process.argv[3])
      
  for (let i = 0; !isKill; i++) {
    const accounts = (await fs.readdir(accountsPath))
                      .filter(account => account !== '.DS_Store')
                      .map(account => {
                        try {
                          return JSON.parse(fsc.readFileSync(path.join(accountsPath, account), 'utf8'))
                        } catch (err) {
                          console.log(account, err.name, err.message, err.stack)
                          return false
                        }                        
                      })
                      .filter(f => f)
                      .filter(({ isBan/*, isFill*/ }) => !isBan)

    

    console.log(chalk.green(`Accounts: ${accounts.length}`))

    console.log(chalk.magenta(`\n--- [ date: ${moment().format('L')} | time: ${moment().format('LTS')} | iteration: ${i} ] ---\n`))
    
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
    
    const execute = async ({ username, id }, timeout, iteration = 0) => {
      if (isKill) {
        console.log(chalk.red(`[ Killing ☠️  ]`), username, id)
        return
      }

      if (timeout() > 20000) {
        await sleep(10000)

        const od = new Date() - 0
            , restartTimeout = timeout()
        
        console.log(chalk.yellow(`[ Requeue (${moment(restartTimeout).format('m')} min. ${moment(restartTimeout).format('s')} sec.) ♻️  ]`), username, id)

        queue.add(
          () => 
            execute(
              ({ username, id }), 
              () => {
                const cd = new Date() - 0
                return od + restartTimeout < cd ? 0 : od + restartTimeout - cd
              }, 
              iteration + 1
            )
          , {
            priority: 0
          }
        )
        return 
      }

      await sleep(timeout())
    
      isLaunched = true
      delete timein[id]

      if (isKill) {
        console.log(chalk.red(`[ Killing ☠️  ]`), username, id)
        return
      }

      index++
      console.log(chalk.magenta(`[ index: #${index} 🎯 ]`), username, id)

      await new Promise(res => {
        const args = [
          path.join(__dirname, '../../', process.argv[2]), 
          [
            username, 
            accountsPath, 
            headless
          ]
        ]
        console.log(chalk.green('[ Fork script 📜 ]'), username, id)
        const script = fork(...args)
        
        script.on('message', async ({ restartTimeout, blocked }) => {
          if (blocked) {
            const accountPath = path.join(accountsPath, `${username}.json`)
            
            if (await fsExists(accountPath)) {
              console.log(chalk.red('[ Account blocked ❌ ]'), username, id)
              
              const account = accounts.find(account => account.id === id)
              account.isBan = true
              await fs.writeFile(accountPath, JSON.stringify(account, null, 2))

              /*await fetch(`https://dolphin-anty-api.com/browser_profiles/${id}`, {
                headers: {
                  'accept': 'application/json, text/plain, *\/*',
                  'authorization': `Bearer ${dolphonToken}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  statusId: 4593692 // BAN
                }),
                method: 'PATCH'
              })*/
            }
            return
          }

          /*
            await fetch('https://dolphin-anty-api.com/browser_profiles/${id}', {
              headers: {
                'accept': 'application/json, text/plain, *\/*',
                'accept-language': 'ru',
                'authorization': 'Bearer ${dolphonToken}',
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                notes:{
                  content: '<p>Silly-Percentage-753:f1xc4z2nxu ddd</p>',
                  color: 'blue',
                  style: 'text',
                  icon: 'info'
                }
              }),
              method: 'PATCH',
            })
          */
          
          const od = new Date() - 0
          console.log(chalk.cyan(`[ Add queue (${moment(restartTimeout).format('m')} min. ${moment(restartTimeout).format('s')} sec.) 🚗 ]`), username, id, iteration + 1)

          timein[id] = od + restartTimeout
          queue.add(
            () => 
              execute(
                ({ username, id }), 
                () => {
                  const cd = new Date() - 0
                  return od + restartTimeout < cd ? 0 : od + restartTimeout - cd
                }, 
                iteration + 1
              )
            , {
              priority: 0
            }
          )
        })

        script.on('close', async () => {
          console.log(chalk.yellow('[ Exit script 📜 ]'), username, id)
          if (!timein[id]) {
            validQueue = validQueue.filter(_id => _id !== id)
            const od = new Date() - 0
                , restartTimeout = (60000 * 60 * 24)
            timein[id] = od + restartTimeout
          }
          res()
        })
      })
    }

    console.log(chalk.green('[ Start queue 🚗 ]'))
    await new Promise(res => {
      accounts
        .filter(({ id }) => !validQueue.find(_id => _id === id))
        .map(({ username, id }, i) => {
          const startTimeout = (i + 1) * 1000
          console.log(chalk.yellow(`[ Add queue (${moment(startTimeout).format('m')} min. ${moment(startTimeout).format('s')} sec.) 🚗 ]`), username, id)
          const od = new Date() - 0
          timein[id] = od + startTimeout
          queue.add(
            () => 
              execute(
                ({ username, id }), 
                () => {
                  const cd = new Date() - 0
                  return od + startTimeout < cd ? 0 : od + startTimeout - cd
                }, 
                0
              )
            , 
            {
              priority: validQueue.length > 0 ? 1 : 0
            }
          )
        })
      validQueue = accounts.map(({ id }) => id)

      const intervalId = setInterval(() => {
        if (
          Object
            .keys(timein)
            .map(id => ({ id, timeout: timein[id] > 60000 + (new Date() - 0) }))
            .filter(({ timeout }) => timeout).length === accounts.length
          && 
          isLaunched
        ) {
          isLaunched = false
          console.log(chalk.yellow('[ Exit queue 🚗 ]'))
          clearInterval(intervalId)
          res()
        }
      }, 1000)
    })

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
  console.log('[ 🛑 STOP 🛑 ]')
}

app.listen(9989, init)