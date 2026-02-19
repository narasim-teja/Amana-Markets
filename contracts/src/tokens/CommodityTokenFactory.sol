// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {CommodityToken} from "./CommodityToken.sol";

/// @title CommodityTokenFactory
/// @notice Deploys CommodityToken instances. Called by AssetRegistry (authorized creator)
///         or directly by the owner.
contract CommodityTokenFactory is Ownable2Step {
    mapping(bytes32 => address) public tokenForAsset;

    address public authorizedCreator;

    event TokenCreated(bytes32 indexed assetId, address indexed token, string name, string symbol);
    event AuthorizedCreatorSet(address indexed creator);

    error AlreadyExists(bytes32 assetId);
    error NotAuthorized();
    error ZeroAddress();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Set the authorized creator (AssetRegistry) that can call createToken
    function setAuthorizedCreator(address creator) external onlyOwner {
        if (creator == address(0)) revert ZeroAddress();
        authorizedCreator = creator;
        emit AuthorizedCreatorSet(creator);
    }

    /// @notice Deploy a new CommodityToken for an asset
    /// @param assetId Asset identifier (e.g., keccak256("XAU/USD"))
    /// @param name Token name (e.g., "Gold")
    /// @param symbol Token symbol (e.g., "xGOLD")
    /// @param minter Address authorized to mint/burn (TradingEngine)
    function createToken(bytes32 assetId, string calldata name, string calldata symbol, address minter)
        external
        returns (address token)
    {
        if (msg.sender != owner() && msg.sender != authorizedCreator) revert NotAuthorized();
        if (tokenForAsset[assetId] != address(0)) revert AlreadyExists(assetId);

        CommodityToken ct = new CommodityToken(name, symbol, minter);
        token = address(ct);
        tokenForAsset[assetId] = token;

        emit TokenCreated(assetId, token, name, symbol);
    }

    function getToken(bytes32 assetId) external view returns (address) {
        return tokenForAsset[assetId];
    }
}
