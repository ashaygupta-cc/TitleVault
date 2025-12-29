// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract RegistryResolver is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    struct Record {
        address owner;
        string cid;
        uint256 timestamp;
        address registrar;
        bytes registrarSig;
        bytes32 parentRecordHash;
        bool subdivided; // 🔒 NEW
    }

    mapping(bytes32 => Record) private _records;

    // ================= EVENTS =================

    event RecordCreated(
        bytes32 indexed recordHash,
        address indexed owner,
        string cid,
        uint256 timestamp,
        address indexed registrar
    );

    event RecordTransferred(
        bytes32 indexed oldRecordHash,
        bytes32 indexed newRecordHash,
        address indexed oldOwner,
        address newOwner,
        uint256 timestamp,
        address registrar
    );

    event RecordSubdivided(
        bytes32 indexed parentRecordHash,
        bytes32 indexed childRecordHash,
        address indexed owner,
        string cid,
        uint256 timestamp,
        address registrar
    );

    // ================= CONSTRUCTOR =================

    constructor(address initialRegistrar) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, initialRegistrar);
    }

    // ================= CREATE =================

    function createRecord(
        bytes32 recordHash,
        string calldata cid,
        address owner,
        bytes calldata registrarSig
    ) external onlyRole(REGISTRAR_ROLE) {
        require(_records[recordHash].timestamp == 0, "Record exists");

        _records[recordHash] = Record({
            owner: owner,
            cid: cid,
            timestamp: block.timestamp,
            registrar: msg.sender,
            registrarSig: registrarSig,
            parentRecordHash: bytes32(0),
            subdivided: false
        });

        emit RecordCreated(
            recordHash,
            owner,
            cid,
            block.timestamp,
            msg.sender
        );
    }

    // ================= TRANSFER =================

    function transferRecord(
        bytes32 oldRecordHash,
        bytes32 newRecordHash,
        string calldata newCid,
        address newOwner,
        bytes calldata registrarSig
    ) external onlyRole(REGISTRAR_ROLE) {
        Record storage oldRecord = _records[oldRecordHash];

        require(oldRecord.timestamp != 0, "Original not found");
        require(!oldRecord.subdivided, "Parent subdivided");
        require(_records[newRecordHash].timestamp == 0, "New exists");

        _records[newRecordHash] = Record({
            owner: newOwner,
            cid: newCid,
            timestamp: block.timestamp,
            registrar: msg.sender,
            registrarSig: registrarSig,
            parentRecordHash: oldRecordHash,
            subdivided: false
        });

        emit RecordTransferred(
            oldRecordHash,
            newRecordHash,
            oldRecord.owner,
            newOwner,
            block.timestamp,
            msg.sender
        );
    }

    // ================= SUBDIVIDE =================

    function subdivideRecord(
        bytes32 parentRecordHash,
        bytes32 childRecordHash,
        string calldata cid,
        address owner,
        bytes calldata registrarSig
    ) external onlyRole(REGISTRAR_ROLE) {
        Record storage parent = _records[parentRecordHash];

        require(parent.timestamp != 0, "Parent not found");
        require(!parent.subdivided, "Already subdivided");
        require(parent.owner == owner, "Owner mismatch");
        require(_records[childRecordHash].timestamp == 0, "Child exists");

        _records[childRecordHash] = Record({
            owner: owner,
            cid: cid,
            timestamp: block.timestamp,
            registrar: msg.sender,
            registrarSig: registrarSig,
            parentRecordHash: parentRecordHash,
            subdivided: false
        });

        parent.subdivided = true;

        emit RecordSubdivided(
            parentRecordHash,
            childRecordHash,
            owner,
            cid,
            block.timestamp,
            msg.sender
        );
    }

    // ================= READ =================

    function getRecord(bytes32 recordHash)
        external
        view
        returns (
            address owner,
            string memory cid,
            uint256 timestamp,
            address registrar,
            bytes memory registrarSig,
            bytes32 parentRecordHash,
            bool subdivided
        )
    {
        Record storage r = _records[recordHash];
        return (
            r.owner,
            r.cid,
            r.timestamp,
            r.registrar,
            r.registrarSig,
            r.parentRecordHash,
            r.subdivided
        );
    }

    // -------------------------
    // ADMIN
    // -------------------------
    function grantRegistrar(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(REGISTRAR_ROLE, account);
    }

    function revokeRegistrar(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        revokeRole(REGISTRAR_ROLE, account);
    }
}
