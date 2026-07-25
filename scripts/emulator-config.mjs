import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_PORTS = {
  auth: 9099,
  firestore: 8751,
  storage: 9199,
  functions: 55002
}

const readPort = (emulators, name) => {
  const port = emulators?.[name]?.port
  return typeof port === 'number' ? port : DEFAULT_PORTS[name]
}

export const readEmulatorConfig = (projectRoot = process.cwd()) => {
  let emulators = {}
  try {
    const firebaseConfig = JSON.parse(readFileSync(join(projectRoot, 'firebase.json'), 'utf8'))
    emulators = firebaseConfig.emulators ?? {}
  } catch {
    // Standalone scripts can still use the documented default ports.
  }

  const ports = {
    auth: readPort(emulators, 'auth'),
    firestore: readPort(emulators, 'firestore'),
    storage: readPort(emulators, 'storage'),
    functions: readPort(emulators, 'functions')
  }

  return {
    ports,
    hosts: {
      auth: `127.0.0.1:${ports.auth}`,
      firestore: `127.0.0.1:${ports.firestore}`,
      storage: `127.0.0.1:${ports.storage}`,
      functions: `127.0.0.1:${ports.functions}`
    }
  }
}

export const configureAdminEmulatorEnv = ({
  projectRoot = process.cwd(),
  env = process.env
} = {}) => {
  const config = readEmulatorConfig(projectRoot)
  env.FIREBASE_AUTH_EMULATOR_HOST ||= config.hosts.auth
  env.FIRESTORE_EMULATOR_HOST ||= config.hosts.firestore
  env.FIREBASE_STORAGE_EMULATOR_HOST ||= config.hosts.storage
  return config
}
