import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const photosPath = path.join(__dirname, 'content')
    , photos = fs.readdirSync(photosPath).map(photo => path.join(photosPath, photo))

export default () => photos[parseInt(Math.random() * photos.length)]