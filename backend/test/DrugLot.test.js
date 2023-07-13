const DrugLot = artifacts.require("./DrugLot.sol");
const Fda = artifacts.require("./Fda.sol");
const DrugFormulation = artifacts.require("./DrugFormulation.sol");
const DrugAPI = artifacts.require("./DrugAPI.sol");
const DrugExcipient = artifacts.require("./DrugExcipient.sol");

const setupAuthDrugFormulation = async (fda, fdaApprover, drugMaker) => {
  const apiFormulation = await new web3.eth.Contract(DrugAPI.abi)
    .deploy({
      data: DrugAPI.bytecode,
      arguments: [fda.address, "Test API", 0, 10],
    })
    .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
  const excipientFormulation = await new web3.eth.Contract(DrugExcipient.abi)
    .deploy({
      data: DrugExcipient.bytecode,
      arguments: [fda.address, "Test Excipient", 0, 10],
    })
    .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
  await fda.approveDrugApi(apiFormulation._address, 1704724087, {
    from: fdaApprover,
  });
  await fda.approveDrugExcipient(excipientFormulation._address, "1.5", {
    from: fdaApprover,
  });
  const drugFormulation = await new web3.eth.Contract(DrugFormulation.abi)
    .deploy({
      data: DrugFormulation.bytecode,
      arguments: [
        fda.address,
        "Test Formulation",
        0,
        10,
        [{ ingAddress: apiFormulation._address, quantityMg: "2" }],
        [{ ingAddress: excipientFormulation._address, quantityMg: "1.5" }],
      ],
    })
    .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
  await fda.approveDrugFormulation(drugFormulation._address, {
    from: fdaApprover,
  });
  return { apiFormulation, excipientFormulation, drugFormulation };
};

const setupDrugLot = async (
  fda,
  drugFormulation,
  drugMaker,
  distributor,
  pharmacy
) => {
  const drugLot = await new web3.eth.Contract(DrugLot.abi)
    .deploy({
      data: DrugLot.bytecode,
      arguments: [fda.address, drugFormulation._address],
    })
    .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
  await drugLot.methods
    .manufacturerAddress(drugMaker)
    .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
  await drugLot.methods
    .distributorAddress(distributor)
    .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
  await drugLot.methods
    .pharmacyAddress(pharmacy)
    .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
  return drugLot;
};

const setupEnvironment = async (
  fdaAdmin,
  fdaApprover,
  drugMaker,
  distributor,
  pharmacy
) => {
  const fda = await Fda.deployed();
  await fda.addApprover(fdaApprover);
  const { drugFormulation, apiFormulation, excipientFormulation } =
    await setupAuthDrugFormulation(fda, fdaApprover, drugMaker);
  assert.equal(
    await drugFormulation.methods
      .apiFormulaMapping(apiFormulation._address)
      .call(),
    "2"
  );
  assert.equal(
    await drugFormulation.methods
      .excipientFormulaMapping(excipientFormulation._address)
      .call(),
    "1.5"
  );
  const drugLot = await setupDrugLot(
    fda,
    drugFormulation,
    drugMaker,
    distributor,
    pharmacy
  );
  return {
    fda,
    drugLot,
    drugFormulation,
    apiFormulation,
    excipientFormulation,
  };
};

contract("DrugLot", (accounts) => {
  const fdaAdmin = accounts[0];
  const fdaApprover = accounts[9];
  const drugMaker = accounts[2];
  const distributor = accounts[5];
  const pharmacy = accounts[6];

  describe("Tests for starting / completing manufacturing", () => {
    let fda, drugFormulation, apiFormulation, excipientFormulation, drugLot;
    const lotName = "Test Lot";
    const numBoxes = 20;
    const lotPrice = 1000;
    const boxPrice = 55;
    before(async () => {
      const res = await setupEnvironment(
        fdaAdmin,
        fdaApprover,
        drugMaker,
        distributor,
        pharmacy
      );
      fda = res.fda;
      drugLot = res.drugLot;
      drugFormulation = res.drugFormulation;
      apiFormulation = res.apiFormulation;
      excipientFormulation = res.excipientFormulation;
    });

    it("Should allow authorized manufacturers to start the manufacturing process with approved drug formulation, when manufacturing is not started", async () => {
      const receipt = await drugLot.methods
        .startManufacturing(lotName, numBoxes, lotPrice, boxPrice)
        .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
      assert.equal(
        Object.keys(receipt.events).includes("lotManufacturingStarted"),
        true,
        "Should emit appropriate event"
      );
      assert.equal(
        receipt.events.lotManufacturingStarted.returnValues.manufacturer,
        drugMaker
      );
      assert.equal(
        receipt.events.lotManufacturingStarted.returnValues.lotName,
        lotName
      );
      assert.equal(
        receipt.events.lotManufacturingStarted.returnValues.numBoxes,
        numBoxes
      );
    });

    it("Should not allow unauthorized manufacturers to start manufacturing process", async () => {
      const drugLot = await setupDrugLot(
        fda,
        drugFormulation,
        drugMaker,
        distributor,
        pharmacy
      );
      try {
        await drugLot.methods
          .startManufacturing(lotName, numBoxes, lotPrice, boxPrice)
          .send({ from: distributor, gas: 4712388, gasPrice: 100000000000 });
      } catch (error) {
        assert.equal(
          error.data.stack.includes(
            "Only an authorized manufacturer can perform this action"
          ),
          true
        );
      }
    });

    it("Should not allow drug lots with unauthorized formulations to be initialized", async () => {
      try {
        const drugFormulation = await new web3.eth.Contract(DrugFormulation.abi)
          .deploy({
            data: DrugFormulation.bytecode,
            arguments: [
              fda.address,
              "Test Formulation",
              0,
              10,
              [{ ingAddress: apiFormulation._address, quantityMg: "2" }],
              [
                {
                  ingAddress: excipientFormulation._address,
                  quantityMg: "1.5",
                },
              ],
            ],
          })
          .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
        await setupDrugLot(
          fda,
          drugFormulation,
          drugMaker,
          distributor,
          pharmacy
        );
      } catch (error) {
        assert.equal(
          error.data.stack.includes(
            "Require formulation of the drug to be approved before starting to manufacture it"
          ),
          true
        );
      }
    });

    it("Should allow completion of manufacturing of an in-process lot", async () => {
      const manufacturingDate = 1675000000;
      const expiryDate = 1738072000;
      const receipt = await drugLot.methods
        .completeManufacturing(manufacturingDate, expiryDate)
        .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
      assert.equal(
        Object.keys(receipt.events).includes("lotManufactured"),
        true,
        "Should emit appropriate event"
      );
      assert.equal(
        receipt.events.lotManufactured.returnValues.manufacturer,
        drugMaker
      );
      assert.equal(
        receipt.events.lotManufactured.returnValues.lotName,
        lotName
      );
      assert.equal(
        receipt.events.lotManufactured.returnValues.numBoxes,
        numBoxes
      );
      assert.equal(
        receipt.events.lotManufactured.returnValues.manufacturingDate,
        manufacturingDate
      );
      assert.equal(
        receipt.events.lotManufactured.returnValues.expiryDate,
        expiryDate
      );
    });

    it("Should not allow completion of manufacturing of a lot whose manufacturing hasn't started yet", async () => {
      const manufacturingDate = 1675000000;
      const expiryDate = 1738072000;
      const drugLot = await setupDrugLot(
        fda,
        drugFormulation,
        drugMaker,
        distributor,
        pharmacy
      );
      try {
        await drugLot.methods
          .completeManufacturing(manufacturingDate, expiryDate)
          .send({ from: drugMaker, gas: 4712388, gasPrice: 100000000000 });
      } catch (error) {
        assert.equal(
          error.data.stack.includes(
            "Manufacturing status must be started in order to mark it complete"
          ),
          true
        );
      }
    });
  });
});
