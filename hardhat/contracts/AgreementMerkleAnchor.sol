// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AgreementMerkleAnchor is AccessControl {

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    struct Anchor {
        bytes32 merkleRoot;
        uint256 count;
        uint256 timestamp;
    }

    Anchor[] private _anchors;

    event AgreementMerkleAnchored(
        uint256 indexed index,
        bytes32 merkleRoot,
        uint256 count,
        uint256 timestamp
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    /**
     * @notice Anchor a new Merkle root for active agreements
     * @dev First anchor is allowed (bootstrap-safe)
     */
    function anchor(bytes32 merkleRoot, uint256 count)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        require(merkleRoot != bytes32(0), "Invalid merkle root");
        require(count > 0, "Invalid leaf count");

        _anchors.push(
            Anchor({
                merkleRoot: merkleRoot,
                count: count,
                timestamp: block.timestamp
            })
        );

        emit AgreementMerkleAnchored(
            _anchors.length - 1,
            merkleRoot,
            count,
            block.timestamp
        );
    }

    /**
     * @notice Returns latest anchor if exists
     * @dev Explicit revert reason preserved
     */
    function latest() external view returns (Anchor memory) {
        require(_anchors.length > 0, "NO_ANCHORS_YET");
        return _anchors[_anchors.length - 1];
    }

    /**
     * @notice Total number of anchors
     */
    function anchorCount() external view returns (uint256) {
        return _anchors.length;
    }

    /**
     * @notice Read anchor by index (audit / verification)
     */
    function anchorAt(uint256 index) external view returns (Anchor memory) {
        require(index < _anchors.length, "ANCHOR_INDEX_OOB");
        return _anchors[index];
    }
}
