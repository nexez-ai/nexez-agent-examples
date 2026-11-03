#!/usr/bin/env node
/**
 * Prove this directory's packed files are @nexez/openclaw-nexez 0.2.2.
 *
 * npm and ClawHub both still serve that release, and their tarballs are the
 * same bytes. This script checks the registry digests, downloads both copies,
 * compares the eight packed files to this directory, rebuilds dist when
 * TypeScript is installed, and rebuilds the tarball with npm pack.
 *
 * scripts/gauntlet-production.mjs is not part of the published tarball. This
 * tree points that script at the live published listing. The pack check still
 * has to match the published bytes.
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync, existsSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VERSION = '0.2.2'
const NPM_VERSION_URL = 'https://registry.npmjs.org/@nexez%2fopenclaw-nexez/0.2.2'
const NPM_TARBALL_URL = 'https://registry.npmjs.org/@nexez/openclaw-nexez/-/openclaw-nexez-0.2.2.tgz'
const CLAWHUB_VERSION_URL = 'https://clawhub.ai/api/v1/packages/%40nexez%2Fopenclaw-nexez/versions/0.2.2'
const CLAWHUB_DOWNLOAD_URL = `${CLAWHUB_VERSION_URL}/artifact/download`

const EXPECTED = {
  bytes: 9896,
  sha256: '3adc56722581efaf1f050018b31700eb3e049749714d61def11e997ee0e5e1a5',
  sha1: '3c36e06df7ad162980ee9d066dcb347d8107317f',
  integrity: 'sha512-Pac4l1U0YYueEJZAeylPYonlDxlj1TjcqjMD4zGFiEphmdQ6c5MyFWOAYbBi6Zq1te//C50aBO0MG0Pi4+8FIQ==',
  fileCount: 8,
  files: {
    'LICENSE': '9f42d6c44413fbe084cd59e6f000c2b8e86c5cb68b8e42b4802538bff65f5b43',
    'README.md': '1b8de16b1b286c28594f8dbe92bff82dc5ce566b8fb03f3b23cb7f6cff5719d0',
    'package.json': 'e66f2d32f61284b0e5993deabd9de05b7810aaff68751e9a00274fc2f3044bb4',
    'openclaw.plugin.json': '8f681486e940b884d22635d8bb863a470af5e63d50b2d2ae2e2b3e546dbd3e2c',
    'dist/index.js': '4f971e8cc1a3aef628a8f7b57effd31b033be35d7d433bf806765e080756aaef',
    'dist/index.d.ts': '84b33238011ee44b8593e96cad4e247fca96dd08e6e27d10a1dc54e52e83bdc1',
    'dist/nexez-client.js': '7a854b6d213472b8482cdf64e5bc0b466a646df7a8303dd7de00c4569ba992d2',
    'dist/nexez-client.d.ts': 'a3cacd7151e6e3039dd7ac2766baf9e781f01fbd66710abe0ed52bb6afde3f65',
  },
}

for (const [file, digest] of Object.entries(EXPECTED.files)) {
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error(`Pinned digest for ${file} is not 64 hex characters (length ${digest.length}).`)
  }
}

const failures = []

function fail(message) {
  failures.push(message)
  console.error(`FAIL ${message}`)
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function sha1(bytes) {
  return createHash('sha1').update(bytes).digest('hex')
}

function integrity(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`
}

async function fetchBytes(url) {
  const response = await fetch(url)
  const bytes = Buffer.from(await response.arrayBuffer())
  return { status: response.status, bytes }
}

function digestsMatch(bytes, label) {
  const sizeOk = bytes.length === EXPECTED.bytes
  const sha256Ok = sha256(bytes) === EXPECTED.sha256
  const sha1Ok = sha1(bytes) === EXPECTED.sha1
  const integrityOk = integrity(bytes) === EXPECTED.integrity
  if (!sizeOk) fail(`${label} size ${bytes.length}, expected ${EXPECTED.bytes}`)
  if (!sha256Ok) fail(`${label} sha256 mismatch`)
  if (!sha1Ok) fail(`${label} sha1 mismatch`)
  if (!integrityOk) fail(`${label} npm integrity mismatch`)
  if (sizeOk && sha256Ok && sha1Ok && integrityOk) {
    console.log(`PASS ${label} matches sha256, sha1, and npm integrity`)
  }
  return sizeOk && sha256Ok && sha1Ok && integrityOk
}

function unpackTarball(bytes) {
  const directory = mkdtempSync(path.join(tmpdir(), 'nexez-openclaw-022-'))
  const archive = path.join(directory, 'artifact.tgz')
  writeFileSync(archive, bytes)
  const result = spawnSync('tar', ['-xzf', archive, '-C', directory], { encoding: 'utf8' })
  if (result.status !== 0) {
    rmSync(directory, { recursive: true, force: true })
    throw new Error(result.stderr || 'tar failed')
  }
  return {
    packageDir: path.join(directory, 'package'),
    cleanup() {
      rmSync(directory, { recursive: true, force: true })
    },
  }
}

function packMatches() {
  const directory = mkdtempSync(path.join(tmpdir(), 'nexez-openclaw-pack-'))
  try {
    cpSync(root, directory, {
      recursive: true,
      filter(source) {
        const relative = path.relative(root, source)
        if (!relative) return true
        return relative !== 'node_modules' && !relative.startsWith(`node_modules${path.sep}`) && !relative.endsWith('.tgz')
      },
    })
    const result = spawnSync('npm', ['pack', '--ignore-scripts', '--json'], {
      cwd: directory,
      encoding: 'utf8',
    })
    if (result.status !== 0) {
      fail(`npm pack failed: ${(result.stderr || result.stdout || '').slice(0, 400)}`)
      return
    }
    const packed = JSON.parse(result.stdout)
    const filename = packed[0]?.filename
    if (!filename) {
      fail('npm pack did not report a filename')
      return
    }
    const bytes = readFileSync(path.join(directory, filename))
    if (sha256(bytes) !== EXPECTED.sha256 || integrity(bytes) !== EXPECTED.integrity) {
      fail(`npm pack digest mismatch: sha256 ${sha256(bytes)}`)
      return
    }
    console.log(`PASS npm pack reproduces ${filename} (${bytes.length} bytes)`)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function buildMatches() {
  const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
  if (!existsSync(tsc)) {
    console.log('SKIP rebuild check: run npm ci in this directory to compile dist with the pinned TypeScript')
    return
  }
  const directory = mkdtempSync(path.join(tmpdir(), 'nexez-openclaw-build-'))
  try {
    cpSync(path.join(root, 'src'), path.join(directory, 'src'), { recursive: true })
    cpSync(path.join(root, 'tsconfig.json'), path.join(directory, 'tsconfig.json'))
    cpSync(path.join(root, 'package.json'), path.join(directory, 'package.json'))
    symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'))
    const result = spawnSync(process.execPath, [tsc, '-p', 'tsconfig.json'], {
      cwd: directory,
      encoding: 'utf8',
    })
    if (result.status !== 0) {
      fail(`tsc failed: ${(result.stdout || result.stderr || '').slice(0, 400)}`)
      return
    }
    for (const relative of ['dist/index.js', 'dist/index.d.ts', 'dist/nexez-client.js', 'dist/nexez-client.d.ts']) {
      const built = readFileSync(path.join(directory, relative))
      if (sha256(built) !== EXPECTED.files[relative]) {
        fail(`rebuilt ${relative} does not match the published file`)
      }
    }
    if (!failures.some((message) => message.startsWith('rebuilt ') || message.startsWith('tsc '))) {
      console.log('PASS tsc rebuild matches the four published dist files')
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

const securityDoc = readFileSync(path.join(root, 'SECURITY.md'), 'utf8')
if (!securityDoc.includes(EXPECTED.integrity) || !securityDoc.includes(EXPECTED.sha256)) {
  fail('SECURITY.md is missing the pinned artifact digests')
}

const gauntlet = readFileSync(path.join(root, 'scripts', 'gauntlet-production.mjs'), 'utf8')
if (!gauntlet.includes('tai-oladipupo-realtor')) {
  fail('production gauntlet does not target the live published listing')
}
if (gauntlet.includes('shopify-review-catalog')) {
  fail('production gauntlet still depends on the removed catalog fixture')
}

const npmVersion = await fetchBytes(NPM_VERSION_URL)
if (npmVersion.status !== 200) {
  fail(`npm version document returned HTTP ${npmVersion.status}`)
} else {
  const dist = JSON.parse(npmVersion.bytes.toString('utf8')).dist || {}
  if (dist.integrity !== EXPECTED.integrity || dist.shasum !== EXPECTED.sha1) {
    fail('npm registry integrity or shasum does not match the pinned release')
  } else if (dist.fileCount !== EXPECTED.fileCount) {
    fail(`npm file count is ${dist.fileCount}, expected ${EXPECTED.fileCount}`)
  } else {
    console.log('PASS npm registry 0.2.2 integrity, shasum, and file count')
  }
}

const clawVersion = await fetchBytes(CLAWHUB_VERSION_URL)
if (clawVersion.status !== 200) {
  fail(`ClawHub version document returned HTTP ${clawVersion.status}`)
} else {
  const version = JSON.parse(clawVersion.bytes.toString('utf8')).version
  const artifact = version?.artifact || {}
  if (artifact.sha256 !== EXPECTED.sha256 || artifact.npmIntegrity !== EXPECTED.integrity || artifact.npmShasum !== EXPECTED.sha1) {
    fail('ClawHub version document digests do not match the pinned release')
  } else if (artifact.npmFileCount !== EXPECTED.fileCount) {
    fail(`ClawHub file count is ${artifact.npmFileCount}, expected ${EXPECTED.fileCount}`)
  } else if (version?.verification?.sourceCommit !== 'a769d354158916605295df15e52644cecd4d9c7f') {
    fail(`ClawHub source commit is ${version?.verification?.sourceCommit}`)
  } else {
    console.log('PASS ClawHub 0.2.2 document matches the pinned digests and source commit')
  }
}

const npmTarball = await fetchBytes(NPM_TARBALL_URL)
const clawTarball = await fetchBytes(CLAWHUB_DOWNLOAD_URL)
if (npmTarball.status !== 200) fail(`npm tarball returned HTTP ${npmTarball.status}`)
if (clawTarball.status !== 200) fail(`ClawHub artifact returned HTTP ${clawTarball.status}`)
if (npmTarball.status === 200 && clawTarball.status === 200) {
  digestsMatch(npmTarball.bytes, 'npm tarball')
  if (!npmTarball.bytes.equals(clawTarball.bytes)) {
    fail('npm tarball and ClawHub artifact bytes differ')
  } else {
    console.log('PASS npm tarball and ClawHub artifact are the same bytes')
  }
  const unpacked = unpackTarball(npmTarball.bytes)
  try {
    for (const [file, digest] of Object.entries(EXPECTED.files)) {
      const published = readFileSync(path.join(unpacked.packageDir, file))
      const local = readFileSync(path.join(root, file))
      if (sha256(published) !== digest) {
        fail(`unpacked ${file} hashed to ${sha256(published)}, pinned ${digest}`)
      } else if (!published.equals(local)) {
        fail(`${file} differs from the published artifact`)
      } else {
        console.log(`PASS ${file} matches the artifact`)
      }
    }
    packMatches()
  } finally {
    unpacked.cleanup()
  }
}

buildMatches()

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`)
  process.exit(1)
}

console.log('\nOpenClaw 0.2.2 artifact verification passed.')
