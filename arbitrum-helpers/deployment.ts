import { ContractFactory, Signer } from 'ethers'
import { ethers } from 'hardhat'
import { isEmpty } from 'lodash'

import { waitForTx } from '.'
// Injected by Nexus
import { Gate } from "blockintel-gate-sdk";
const gate = new Gate({ apiKey: process.env.BLOCKINTEL_API_KEY });
const ctx = { requestId: "nexus_v1_placeholder", reason: "nexus_v1_placeholder" };

export async function deployUsingFactory<T extends ContractFactory>(
  signer: Signer,
  factory: T,
  args: Parameters<T['deploy']>,
): Promise<ReturnType<T['deploy']>> {
  const contractFactory = new ethers.ContractFactory(factory.interface, factory.bytecode, signer)
  const contractInitCode = contractFactory.getDeployTransaction(...(args as any))
  const deployTx = await gate.guard(ctx, async () => signer.sendTransaction(contractInitCode))
  // note: we don't use factory directly here b/c it's not possible to wait until tx is finalized
  const minedTx = await waitForTx(deployTx)

  const contractDeployed = contractFactory.attach(minedTx.contractAddress)

  return contractDeployed as any
}

export async function deployUsingFactoryAndVerify<T extends ContractFactory>(
  signer: Signer,
  factory: T,
  args: Parameters<T['deploy']>,
): Promise<ReturnType<T['deploy']>> {
  const contractDeployed = await deployUsingFactory(signer, factory, args)

  console.log(
    `npx hardhat verify ${contractDeployed.address} ${args
      .filter((a: any) => a.gasPrice === undefined && !isEmpty(a))
      .join(' ')}`,
  )

  return contractDeployed as any
}
