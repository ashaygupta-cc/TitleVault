// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RegistryRootAnchor {
    address public registrar;

    struct RootSnapshot {
        bytes32 root;
        uint256 blockNumber;
        uint256 timestamp;
    }

    RootSnapshot[] public snapshots;

    event RootAnchored(
        bytes32 indexed root,
        uint256 indexed blockNumber,
        uint256 timestamp
    );

    modifier onlyRegistrar() {
        require(msg.sender == registrar, "Not registrar");
        _;
    }

    constructor(address _registrar) {
        registrar = _registrar;
    }

    function anchorRoot(bytes32 root) external onlyRegistrar {
        snapshots.push(
            RootSnapshot({
                root: root,
                blockNumber: block.number,
                timestamp: block.timestamp
            })
        );

        emit RootAnchored(root, block.number, block.timestamp);
    }

    function latestRoot() external view returns (bytes32) {
        require(snapshots.length > 0, "No roots");
        return snapshots[snapshots.length - 1].root;
    }

    function snapshotCount() external view returns (uint256) {
        return snapshots.length;
    }
}
