import sleep from 'sleep-promise'
import fs from 'fs/promises'
import fsExists from 'fs.promises.exists'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

;(async ([,, username, accountsPath, /*headless = false*/]) => {
  const account = JSON.parse(await fs.readFile(path.join(accountsPath, `${username}.json`)))

  console.log('im start', account.username)

  await sleep(15000)
  if (Math.random() > 0.3) {
    process.send({ restartTimeout: 60000 * 3 })
    console.log('ok')

    const statsFolder = path.join(__dirname, 'stats')

    if (!await fsExists(statsFolder)) {
      await fs.mkdir(statsFolder)
    }

    await fs.appendFile(path.join(statsFolder, account.id+'.json'), '✅')

    process.exit()
  } else {
    console.log('wait restart', account.username)
    process.exit()
  }
})(process.argv)