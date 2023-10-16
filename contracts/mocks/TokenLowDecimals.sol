// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenLowDecimals is ERC20 {
    constructor() ERC20("Dexe Token", "DEXE") {
        _mint(msg.sender, 10**9 * 10**6);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}