const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RegistryResolver", function () {
  let Registry, registry, owner, other;

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    Registry = await ethers.getContractFactory("RegistryResolver");
    registry = await Registry.deploy(owner.address);
    await registry.deployed();
  });

  it("allows registrar to create a record", async () => {
    const recordHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-record"));
    const cid = "bafytestcid";
    await expect(registry.connect(owner).createRecord(recordHash, cid, other.address, "0x"))
      .to.emit(registry, "RecordCreated")
      .withArgs(recordHash, other.address, cid, (value) => typeof value === 'object', owner.address); // timestamp check lenient
    const rec = await registry.getRecord(recordHash);
    expect(rec[0]).to.equal(other.address);
    expect(rec[1]).to.equal(cid);
  });

  it("prevents double create", async () => {
    const recordHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-record"));
    await registry.connect(owner).createRecord(recordHash, "cid1", other.address, "0x");
    await expect(registry.connect(owner).createRecord(recordHash, "cid1", other.address, "0x"))
      .to.be.revertedWith("Record already exists");
  });

  it("blocks non-registrar from creating", async () => {
    const recordHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test2"));
    await expect(registry.connect(other).createRecord(recordHash, "cid", other.address, "0x")).to.be.reverted;
  });
});
