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
    }

    mapping(bytes32 => Record) private _records;

    // -------------------------
    // EVENTS
    // -------------------------
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

    // -------------------------
    // CONSTRUCTOR
    // -------------------------
    constructor(address initialRegistrar) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, initialRegistrar);
    }

    // -------------------------
    // PHASE-2A: CREATE RECORD
    // -------------------------
    function createRecord(
        bytes32 recordHash,
        string calldata cid,
        address owner,
        bytes calldata registrarSig
    ) external onlyRole(REGISTRAR_ROLE) {
        require(_records[recordHash].timestamp == 0, "Record already exists");

        _records[recordHash] = Record({
            owner: owner,
            cid: cid,
            timestamp: block.timestamp,
            registrar: msg.sender,
            registrarSig: registrarSig,
            parentRecordHash: bytes32(0)
        });

        emit RecordCreated(
            recordHash,
            owner,
            cid,
            block.timestamp,
            msg.sender
        );
    }

    // -------------------------
    // PHASE-2B: TRANSFER RECORD
    // -------------------------
    function transferRecord(
        bytes32 oldRecordHash,
        bytes32 newRecordHash,
        string calldata newCid,
        address newOwner,
        bytes calldata registrarSig
    ) external onlyRole(REGISTRAR_ROLE) {
        Record storage oldRecord = _records[oldRecordHash];

        require(oldRecord.timestamp != 0, "Original record not found");
        require(_records[newRecordHash].timestamp == 0, "New record already exists");

        _records[newRecordHash] = Record({
            owner: newOwner,
            cid: newCid,
            timestamp: block.timestamp,
            registrar: msg.sender,
            registrarSig: registrarSig,
            parentRecordHash: oldRecordHash
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

    // -------------------------
    // READ RECORD
    // -------------------------
    function getRecord(bytes32 recordHash)
        external
        view
        returns (
            address owner,
            string memory cid,
            uint256 timestamp,
            address registrar,
            bytes memory registrarSig,
            bytes32 parentRecordHash
        )
    {
        Record storage r = _records[recordHash];
        return (
            r.owner,
            r.cid,
            r.timestamp,
            r.registrar,
            r.registrarSig,
            r.parentRecordHash
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
