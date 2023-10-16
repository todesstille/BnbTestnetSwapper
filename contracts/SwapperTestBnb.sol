// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract SwapperTestBnb is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for *;

    uint256 internal immutable BNB_PRECISION = 10 ** 18;

    IERC20Metadata public dexeToken;
    uint256 internal _dexePrecision;
    uint256 internal _dexeRate;

    event Swapped(address indexed user, uint256 bnbAmount, uint256 dexeAmount);

    function __SwapperTestBnb_init(address dexe_) external initializer {
        __Ownable_init();
        _setDexeToken(dexe_);
        _dexeRate = 2000;
    }

    function setDexeToken(address dexe_) external onlyOwner {
        _setDexeToken(dexe_);
    }

    function withdrawTokens(
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external onlyOwner {
        uint256 tokensLength = tokens.length;
        require(tokensLength == amounts.length, "Swapper: arrays of different size");
        for (uint i = 0; i < tokensLength; i++) {
            IERC20(tokens[i]).safeTransfer(msg.sender, amounts[i]);
        }
    }

    function withdrawBNB() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(address(msg.sender)).transfer(balance);
    }


    function setRate(uint256 rate) external onlyOwner {
        _dexeRate = rate;
    }

    receive() external payable {
        _swap(msg.value, msg.sender);
    }

    function _swap(uint256 bnbAmount, address to) internal {
        uint256 dexeAmount = bnbAmount * _dexeRate * _dexePrecision / BNB_PRECISION;
        require(dexeAmount <= dexeToken.balanceOf(address(this)), "Not enought tokens on contract balance");
        dexeToken.safeTransfer(to, dexeAmount);
        emit Swapped(to, bnbAmount, dexeAmount);
    }

    function _setDexeToken(address dexe_) internal {
        dexeToken = IERC20Metadata(dexe_);
        _dexePrecision = 10 ** dexeToken.decimals(); 

    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
