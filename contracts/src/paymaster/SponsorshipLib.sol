// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title SponsorshipLib
/// @notice Encoding, decoding, and hashing of paymaster sponsorship data.
/// @dev Custom data layout within paymasterAndData (after the 52-byte ERC-4337 v0.7 header):
///
///   Offset  Len  Field
///   ------  ---  --------------------------------------------------
///   0       1    mode           (0x00 = native sponsor, 0x01 = ERC-20)
///   1       6    validUntil     (uint48, seconds since epoch)
///   7       6    validAfter     (uint48, seconds since epoch)
///   13      32   sponsorNonce   (uint256, replay protection)
///   45      65   signature      (ECDSA: r‖s‖v)
///   ------  ---  --------------------------------------------------
///   Total: 110 bytes of custom paymaster data
library SponsorshipLib {
    /// @dev Byte length of the custom data section (excluding signature).
    uint256 internal constant DATA_WITHOUT_SIG_LENGTH = 45;
    /// @dev Full custom data length including 65-byte ECDSA signature.
    uint256 internal constant FULL_DATA_LENGTH = 110;

    struct SponsorshipData {
        uint8 mode;
        uint48 validUntil;
        uint48 validAfter;
        uint256 sponsorNonce;
        bytes signature; // 65 bytes (r, s, v)
    }

    /// @notice Decode the custom paymaster data blob.
    /// @param data The custom portion of paymasterAndData (after the 52-byte header).
    function decode(bytes calldata data) internal pure returns (SponsorshipData memory sd) {
        require(data.length >= FULL_DATA_LENGTH, "SponsorshipLib: data too short");
        sd.mode = uint8(data[0]);
        sd.validUntil = uint48(bytes6(data[1:7]));
        sd.validAfter = uint48(bytes6(data[7:13]));
        sd.sponsorNonce = uint256(bytes32(data[13:45]));
        sd.signature = data[45:110];
    }

    /// @notice Compute the deterministic hash that the sponsor signer must sign.
    /// @dev Binds authorization to: mode, time window, sender, nonce, chain, entryPoint, paymaster.
    function getHash(
        uint8 mode,
        uint48 validUntil,
        uint48 validAfter,
        address sender,
        uint256 sponsorNonce,
        uint256 chainId,
        address entryPointAddr,
        address paymasterAddr
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                mode,
                validUntil,
                validAfter,
                sender,
                sponsorNonce,
                chainId,
                entryPointAddr,
                paymasterAddr
            )
        );
    }

    /// @notice Encode the custom paymaster data blob for use in paymasterAndData.
    function encode(
        uint8 mode,
        uint48 validUntil,
        uint48 validAfter,
        uint256 sponsorNonce,
        bytes memory signature
    ) internal pure returns (bytes memory) {
        require(signature.length == 65, "SponsorshipLib: invalid sig length");
        return abi.encodePacked(
            mode,
            validUntil,
            validAfter,
            sponsorNonce,
            signature
        );
    }
}
