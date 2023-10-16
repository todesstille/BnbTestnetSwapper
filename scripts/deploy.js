// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const DexeToken = await hre.ethers.getContractFactory("DexeToken");
  const token = await DexeToken.deploy();
  await token.deployed();
  console.log(
    `Token contract deployed to ${token.address}`
  );

  const Swapper = await hre.ethers.getContractFactory("SwapperTestBnb");
  const Proxy = await hre.ethers.getContractFactory("ERC1967Proxy");
  const logic = await Swapper.deploy();
  await logic.deployed();
  const proxy = await Proxy.deploy(logic.address, "0x");
  await proxy.deployed();

  console.log(
    ` Logic contract deployed to ${logic.address}\n`,
    `Proxy contract deployed to ${proxy.address}`
  );

  const swapper = await hre.ethers.getContractAt("SwapperTestBnb", proxy.address);
  let tx = await swapper.__SwapperTestBnb_init(token.address);
  await tx.wait();
  const tokenAddress = await swapper.dexeToken();

  console.log(`Swapper contract currently pointing at ${tokenAddress} token address`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
