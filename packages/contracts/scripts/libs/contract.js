import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import colors from 'colors'
import { fileURLToPath } from 'url'
import { json } from 'starknet'
import { getNetwork, getAccount } from './network.js'
import { getExchanges } from './exchange.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TARGET_PATH = path.join(__dirname, '..', '..', 'target', 'dev')

const getContracts = () => {
  if (!fs.existsSync(TARGET_PATH)) {
    throw new Error(`Target directory not found at path: ${TARGET_PATH}`)
  }
  const contracts = fs.readdirSync(TARGET_PATH).filter((contract) => contract.includes('.contract_class.json'))
  if (contracts.length === 0) {
    throw new Error('No build files found. Run `scarb build` first')
  }
  return contracts
}

const getTokenLockerPath = () => {
  const contracts = getContracts()
  const tokenLocker = contracts.find((contract) => contract.includes('TokenLocker'))
  if (!tokenLocker) {
    throw new Error('TokenLocker contract not found. Run `scarb build` first')
  }
  return path.join(TARGET_PATH, tokenLocker)
}

const getUnruggableMemecoinPath = () => {
  const contracts = getContracts()
  const unruggableMemecoin = contracts.find((contract) => contract.includes('UnruggableMemecoin'))
  if (!unruggableMemecoin) {
    throw new Error('UnruggableMemecoin contract not found. Run `scarb build` first')
  }
  return path.join(TARGET_PATH, unruggableMemecoin)
}

const getFactoryPath = () => {
  const contracts = getContracts()
  const factory = contracts.find((contract) => contract.includes('Factory'))
  if (!factory) {
    throw new Error('Factory contract not found. Run `scarb build` first')
  }
  return path.join(TARGET_PATH, factory)
}

const declare = async (filepath, contract_name) => {
  console.log(`\nDeclaring ${contract_name}...`.magenta)
  const compiledSierraCasm = filepath.replace('.contract_class.json', '.compiled_contract_class.json')
  const compiledFile = json.parse(fs.readFileSync(filepath).toString('ascii'))
  const compiledSierraCasmFile = json.parse(fs.readFileSync(compiledSierraCasm).toString('ascii'))
  const account = getAccount()
  const contract = await account.declareIfNot({
    contract: compiledFile,
    casm: compiledSierraCasmFile,
  })

  const network = getNetwork(process.env.STARKNET_NETWORK)
  console.log(`- Class Hash: `.magenta, `${contract.class_hash}`)
  if (contract.transaction_hash) {
    console.log('- Tx Hash: '.magenta, `${network.explorer_url}/tx/${contract.transaction_hash})`)
    await account.waitForTransaction(contract.transaction_hash)
  } else {
    console.log('- Tx Hash: '.magenta, 'Already declared')
  }

  return contract
}

export const deployTokenLocker = async (min_lock_time) => {
  // Load account
  const account = getAccount()

  // Declare contract
  const locker = await declare(getTokenLockerPath(), 'TokenLocker')

  // Deploy contract
  console.log(`\nDeploying TokenLocker...`.green)
  console.log('Min lock time: '.green, min_lock_time)
  const contract = await account.deployContract({
    classHash: locker.class_hash,
    constructorCalldata: [min_lock_time],
  })

  // Wait for transaction
  const network = getNetwork(process.env.STARKNET_NETWORK)
  console.log('Tx hash: '.green, `${network.explorer_url}/tx/${contract.transaction_hash})`)
  await account.waitForTransaction(contract.transaction_hash)
}

export const deployFactory = async () => {
  // Load account
  const account = getAccount()

  // Declare contracts
  const memecoin = await declare(getUnruggableMemecoinPath(), 'UnruggableMemecoin')
  const factory = await declare(getFactoryPath(), 'Factory')

  // Deploy factory
  const exchanges = getExchanges(process.env.STARKNET_NETWORK)
  console.log(`\nDeploying Factory...`.green)
  console.log('Owner: '.green, process.env.STARKNET_ACCOUNT_ADDRESS)
  console.log('Memecoin class hash: '.green, memecoin.class_hash)
  console.log('Exchanges: '.green, exchanges)

  const contract = await account.deployContract({
    classHash: factory.class_hash,
    constructorCalldata: [process.env.STARKNET_ACCOUNT_ADDRESS, memecoin.class_hash, exchanges],
  })

  // Wait for transaction
  const network = getNetwork(process.env.STARKNET_NETWORK)
  console.log('Tx hash: '.green, `${network.explorer_url}/tx/${contract.transaction_hash})`)
  await account.waitForTransaction(contract.transaction_hash)
}
