const child_process = require('child_process')
const fs = require('fs')

const argv = process.argv.slice(2)

const PLAYGROUND_GIT = 'https://github.com/covjson/playground.git'
const PLAYGROUND_REF = argv[0] || 'origin/master'
const PLAYGROUND_DIR = 'playground'

function exec(cmd) {
  console.log(`> ${cmd}`)
  child_process.execSync(cmd, {stdio: 'inherit'})
}

if (!fs.existsSync(PLAYGROUND_DIR)) {
    exec(`git clone ${PLAYGROUND_GIT} ${PLAYGROUND_DIR}`)
}
exec(`git -C ${PLAYGROUND_DIR} fetch`)
exec(`git -C ${PLAYGROUND_DIR} checkout ${PLAYGROUND_REF}`)

try {
  exec('yalc --version')
} catch (e) {
  console.log('ERROR: yalc not found, install with: npm install -g yalc')
  process.exit(1)
}

// Publish leaflet-coverage to local store
exec('npm install --ignore-scripts --no-audit')
exec('yalc publish')

// Run playground with local leaflet-coverage
process.chdir(PLAYGROUND_DIR)
exec('yalc add leaflet-coverage')
exec(`npm install --no-audit`)
exec(`npm run start`)
