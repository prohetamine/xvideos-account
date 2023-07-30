import fetch from 'node-fetch'
import chalk from 'chalk'
import { HttpsProxyAgent } from 'https-proxy-agent'

;(async () => {
  let good = 0
    , bad = 0 
    , i = 0

  const data = await fetch('https://api.nordvpn.com/v1/servers/recommendations?limit=6000')
          .then(data => data.json())
  
  console.log('- - - - - - - - - -')
  
  for (let x = 110; x < data.length; x += 10) {
    await Promise.all(
      Array(10)
        .fill(true)
        .map(async (_, x2) => {
          let isGood = false
            , _name = ''

          for (let p = 0; p < 3; p++) {
            try {
              const { hostname, name } = data[x2 + x]
              
              _name = name

              const agent = new HttpsProxyAgent(`https://difVnNwSuUgRM2NZqsH1ngCV:D1PkZVptDTNwc2jhmKoZTHdr@${hostname}:89`)
        
              const kill = new AbortController()
              
              setTimeout(() => {
                kill.abort()
              }, 15000)

              const ip = await fetch('https://api.ipify.org', {
                agent,
                signal: kill.signal
              }).then(data => data.text())
              
              i++
              console.log(`#${i} | ${name} | (${p+1}) | ${ip} | ${chalk.green('yes')}`)
              isGood = true
              break
            } catch (err) {
              // ok
            }
          }

          if (!isGood) {
            i++
            console.log(`#${i} | ${_name} | (3) | none | ${chalk.red('no')}`)
            bad++
          } else {
            good++
          }
        })
    )
  }

  console.log('- - - - - - - - - -')
  console.log(`Good:`, chalk.green(good))
  console.log(`Bad:`, chalk.red(bad))
  console.log('- - - - - - - - - -')
})()
