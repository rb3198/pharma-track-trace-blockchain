pragma solidity ^0.6.0;

contract Fda {
    address public admin;
    mapping(address => bool) private approverList;
    address[] public approvedDrugFormulationList;
    address[] public approvedApiList;
    mapping(address => uint256) apiPatentExpiryMapping;
    mapping(address => string) approvedExcipientQuantityMapping;

    constructor() public {
        admin = msg.sender;
    }

    // Events

    event DrugAPIApproved(address indexed drugApiAddress);
    event DrugAPIRejected(
        address indexed drugApiAddress,
        string rejectionReason
    );
    event DrugExcipientApproved(
        address indexed drugExcipientAddress,
        string quantityMg
    );
    event DrugExcipientRejected(
        address indexed drugExcipientAddress,
        string rejectionReason
    );
    event DrugFormulationApproved(address indexed drugAddress);
    event DrugFormulationRejected(
        address indexed drugAddress,
        string rejectionReason
    );

    // Modifiers

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can do this");
        _;
    }

    modifier onlyApprover() {
        require(approverList[msg.sender], "Only an approver can do this");
        _;
    }

    modifier noDuplicateApprover(address _approverAddress) {
        require(
            !approverList[_approverAddress],
            "Cannot add a duplicate approver."
        );
        _;
    }

    // Functions

    function addApprover(address _approverAddress)
        public
        onlyAdmin
        noDuplicateApprover(_approverAddress)
    {
        approverList[_approverAddress] = true;
    }

    function removeApprover(address _approverAddress) public onlyAdmin {
        approverList[_approverAddress] = false;
    }

    function changeAdmin(address _newAdminAddress) public onlyAdmin {
        admin = _newAdminAddress;
    }

    function approveDrugFormulation(address _drugFormulationAddress)
        public
        onlyApprover
    {
        approvedDrugFormulationList.push(_drugFormulationAddress);
        emit DrugFormulationApproved(_drugFormulationAddress);
    }

    function rejectDrugFormulation(
        address _drugFormulationAddress,
        string memory _rejectionReason
    ) public onlyApprover {
        emit DrugFormulationRejected(_drugFormulationAddress, _rejectionReason);
    }

    function approveDrugApi(address _drugApiAddress, uint256 _patentExpiry)
        public
        onlyApprover
    {
        approvedApiList.push(_drugApiAddress);
        apiPatentExpiryMapping[_drugApiAddress] = _patentExpiry;
        emit DrugAPIApproved(_drugApiAddress);
    }

    function getApiPatentExpiry(address _drugApiAddress)
        public
        view
        returns (uint256)
    {
        return apiPatentExpiryMapping[_drugApiAddress];
    }

    function rejectDrugApi(
        address _drugApiAddress,
        string memory _rejectionReason
    ) public onlyApprover {
        emit DrugAPIRejected(_drugApiAddress, _rejectionReason);
    }

    function approveDrugExcipient(
        address _drugExcipientAddress,
        string memory _quantityMg
    ) public onlyApprover {
        // TODO: Compare quantity before pushing (highest should be inserted)
        approvedExcipientQuantityMapping[_drugExcipientAddress] = _quantityMg;
        emit DrugExcipientApproved(_drugExcipientAddress, _quantityMg);
    }

    function rejectDrugExcipient(
        address _drugExcipientAddress,
        string memory _rejectionReason
    ) public onlyApprover {
        emit DrugExcipientRejected(_drugExcipientAddress, _rejectionReason);
    }

    function checkDrugFormulationApproval(address _drugFormulationAddress)
        public
        view
        returns (bool)
    {
        for (
            uint256 index = 0;
            index < approvedDrugFormulationList.length;
            index++
        ) {
            if (_drugFormulationAddress == approvedDrugFormulationList[index]) {
                return true;
            }
        }
        return false;
    }

    function checkApiApproval(address _apiAddress) public view returns (bool) {
        for (uint256 index = 0; index < approvedApiList.length; index++) {
            if (_apiAddress == approvedApiList[index]) {
                return true;
            }
        }
        return false;
    }

    function checkExcipientApproval(address _excipientAddress)
        public
        view
        returns (string memory)
    {
        return approvedExcipientQuantityMapping[_excipientAddress];
    }
}
