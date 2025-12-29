// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PropertyAnchor {

    struct AnchorInfo {
        uint256 timestamp;
        address sender;
    }

    // hash => anchor details
    mapping(bytes32 => AnchorInfo) public anchors;

    event RecordAnchored(bytes32 indexed recordHash, uint256 timestamp, address indexed sender);

    function anchorRecord(bytes32 recordHash) external {
        require(recordHash != bytes32(0), "Invalid hash");
        require(anchors[recordHash].timestamp == 0, "Already anchored");

        anchors[recordHash] = AnchorInfo({
            timestamp: block.timestamp,
            sender: msg.sender
        });

        emit RecordAnchored(recordHash, block.timestamp, msg.sender);
    }

    function isAnchored(bytes32 recordHash) external view returns (bool) {
        return anchors[recordHash].timestamp != 0;
    }

    function getAnchor(bytes32 recordHash) external view returns (AnchorInfo memory) {
        return anchors[recordHash];
    }
}
