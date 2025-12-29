// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AgreementLedger
 * @notice Anchors agreement hashes and enforces exclusive agreement locks
 * @dev Phase 9 — Agreement-based land & flat transactions
 */
contract AgreementLedger is AccessControl {

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum AgreementStatus {
        NONE,
        ACTIVE,
        COMPLETED,
        CANCELLED,
        DEFAULTED
    }

    struct AgreementAnchor {
        bytes32 agreementHash;
        AgreementStatus status;
        uint256 activatedAt;
        uint256 closedAt;
    }

    // One agreement lifecycle per subject
    mapping(bytes32 => AgreementAnchor) private landAgreements;
    mapping(bytes32 => AgreementAnchor) private flatAgreements;

    // =====================================================
    // EVENTS (CANONICAL)
    // =====================================================

    event AgreementActivated(
        bytes32 indexed subject,
        bytes32 indexed agreementHash,
        bool isFlat,
        address registrar,
        uint256 timestamp
    );

    event AgreementClosed(
        bytes32 indexed subject,
        bytes32 indexed agreementHash,
        bool isFlat,
        string action, // "complete" | "cancel" | "default"
        address registrar,
        uint256 timestamp
    );

    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    constructor(address admin) {
        require(admin != address(0), "Invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    // =====================================================
    // INTERNAL HELPERS
    // =====================================================

    function _requireValidActivation(
        AgreementAnchor storage a,
        bytes32 agreementHash
    ) internal view {
        require(a.status == AgreementStatus.NONE, "Agreement already exists");
        require(agreementHash != bytes32(0), "Invalid agreement hash");
    }

    function _requireActive(AgreementAnchor storage a) internal view {
        require(a.status == AgreementStatus.ACTIVE, "Agreement not active");
        require(a.activatedAt != 0, "Agreement never activated");
        require(a.closedAt == 0, "Agreement already closed");
    }

    // =====================================================
    // AGREEMENT LIFECYCLE
    // =====================================================

    function activateLandAgreement(
        bytes32 recordHash,
        bytes32 agreementHash
    )
        external
        onlyRole(REGISTRAR_ROLE)
    {
        require(recordHash != bytes32(0), "Invalid land hash");

        AgreementAnchor storage a = landAgreements[recordHash];
        _requireValidActivation(a, agreementHash);

        landAgreements[recordHash] = AgreementAnchor({
            agreementHash: agreementHash,
            status: AgreementStatus.ACTIVE,
            activatedAt: block.timestamp,
            closedAt: 0
        });

        emit AgreementActivated(
            recordHash,
            agreementHash,
            false,
            msg.sender,
            block.timestamp
        );
    }

    function activateFlatAgreement(
        bytes32 flatSubjectHash,
        bytes32 agreementHash
    )
        external
        onlyRole(REGISTRAR_ROLE)
    {
        require(flatSubjectHash != bytes32(0), "Invalid flat subject");

        AgreementAnchor storage a = flatAgreements[flatSubjectHash];
        _requireValidActivation(a, agreementHash);

        flatAgreements[flatSubjectHash] = AgreementAnchor({
            agreementHash: agreementHash,
            status: AgreementStatus.ACTIVE,
            activatedAt: block.timestamp,
            closedAt: 0
        });

        emit AgreementActivated(
            flatSubjectHash,
            agreementHash,
            true,
            msg.sender,
            block.timestamp
        );
    }

    function completeAgreement(bytes32 subject, bool isFlat)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        AgreementAnchor storage a = isFlat
            ? flatAgreements[subject]
            : landAgreements[subject];

        _requireActive(a);

        a.status = AgreementStatus.COMPLETED;
        a.closedAt = block.timestamp;

        emit AgreementClosed(
            subject,
            a.agreementHash,
            isFlat,
            "complete",
            msg.sender,
            block.timestamp
        );
    }

    function cancelAgreement(bytes32 subject, bool isFlat)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        AgreementAnchor storage a = isFlat
            ? flatAgreements[subject]
            : landAgreements[subject];

        _requireActive(a);

        a.status = AgreementStatus.CANCELLED;
        a.closedAt = block.timestamp;

        emit AgreementClosed(
            subject,
            a.agreementHash,
            isFlat,
            "cancel",
            msg.sender,
            block.timestamp
        );
    }

    function defaultAgreement(bytes32 subject, bool isFlat)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        AgreementAnchor storage a = isFlat
            ? flatAgreements[subject]
            : landAgreements[subject];

        _requireActive(a);

        a.status = AgreementStatus.DEFAULTED;
        a.closedAt = block.timestamp;

        emit AgreementClosed(
            subject,
            a.agreementHash,
            isFlat,
            "default",
            msg.sender,
            block.timestamp
        );
    }

    // =====================================================
    // VIEW HELPERS (AUDIT-GRADE)
    // =====================================================

    function isLocked(bytes32 subject, bool isFlat)
        external
        view
        returns (bool)
    {
        AgreementAnchor storage a = isFlat
            ? flatAgreements[subject]
            : landAgreements[subject];

        return a.status == AgreementStatus.ACTIVE;
    }

    function getAgreement(bytes32 subject, bool isFlat)
        external
        view
        returns (
            bytes32 agreementHash,
            AgreementStatus status,
            uint256 activatedAt,
            uint256 closedAt
        )
    {
        AgreementAnchor storage a = isFlat
            ? flatAgreements[subject]
            : landAgreements[subject];

        return (
            a.agreementHash,
            a.status,
            a.activatedAt,
            a.closedAt
        );
    }

    function agreementExists(bytes32 subject, bool isFlat)
        external
        view
        returns (bool)
    {
        AgreementAnchor storage a = isFlat
            ? flatAgreements[subject]
            : landAgreements[subject];

        return a.status != AgreementStatus.NONE;
    }
}
