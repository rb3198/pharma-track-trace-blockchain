pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import {ComponentBase} from "./ComponentBase.sol";

contract DrugFormulation is ComponentBase {
    constructor(
        address _fdaAddress,
        string memory _name,
        uint16 _lowerTempBound,
        uint16 _upperTempBound,
        Formula[] memory _apiList,
        Formula[] memory _excipientList
    )
        public
        ComponentBase(_fdaAddress, _name, _lowerTempBound, _upperTempBound)
    {
        require(_apiList.length != 0);
        require(_excipientList.length != 0);
        arrayToMapping(_apiList, "api", apiFormulaMapping);
        arrayToMapping(_excipientList, "exci", excipientFormulaMapping);
    }

    function arrayToMapping(
        Formula[] memory arr,
        string memory componentType,
        mapping(address => string) storage map
    ) private {
        for (uint256 index = 0; index < arr.length; index++) {
            if (keccak256(bytes(componentType)) == keccak256(bytes("api"))) {
                require(fda.checkApiApproval(arr[index].ingAddress));
            }
            map[arr[index].ingAddress] = arr[index].quantityMg;
        }
    }

    // Properties

    struct Formula {
        address ingAddress;
        // Quantity is stored as a string since Solidity does not support floating points.
        string quantityMg;
    }

    mapping(address => string) public apiFormulaMapping;
    mapping(address => string) public excipientFormulaMapping;

    // functions
    function isApproved() public view virtual override returns (bool) {
        return fda.checkDrugFormulationApproval(address(this));
    }
}
