const {ethers} = require("hardhat");
const { expect } = require("chai");

function toWei(amount) {
  return ethers.utils.parseUnits(amount, 18);
}

describe("SwapperTestBnb", function () {

  let owner, alice, bob;

  let Proxy, MockToken, SwapperTestBnb;
  let dexeToken;

  before(async () => {
    [admin, alice, bob] = await ethers.getSigners();
    Proxy = await ethers.getContractFactory("ERC1967Proxy");
    Dexe = await ethers.getContractFactory("DexeToken");
    Swapper = await ethers.getContractFactory("SwapperTestBnb");
  })

  beforeEach(async () => {
    dexe = await Dexe.deploy();
    swapper = await Swapper.deploy();
  })

  describe("proxy", () => {
    let erc1967;
    let proxy;
    beforeEach(async () => {
      erc1967 = await Proxy.deploy(swapper.address, "0x");
      proxy = await ethers.getContractAt("SwapperTestBnb", erc1967.address);
      await proxy.__SwapperTestBnb_init(dexe.address);
    });
    it("cant initialize twice", async () => {
      await expect(proxy.__SwapperTestBnb_init(dexe.address)).to.be.revertedWith(
        "Initializable: contract is already initialized"
      );
    });

    it("cant set new implementation by not owner", async () => {
      let swapper1 = await (await ethers.getContractFactory("SwapperTestBnb")).deploy();
      await expect(proxy.connect(alice).upgradeTo(swapper1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("owner could set new implementation", async () => {
      expect(await proxy.getImplementation()).to.equal(swapper.address);
      let swapper1 = await (await ethers.getContractFactory("SwapperTestBnb")).deploy();
      await proxy.upgradeTo(swapper1.address);
      expect(await proxy.getImplementation()).to.equal(swapper1.address);
    });

    it("owner could change ownership", async () => {
      expect(await proxy.owner()).to.equal(admin.address);
      await proxy.transferOwnership(alice.address);
      expect(await proxy.owner()).to.equal(alice.address);
    });

    it("new owner could upgrade", async () => {
      await proxy.transferOwnership(alice.address);
      let swapper1 = await (await ethers.getContractFactory("SwapperTestBnb")).deploy();
      await expect(proxy.connect(admin).upgradeTo(swapper1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await proxy.connect(alice).upgradeTo(swapper1.address);
      expect(await proxy.getImplementation()).to.equal(swapper1.address);
    });

    it("not owner cant change ownership", async () => {
      await expect(proxy.connect(alice).transferOwnership(bob.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("swap", () => {
    
    beforeEach(async () => {
      await swapper.__SwapperTestBnb_init(dexe.address);
      expect(await dexe.balanceOf(alice.address)).to.equal(0);
      await dexe.transfer(swapper.address, toWei("1000000"));
    });

    it("swap", async () => {
      expect(await dexe.balanceOf(alice.address)).to.equal(0);
      await alice.sendTransaction({
        to: swapper.address,
        value: ethers.utils.parseEther("1"),
      });
      expect(await dexe.balanceOf(alice.address)).to.equal(toWei("2000"));
    });
    it("change rate", async () => {
      expect(await dexe.balanceOf(alice.address)).to.equal(0);
      await swapper.setRate(1000);
      await alice.sendTransaction({
        to: swapper.address,
        value: ethers.utils.parseEther("1"),
      });
      expect(await dexe.balanceOf(alice.address)).to.equal(toWei("1000"));
    });
    it("withdrawBNB", async () => {
      await alice.sendTransaction({
        to: swapper.address,
        value: ethers.utils.parseEther("1"),
      });
      let bnbBefore = await ethers.provider.getBalance(admin.address);
      let tx = await swapper.withdrawBNB();
      let receipt = await tx.wait();
      let bnbUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      let oneBnb = ethers.utils.parseEther("1");
      let bnbAfter = await ethers.provider.getBalance(admin.address);
      expect(bnbAfter).to.equal(bnbBefore.sub(bnbUsed).add(oneBnb));
    });
    it("withdrawTokens", async () => {
      let dexeAmount = await dexe.balanceOf(swapper.address);
      expect(dexeAmount).to.not.equal(0);
      expect(await dexe.balanceOf(swapper.address)).to.equal(dexeAmount);
      expect(await dexe.balanceOf(alice.address)).to.equal(0);
      await swapper.transferOwnership(alice.address);
      await swapper.connect(alice).withdrawTokens([dexe.address], [dexeAmount]);
      expect(await dexe.balanceOf(swapper.address)).to.equal(0);
      expect(await dexe.balanceOf(alice.address)).to.equal(dexeAmount);
    });
    it("cant withdraw more then balance", async () => {
      let dexeAmount = await dexe.balanceOf(swapper.address);
      dexeAmount = dexeAmount.add(1);
      await expect(swapper.withdrawTokens([dexe.address], [dexeAmount])).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });
    it("arrays should be the same size", async () => {
      await expect(swapper.withdrawTokens([dexe.address], [0, 0])).to.be.revertedWith('Swapper: arrays of different size');
    });
    it("cant swap with insufficient balance", async () => {
      let dexeAmount = await dexe.balanceOf(swapper.address);
      await swapper.withdrawTokens([dexe.address], [dexeAmount]);
      await expect(alice.sendTransaction({
        to: swapper.address,
        value: toWei("1"),
      })).to.be.revertedWith('Not enought tokens on contract balance');
    });
    it("could set new token", async () => {
      let NewToken = await ethers.getContractFactory("TokenLowDecimals");
      let newToken = await NewToken.deploy();
      await swapper.setDexeToken(newToken.address);
      let amountBefore = ethers.utils.parseUnits("10000", 6);
      let amountAfter = ethers.utils.parseUnits("8000", 6);
      await newToken.transfer(swapper.address, amountBefore);
      expect(await newToken.balanceOf(alice.address)).to.equal(0);
      expect(await newToken.balanceOf(swapper.address)).to.equal(amountBefore);
      await alice.sendTransaction({
        to: swapper.address,
        value: ethers.utils.parseEther("1"),
      });
      expect(await newToken.balanceOf(alice.address)).to.equal(ethers.utils.parseUnits("2000", 6));
      expect(await newToken.balanceOf(swapper.address)).to.equal(amountAfter);
    });

  });

  describe("ownable", () => {
    const NOTOWNER = 'Ownable: caller is not the owner';
    beforeEach(async () => {
      await swapper.__SwapperTestBnb_init(dexe.address);
      expect(await swapper.owner()).to.equal(admin.address);
    });
    it("reverts for not owner", async () => {
      await expect(swapper.connect(alice).setDexeToken(bob.address)).to.be.revertedWith(NOTOWNER);
      await expect(swapper.connect(alice).withdrawBNB()).to.be.revertedWith(NOTOWNER);
      await expect(swapper.connect(alice).withdrawTokens([dexe.address], [1])).to.be.revertedWith(NOTOWNER);
      await expect(swapper.connect(alice).setRate(1)).to.be.revertedWith(NOTOWNER);
    });
  });

});
