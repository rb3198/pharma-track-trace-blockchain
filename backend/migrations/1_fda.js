const Fda = artifacts.require("./Fda.sol");

module.exports = deployer => {
    deployer.deploy(Fda);
}