/* eslint-disable @typescript-eslint/no-var-requires */

import fs from 'fs'
import path from 'path'
import {
  Account,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk'

type BigNumberish = string | bigint | number

type Groth16Proof = {
  pi_a: [BigNumberish, BigNumberish, BigNumberish?]
  pi_b: [[BigNumberish, BigNumberish], [BigNumberish, BigNumberish], BigNumberish[]?]
  pi_c: [BigNumberish, BigNumberish, BigNumberish?]
}

type CredentialProofFile = {
  proof: {
    signatureValue: {
      proof: Groth16Proof
      public: BigNumberish[]
    }
  }
}

type GenericProofFile = {
  proof: Groth16Proof
  public?: BigNumberish[]
  pub_signals?: BigNumberish[]
  publicSignals?: BigNumberish[]
}

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var ${name}`)
  }
  return value
}

function shouldAllowHttp(rpcUrl: string): boolean {
  if (process.env.SOROBAN_ALLOW_HTTP) {
    return process.env.SOROBAN_ALLOW_HTTP === '1'
  }

  return rpcUrl.startsWith('http://')
}

function getNetworkPassphrase(network: string): string {
  switch (network) {
    case 'testnet':
      return Networks.TESTNET
    case 'mainnet':
      return Networks.PUBLIC
    case 'standalone':
      return Networks.STANDALONE
    default:
      return network
  }
}

function toBigInt(value: BigNumberish): bigint {
  return BigInt(value)
}

function toHex32(value: BigNumberish): string {
  return toBigInt(value).toString(16).padStart(64, '0')
}

function be32(value: BigNumberish): Buffer {
  return Buffer.from(toHex32(value), 'hex')
}

function packGroth16ForSoroban(proof: Groth16Proof): { a: Buffer; b: Buffer; c: Buffer } {
  const a = Buffer.concat([
    be32(proof.pi_a[0]),
    be32(proof.pi_a[1]),
  ])

  const b = Buffer.concat([
    be32(proof.pi_b[0][1]),
    be32(proof.pi_b[0][0]),
    be32(proof.pi_b[1][1]),
    be32(proof.pi_b[1][0]),
  ])

  const c = Buffer.concat([
    be32(proof.pi_c[0]),
    be32(proof.pi_c[1]),
  ])

  return { a, b, c }
}

function parseProofFile(filePath: string): { proof: Groth16Proof; pubSignals: bigint[] } {
  const absolutePath = path.resolve(filePath)
  const raw = fs.readFileSync(absolutePath, 'utf8')
  const json = JSON.parse(raw) as CredentialProofFile | GenericProofFile

  if ('proof' in json && 'signatureValue' in json.proof) {
    return {
      proof: json.proof.signatureValue.proof,
      pubSignals: json.proof.signatureValue.public.map(toBigInt),
    }
  }

  const generic = json as GenericProofFile
  const pubSignals = generic.public ?? generic.pub_signals ?? generic.publicSignals ?? []

  return {
    proof: generic.proof,
    pubSignals: pubSignals.map(toBigInt),
  }
}

function resolvePublicSignals(fileSignals: bigint[]): bigint[] {
  if (fileSignals.length >= 5) {
    return fileSignals.slice(0, 5)
  }

  const values = process.env.SOROBAN_PUBLIC_SIGNALS
  if (!values) {
    throw new Error(
      'Proof file does not include 5 public signals. Set SOROBAN_PUBLIC_SIGNALS as a comma-separated list.'
    )
  }

  const parsed = values.split(',').map((value) => toBigInt(value.trim()))
  if (parsed.length !== 5) {
    throw new Error('SOROBAN_PUBLIC_SIGNALS must contain exactly 5 comma-separated values')
  }

  return parsed
}

async function simulateOrSend() {
  const rpcUrl = getEnv('SOROBAN_RPC_URL')
  const contractId = getEnv('SOROBAN_CONTRACT_ID')
  const proofFile = process.env.SOROBAN_PROOF_FILE
    ?? path.join(__dirname, '../../build/example-credential/credential.json')
  const networkPassphrase = getNetworkPassphrase(
    process.env.SOROBAN_NETWORK_PASSPHRASE ?? 'testnet'
  )

  const { proof, pubSignals: fileSignals } = parseProofFile(proofFile)
  const pubSignals = resolvePublicSignals(fileSignals)
  const { a, b, c } = packGroth16ForSoroban(proof)

  const server = new rpc.Server(rpcUrl, { allowHttp: shouldAllowHttp(rpcUrl) })

  const sourceSecret = process.env.SOROBAN_SECRET_KEY
  const sourceKeypair = sourceSecret
    ? Keypair.fromSecret(sourceSecret)
    : Keypair.random()

  const sourceAccount = sourceSecret
    ? await server.getAccount(sourceKeypair.publicKey())
    : new Account(sourceKeypair.publicKey(), '0')

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: 'verify_proof',
        args: [
          nativeToScVal(a, { type: 'bytes' }),
          nativeToScVal(b, { type: 'bytes' }),
          nativeToScVal(c, { type: 'bytes' }),
          nativeToScVal(
            pubSignals.map((value) => nativeToScVal(be32(value), { type: 'bytes' })),
            { type: 'vec' }
          ),
        ],
      })
    )
    .setTimeout(30)
    .build()

  const simulation = await server.simulateTransaction(tx)
  if ('error' in simulation) {
    throw new Error(`Simulation failed: ${simulation.error}`)
  }

  const result = simulation.result?.retval
    ? scValToNative(simulation.result.retval)
    : undefined

  console.log('Simulation result:', result)
  console.log('Contract:', contractId)
  console.log('Proof file:', path.resolve(proofFile))
  console.log('Public signals:', pubSignals.map((value) => value.toString()))

  if (!sourceSecret) {
    console.log('No SOROBAN_SECRET_KEY set, stopping after simulation.')
    return
  }

  const prepared = await server.prepareTransaction(tx)
  prepared.sign(sourceKeypair)

  const sendResponse = await server.sendTransaction(prepared)

  if (!sendResponse.hash) {
    console.log('Proof submission failed.')
    return
  }

  console.log('Submitted transaction hash:', sendResponse.hash)

  for (let attempt = 0; attempt < 20; attempt++) {
    const txResult = await server.getTransaction(sendResponse.hash)

    if (txResult.status === 'SUCCESS') {
      const finalResult = 'returnValue' in txResult && txResult.returnValue
        ? scValToNative(txResult.returnValue)
        : undefined

      console.log('Final on-chain return value:', finalResult)
      console.log('Transaction hash:', txResult.txHash || sendResponse.hash)
      console.log(`Proof ${finalResult ? 'verified' : 'rejected'}.`)
      return
    }

    if (txResult.status === 'FAILED') {
      console.log('Proof submission failed.')
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  console.log('Proof submission timed out.')
}

simulateOrSend().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
