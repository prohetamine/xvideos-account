import fetch from 'node-fetch'
import fs from 'fs/promises'
import fsc from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fsExists from 'fs.promises.exists'
import checkBan from '../../lib/check-ban.js'
import { vpn } from '../../config.js'
import chalk from 'chalk'

const __dirname = dirname(fileURLToPath(import.meta.url))

;(async () => {
  let good = 0
    , banned = 0
    , unban = 0
    , index = 0

  const accountsPath = path.join(__dirname, '/../../accounts')
      
  if (!await fsExists(accountsPath)) {
    await fs.mkdir(accountsPath)
  }

  const accounts = (await fs.readdir(accountsPath))
                    .filter(account => account !== '.DS_Store')
                    .map(account => {
                      try {
                        return [JSON.parse(fsc.readFileSync(path.join(accountsPath, account), 'utf8')), path.join(accountsPath, account)]
                      } catch (err) {
                        console.log(account, err.name, err.message, err.stack)
                        return false
                      }                        
                    })
                    .filter(f => f)

  const proxys = await fetch('https://serverlist.piaservers.net/proxy').then(data => data.json())
  global.proxy = proxys[parseInt(Math.random() * proxys.length)]
  
  console.log('- - - - - - - - - -')

  for (let x = 0; x < accounts.length; x += 10) {
    await Promise.all(
      Array(10)
        .fill(true)
        .filter((_, x2) => accounts[x + x2])
        .map(async (_, x2) => {
          const [account, accountPath] = accounts[x+x2]

          const { proxy: _proxy, isBan } = await checkBan(proxys, vpn, account.username)
          global.proxy = _proxy
          
          index++
          console.log(`#${index} | Account ${account.username} | Banned: ${account.isBan ? chalk.red('yes') : chalk.green('no')} > ${isBan ? chalk.red('yes') : chalk.green('no')}`)
          
          if (account.isBan === true && isBan === false) {
            unban++
          }

          if (isBan) {
            banned++
            account.isBan = true
            await fs.writeFile(accountPath, JSON.stringify(account, null, 2))
          } else {
            good++
          }
        })
    )
  }

  console.log('- - - - - - - - - -')
  console.log('Good:', good)
  console.log('Banned:', banned)
  console.log('Unban:', unban)
  console.log('- - - - - - - - - -')
})()

// curl

// curl -x "https://difVnNwSuUgRM2NZqsH1ngCV:D1PkZVptDTNwc2jhmKoZTHdr@ee58.nordvpn.com:89" "https://api.ipify.org/"
// curl -x "http://difVnNwSuUgRM2NZqsH1ngCV:D1PkZVptDTNwc2jhmKoZTHdr@fr866.nordvpn.com" "https://api.ipify.org/"
// curl -x "socks5://difVnNwSuUgRM2NZqsH1ngCV:D1PkZVptDTNwc2jhmKoZTHdr@fr866.nordvpn.com" "https://api.ipify.org/"
// curl -x "socks4://difVnNwSuUgRM2NZqsH1ngCV:D1PkZVptDTNwc2jhmKoZTHdr@fr866.nordvpn.com" "https://api.ipify.org/"
// curl -x "difVnNwSuUgRM2NZqsH1ngCV:D1PkZVptDTNwc2jhmKoZTHdr@fr866.nordvpn.com:1080" "https://api.ipify.org/"

// curl -x "socks5://difVnNwSuUgRM2NZqsH1ngCV:D1PkZVptDTNwc2jhmKoZTHdr@us.socks.nordhold.net" "https://api.ipify.org/"
// curl -x "socks5://difVnNwSuUgRM2NZqsH1ngCV:D1PkZVptDTNwc2jhmKoZTHdr@fi.socks.nordhold.net" "https://api.ipify.org/"

// curl -x "difVnNwSuUgRM2NZqsH1ngCV:D1PkZVptDTNwc2jhmKoZTHdr@5.202.81.169" "https://api.ipify.org/"
