const Fda = artifacts.require("./Fda.sol");

contract("FDA", (accounts) => {
  const ogAdmin = accounts[0];
  const approverList = [accounts[1], accounts[2]];
  const newAdmin = accounts[3];
  const approverToBeRemoved = accounts[1];

  describe("Tests for adding / removing roles", () => {
    it("Should allow adding an approver", async () => {
      const deployed = await Fda.deployed();
      const { receipt: receipt1 } = await deployed.addApprover(
        approverList[0],
        {
          from: ogAdmin,
        }
      );
      assert.equal(
        receipt1.from,
        ogAdmin.toLowerCase(),
        "Adding an approver is allowed only by admin"
      );
      const { receipt: receipt2 } = await deployed.addApprover(
        approverList[1],
        {
          from: ogAdmin,
        }
      );
      assert.equal(
        receipt2.from,
        ogAdmin.toLowerCase(),
        "Adding an approver is allowed only by admin"
      );
    });

    it("Should disallow adding a duplicate approver", async () => {
      try {
        const deployed = await Fda.deployed();
        await deployed.addApprover(approverList[0], { from: ogAdmin });
        assert.fail();
      } catch (error) {
        assert.equal(
          error.data.stack.includes("Cannot add a duplicate approver"),
          true
        );
      }
    });

    it("Should allow removal of an approver", async () => {
      const deployed = await Fda.deployed();
      const { receipt } = await deployed.removeApprover(approverToBeRemoved, {
        from: ogAdmin,
      });
      assert.equal(
        receipt.from,
        ogAdmin.toLowerCase(),
        "Removal of an approver can be done only by an admin"
      );
    });

    it("Should disallow anyone except the owner to add an approver", async () => {
      try {
        const deployed = await Fda.deployed();
        await deployed.addApprover(approverList[0], { from: accounts[1] });
        assert.fail();
      } catch (error) {
        assert.equal(error.data.stack.includes("Only admin can do this"), true);
      }
    });

    it("Should disallow anyone except the owner to remove an approver", async () => {
      try {
        const deployed = await Fda.deployed();
        await deployed.removeApprover(approverList[0], { from: accounts[1] });
        assert.fail();
      } catch (error) {
        assert.equal(error.data.stack.includes("Only admin can do this"), true);
      }
    });

    it("Should allow change of admin", async () => {
      const deployed = await Fda.deployed();
      const { receipt } = await deployed.changeAdmin(newAdmin, {
        from: ogAdmin,
      });
      assert.equal(
        receipt.from,
        ogAdmin.toLowerCase(),
        "This function should be called by the existing admin"
      );
      const newAdminInContract = await deployed.admin();
      assert.equal(
        newAdminInContract,
        newAdmin,
        "New admin should be the same as the admin passed in the function"
      );
    });

    it("Should disallow change of admin", async () => {
      try {
        const deployed = await Fda.deployed();
        await deployed.changeAdmin(newAdmin, {
          from: accounts[4],
        });
      } catch (error) {
        assert.equal(error.data.stack.includes("Only admin can do this"), true);
      }
    });
  });

  describe("Tests for approving / rejecting drug API", () => {
    it("Should allow a designated approver to approve drug api", async () => {
      const deployed = await Fda.deployed();
      const apiAddressToBeApproved =
        "0x2f953b6fc63597e0510744dc2ab8620b6b0c1f50";
      const apiPatentExpiryEpoch = 1704724087;
      const { receipt } = await deployed.approveDrugApi(
        apiAddressToBeApproved,
        apiPatentExpiryEpoch,
        { from: approverList[1] }
      );
      assert.equal(
        receipt.logs[0].event,
        "DrugAPIApproved",
        "Event of API Approval must be generated"
      );
      assert.equal(
        receipt.logs[0].args.drugApiAddress.toLowerCase(),
        apiAddressToBeApproved,
        "Approved API Address emitted by the event should be the same as the input API address"
      );
      const patentExpiryInFdaDb = await deployed.getApiPatentExpiry(
        apiAddressToBeApproved
      );
      assert.equal(
        patentExpiryInFdaDb.toNumber(),
        apiPatentExpiryEpoch,
        "Patent expiry in the DB should be the same as the epoch passed when adding the API"
      );
      assert.equal(
        await deployed.checkApiApproval(apiAddressToBeApproved),
        true
      );
    });

    it("Should not allow a random person to approve drug api", async () => {
      const deployed = await Fda.deployed();
      const apiAddressToBeApproved =
        "0x2f953b6fc63597e0510744dc2ab8620b6b0c1100";
      try {
        const apiPatentExpiryEpoch = 1704724087;
        await deployed.approveDrugApi(
          apiAddressToBeApproved,
          apiPatentExpiryEpoch,
          { from: accounts[4] }
        );
      } catch (error) {
        assert.equal(
          error.data.stack.includes("Only an approver can do this"),
          true
        );
        assert.equal(
          await deployed.checkApiApproval(apiAddressToBeApproved),
          false
        );
      }
    });

    it("Should allow a designated approver to reject drug api", async () => {
      const deployed = await Fda.deployed();
      const apiAddressToBeRejected =
        "0x2f953b6fc63597e0510744dc2ab8620b6b0c1100";
      const { receipt } = await deployed.rejectDrugApi(
        apiAddressToBeRejected,
        "Not up to the mark",
        {
          from: approverList[1],
        }
      );
      assert.equal(
        receipt.logs[0].event,
        "DrugAPIRejected",
        "Event of API Approval must be generated"
      );
      assert.equal(
        receipt.logs[0].args.drugApiAddress.toLowerCase(),
        apiAddressToBeRejected,
        "Rejected API Address emitted by the event should be the same as the input API address"
      );
      const patentExpiryInFdaDb = await deployed.getApiPatentExpiry(
        apiAddressToBeRejected
      );
      assert.equal(
        patentExpiryInFdaDb.toNumber(),
        0,
        "Key with API address should not exist in the mapping"
      );
      assert.equal(
        await deployed.checkApiApproval(apiAddressToBeRejected),
        false
      );
    });

    it("Should not allow a random person to reject drug api", async () => {
      const deployed = await Fda.deployed();
      const apiAddressToBeRejected =
        "0x2f953b6fc63597e0510744dc2ab8620b6b0c1100";
      try {
        await deployed.rejectDrugApi(
          apiAddressToBeRejected,
          "Not up to the mark",
          {
            from: accounts[4],
          }
        );
      } catch (error) {
        assert.equal(
          error.data.stack.includes("Only an approver can do this"),
          true
        );
        assert.equal(
          await deployed.checkApiApproval(apiAddressToBeRejected),
          false
        );
      }
    });
  });

  describe("Tests for approving / rejecting drug excipient", () => {
    it("Should allow a designated approver to approve drug excipient", async () => {
      const deployed = await Fda.deployed();
      const excipientAddressToBeApproved =
        "0x2f953b6fc63597e0510744dc2ab8620b6b0c1f51";
      const { receipt } = await deployed.approveDrugExcipient(
        excipientAddressToBeApproved,
        "1.5",
        { from: approverList[1] }
      );
      assert.equal(
        receipt.logs[0].event,
        "DrugExcipientApproved",
        "Event of Excipient Approval must be generated"
      );
      assert.equal(
        receipt.logs[0].args.drugExcipientAddress.toLowerCase(),
        excipientAddressToBeApproved,
        "Approved Excipient Address emitted by the event should be the same as the input API address"
      );
      assert.equal(
        await deployed.checkExcipientApproval(excipientAddressToBeApproved),
        "1.5",
        "Excipient should now be marked as approved in FDA's DB with approved quantity"
      );
    });

    it("Should not allow a random person to approve drug excipient", async () => {
      const deployed = await Fda.deployed();
      const excipientAddressToBeApproved =
        "0x2f953b6fc63597e0510744dc2ab8620b6b0c1100";
      try {
        await deployed.approveDrugExcipient(
          excipientAddressToBeApproved,
          "1.5",
          {
            from: accounts[4],
          }
        );
      } catch (error) {
        assert.equal(
          error.data.stack.includes("Only an approver can do this"),
          true
        );
        assert.equal(
          await deployed.checkExcipientApproval(excipientAddressToBeApproved),
          ""
        );
      }
    });

    it("Should allow a designated approver to reject drug excipient", async () => {
      const deployed = await Fda.deployed();
      const excipientAddressToBeRejected =
        "0x2f953b6fc63597e0510744dc2ab8620b6b0c1100";
      const { receipt } = await deployed.rejectDrugExcipient(
        excipientAddressToBeRejected,
        "Not up to the mark",
        {
          from: approverList[1],
        }
      );
      assert.equal(
        receipt.logs[0].event,
        "DrugExcipientRejected",
        "Event of Excipient Rejection must be generated"
      );
      assert.equal(
        receipt.logs[0].args.drugExcipientAddress.toLowerCase(),
        excipientAddressToBeRejected,
        "Rejected Excipient Address emitted by the event should be the same as the input Excipient address"
      );
      assert.equal(
        await deployed.checkExcipientApproval(excipientAddressToBeRejected),
        ""
      );
    });

    it("Should not allow a random person to reject drug excipient", async () => {
      const deployed = await Fda.deployed();
      const excipientAddressToBeRejected =
        "0x2f953b6fc63597e0510744dc2ab8620b6b0c1100";
      try {
        await deployed.rejectDrugExcipient(
          excipientAddressToBeRejected,
          "Not up to the mark",
          {
            from: accounts[4],
          }
        );
      } catch (error) {
        assert.equal(
          error.data.stack.includes("Only an approver can do this"),
          true
        );
        // assert.equal(
        //   (await deployed.checkExcipientApproval(excipientAddressToBeRejected)),
        //   false
        // );
      }
    });
  });
});
