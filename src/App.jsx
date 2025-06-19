import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  Wallet,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader,
  Droplets,
  Copy,
  Maximize,
  Shield,
  RefreshCw,
  Coins,
} from "lucide-react";
import "./AppStyles.css"; // Import the new CSS file

const CONTRACT_ADDRESS = "0x3d0884051A1C244B4eaE7d3af22B12B7F18EBe86";
const ABI = [
  "function removeLiquidity(uint256 _amount) external",
  "function recoverTokens(address _token, uint256 _amount) external",
  "function getLiquidity() public view returns (uint256)",
  "function getLiquidityToken() public view returns (address)",
  "function token() public view returns (address)",
];

const ERC20_ABI = [
  "function balanceOf(address account) public view returns (uint256)",
];

const ETH_CHAIN_ID = "0x1"; // Ethereum Mainnet

export default function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [networkName, setNetworkName] = useState("Unknown Network");
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState("0");
  const [contractTokenBalance, setContractTokenBalance] = useState("0");
  const [contractAddressInput, setContractAddressInput] =
    useState(CONTRACT_ADDRESS);
  const [tokenContractAddress, setTokenContractAddress] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const BSC_CHAIN_ID = "0x38"; // 56 in hex

  const updateBalance = useCallback(async () => {
    if (!walletAddress || !window.ethereum) return;
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(walletAddress);
      setBalance(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error("Error getting balance:", error);
      setBalance("0");
    }
  }, [walletAddress]);

  const fetchContractTokenBalance = useCallback(async () => {
    if (
      !window.ethereum ||
      !walletAddress ||
      !ethers.utils.isAddress(contractAddressInput)
    )
      return;
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contractInstance = new ethers.Contract(
        contractAddressInput,
        ABI,
        provider
      );
      const tokenAddress = await contractInstance.token();
      setTokenContractAddress(tokenAddress);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider
      );
      const balance = await tokenContract.balanceOf(contractAddressInput);
      setContractTokenBalance(ethers.utils.formatUnits(balance, 3));
    } catch (error) {
      console.error("Error fetching contract token balance:", error);
      setContractTokenBalance("0");
      setTokenContractAddress("");
    }
  }, [walletAddress, contractAddressInput]);

  const checkNetwork = useCallback(async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      setNetworkName(network.name);
      setChainId(`0x${network.chainId.toString(16)}`);

      if (walletAddress) {
        await updateBalance();
        await fetchContractTokenBalance();
      }

      if (network.chainId !== parseInt(BSC_CHAIN_ID, 16)) {
        setStatus(
          `Connected to ${network.name}. Please note: This contract operates on BSC Mainnet.`
        );
      } else {
        setStatus(`Connected to ${network.name}`);
      }
    } catch (error) {
      console.error("Error checking network:", error);
      setNetworkName("Unknown Network");
      setChainId(null);
      setStatus("Could not determine network.");
    }
  }, [walletAddress, updateBalance, fetchContractTokenBalance]);

  const handleAccountsChanged = useCallback(
    (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        checkNetwork();
      } else {
        setWalletAddress("");
        setBalance("0");
        setNetworkName("Unknown Network");
        setChainId(null);
        setStatus("Wallet disconnected.");
      }
    },
    [checkNetwork]
  );

  const handleChainChanged = useCallback(
    (newChainId) => {
      setChainId(newChainId);
      checkNetwork();
    },
    [checkNetwork]
  );

  const checkConnection = useCallback(async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
        await checkNetwork();
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    }
  }, [checkNetwork]);

  useEffect(() => {
    checkConnection();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [checkConnection, handleAccountsChanged, handleChainChanged]);

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus(
        "MetaMask is not installed. Please install MetaMask to continue."
      );
      return;
    }

    if (!window.ethereum.isMetaMask) {
      setStatus("Please use MetaMask wallet to connect.");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("Connecting to MetaMask...");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setWalletAddress(accounts[0]);

      await checkNetwork();
      setIsLoading(false);
    } catch (error) {
      console.error("MetaMask connection error:", error);
      setStatus("Failed to connect to MetaMask. Please try again.");
      setIsLoading(false);
    }
  }

  const copyAddressToClipboard = () => {
    navigator.clipboard
      .writeText(walletAddress)
      .then(() => {
        setCopySuccess(true);
        setStatus("Wallet address copied to clipboard!");
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        setStatus("Failed to copy address.");
      });
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await updateBalance();
      await fetchContractTokenBalance();
      setStatus("Data refreshed successfully!");
    } catch (error) {
      setStatus("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(contractTokenBalance);
  };

  const clearForm = () => {
    setAmount("");
    setTokenAddress("");
  };

  const validateTokenAddress = (address) => {
    return ethers.utils.isAddress(address);
  };

  const validateContractAddress = (address) => {
    return ethers.utils.isAddress(address);
  };

  async function recoverTokens() {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setStatus("Please enter a valid amount greater than 0");
      return;
    }

    if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) {
      setStatus("Please enter a valid token address");
      return;
    }

    if (!ethers.utils.isAddress(contractAddressInput)) {
      setStatus(
        "Error: Invalid contract address. Please enter a valid Ethereum address."
      );
      return;
    }

    if (chainId !== BSC_CHAIN_ID) {
      setStatus(
        "Warning: You are not on BSC Mainnet. Transactions might fail. Switch networks or proceed with caution."
      );
    }

    try {
      setIsLoading(true);
      setStatus("Preparing transaction...");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddressInput, ABI, signer);
      const decimals = 3;
      const parsedAmount = ethers.utils.parseUnits(amount, decimals);

      setStatus("Please confirm transaction in MetaMask...");
      const tx = await contract.recoverTokens(tokenAddress, parsedAmount);

      setStatus(`Transaction submitted! Hash: ${tx.hash}`);
      await tx.wait();

      setStatus("Tokens recovered successfully!");
      setAmount("");
      setTokenAddress("");
      await updateBalance();
      await fetchContractTokenBalance();
    } catch (err) {
      console.error(err);
      if (err.code === 4001) {
        setStatus("Transaction cancelled by user");
      } else if (err.code === -32603) {
        setStatus(
          "Transaction failed: Insufficient funds or contract error. Ensure you are on BSC Mainnet."
        );
      } else {
        setStatus(
          "Error: " + (err.reason || err.message || "Transaction failed")
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusIcon = () => {
    if (isLoading) return <Loader className="loading-spinner-icon-small" />;
    if (status.includes("successfully"))
      return <CheckCircle className="status-icon success-icon" />;
    if (status.includes("Error") || status.includes("Failed"))
      return <AlertCircle className="status-icon error-icon" />;
    return null;
  };

  // Helper to switch network
  const switchNetwork = async (targetChainId) => {
    if (!window.ethereum) {
      setStatus("MetaMask is not installed.");
      return false;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainId }],
      });
      setStatus("Network switched successfully.");
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        setStatus("Network not found in MetaMask. Please add it manually.");
      } else {
        setStatus("Failed to switch network.");
      }
      return false;
    }
  };

  // Update fetchContractTokenBalance to run when contractAddressInput or tokenAddress changes
  useEffect(() => {
    if (walletAddress && contractAddressInput) {
      fetchContractTokenBalance();
    }
  }, [
    walletAddress,
    contractAddressInput,
    tokenAddress,
    fetchContractTokenBalance,
  ]);

  return (
    <div className="main-container">
      <div className="card-container">
        {/* Header */}
        <div className="header-container">
          <div className="header-icon-title-group">
            <div className="header-icon-wrapper">
              <Shield className="header-icon" />
            </div>
            <h1 className="header-title">LockBridge</h1>
          </div>
          <p className="header-subtitle">Secure Token Recovery</p>
        </div>

        {/* Wallet Connection */}
        <div className="wallet-connection-section">
          {!walletAddress ? (
            <button
              className="connect-button"
              onClick={connectWallet}
              disabled={isLoading}
            >
              <Wallet className="connect-button-icon" />
              {isLoading ? (
                <>
                  <Loader className="loading-spinner-icon-small" />
                  Connecting...
                </>
              ) : (
                "Connect MetaMask"
              )}
            </button>
          ) : (
            <div className="wallet-info-card">
              <div className="wallet-info-header">
                <span className="wallet-info-label">Connected Wallet</span>
                <div className="wallet-info-actions">
                  <button
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="refresh-button"
                    title="Refresh balances"
                  >
                    <RefreshCw
                      className={`refresh-icon ${
                        isRefreshing ? "spinning" : ""
                      }`}
                    />
                  </button>
                  <div className="network-status-badge">
                    <div
                      className={`network-status-indicator ${
                        chainId === BSC_CHAIN_ID ? "green" : "orange"
                      }`}
                    ></div>
                    <span className="network-name">{networkName}</span>
                  </div>
                </div>
              </div>
              <div className="wallet-address-group">
                <p className="wallet-address-text">{walletAddress}</p>
                <button
                  onClick={copyAddressToClipboard}
                  className={`copy-button ${copySuccess ? "copy-success" : ""}`}
                  aria-label="Copy address to clipboard"
                  title="Copy wallet address"
                >
                  {copySuccess ? (
                    <CheckCircle className="copy-icon" />
                  ) : (
                    <Copy className="copy-icon" />
                  )}
                </button>
              </div>
              <div className="balance-info-grid">
                <div className="balance-item">
                  <p className="balance-text">
                    <Droplets className="balance-icon" />
                    <span className="balance-label">BNB Balance:</span>
                    <span className="balance-value">
                      {parseFloat(balance).toFixed(6)}
                    </span>
                  </p>
                </div>
                <div className="balance-item">
                  <p className="contract-token-balance-text">
                    <Coins className="contract-token-balance-icon" />
                    <span className="balance-label">Contract Tokens:</span>
                    <span className="balance-value">
                      {parseFloat(contractTokenBalance).toFixed(6)}
                    </span>
                  </p>
                </div>
              </div>
              {tokenContractAddress && (
                <div className="token-contract-info">
                  <p className="token-contract-address-text">
                    <ExternalLink className="token-contract-address-icon" />
                    <span>Token Contract:</span>
                    <a
                      href={`https://bscscan.com/address/${tokenContractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contract-link"
                      title="View on BSCScan"
                    >
                      {tokenContractAddress.slice(0, 6)}...
                      {tokenContractAddress.slice(-4)}
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
          {/* Network switch logic */}
          {walletAddress && (
            <>
              {contractAddressInput ===
                "0x3d0884051A1C244B4eaE7d3af22B12B7F18EBe86" &&
                chainId !== BSC_CHAIN_ID && (
                  <button
                    className="connect-button mt-2"
                    onClick={() => switchNetwork(BSC_CHAIN_ID)}
                    disabled={isLoading}
                  >
                    Switch to BNB Chain
                  </button>
                )}
              {contractAddressInput ===
                "0xE9D7023f2132D55cbd4Ee1f78273CB7a3e74F10A" &&
                chainId !== ETH_CHAIN_ID && (
                  <button
                    className="connect-button mt-2"
                    onClick={() => switchNetwork(ETH_CHAIN_ID)}
                    disabled={isLoading}
                  >
                    Switch to Ethereum Mainnet
                  </button>
                )}
            </>
          )}
        </div>

        {/* Form Section */}
        <div className="form-section">
          {/* Contract Address Input */}
          <div className="input-group">
            <label htmlFor="contract-address" className="input-label">
              <Shield className="label-icon" />
              Contract Address
            </label>
            <select
              id="contract-address"
              className={`form-input ${
                contractAddressInput &&
                !validateContractAddress(contractAddressInput)
                  ? "input-error"
                  : contractAddressInput &&
                    validateContractAddress(contractAddressInput)
                  ? "input-success"
                  : ""
              }`}
              value={contractAddressInput}
              onChange={(e) => setContractAddressInput(e.target.value)}
              onBlur={fetchContractTokenBalance}
              disabled={isLoading}
            >
              <option value="0x3d0884051A1C244B4eaE7d3af22B12B7F18EBe86">
                BNB Contract (0x3d0884051A1C244B4eaE7d3af22B12B7F18EBe86)
              </option>
              <option value="0xE9D7023f2132D55cbd4Ee1f78273CB7a3e74F10A">
                ETH Contract (0xE9D7023f2132D55cbd4Ee1f78273CB7a3e74F10A)
              </option>
            </select>
            {contractAddressInput &&
              !validateContractAddress(contractAddressInput) && (
                <div className="input-error-message">
                  <AlertCircle className="error-icon" />
                  Invalid contract address
                </div>
              )}
          </div>

          {/* Token Address Input */}
          <div className="input-group">
            <label htmlFor="token-address" className="input-label">
              <Coins className="label-icon" />
              Token Address
            </label>
            <select
              id="token-address"
              className={`form-input ${
                tokenAddress && !validateTokenAddress(tokenAddress)
                  ? "input-error"
                  : tokenAddress && validateTokenAddress(tokenAddress)
                  ? "input-success"
                  : ""
              }`}
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select Token</option>
              <option value="0xE9D7023f2132D55cbd4Ee1f78273CB7a3e74F10A">
                DEC-BNB (0xE9D7023f2132D55cbd4Ee1f78273CB7a3e74F10A)
              </option>
              <option value="0x9393fdc77090F31c7db989390D43F454B1A6E7F3">
                DEC-ETH (0x9393fdc77090F31c7db989390D43F454B1A6E7F3)
              </option>
            </select>
            {tokenAddress && !validateTokenAddress(tokenAddress) && (
              <div className="input-error-message">
                <AlertCircle className="error-icon" />
                Invalid token address
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="input-group">
            <label htmlFor="amount" className="input-label">
              <Maximize className="label-icon" />
              Amount to Recover
            </label>
            <div className="amount-input-wrapper">
              <input
                id="amount"
                type="number"
                placeholder="0.0"
                className="amount-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={
                  !walletAddress ||
                  isLoading ||
                  !ethers.utils.isAddress(contractAddressInput)
                }
                min="0"
                step="any"
              />
              <div className="amount-buttons">
                <button
                  onClick={setMaxAmount}
                  disabled={
                    !walletAddress ||
                    isLoading ||
                    parseFloat(contractTokenBalance) <= 0 ||
                    !ethers.utils.isAddress(contractAddressInput)
                  }
                  className="max-button"
                  title="Use maximum available amount"
                >
                  Max
                </button>
                <button
                  onClick={clearForm}
                  disabled={isLoading || (!amount && !tokenAddress)}
                  className="clear-button"
                  title="Clear form"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {walletAddress &&
            ((contractAddressInput ===
              "0x3d0884051A1C244B4eaE7d3af22B12B7F18EBe86" &&
              chainId === BSC_CHAIN_ID) ||
            (contractAddressInput ===
              "0xE9D7023f2132D55cbd4Ee1f78273CB7a3e74F10A" &&
              chainId === ETH_CHAIN_ID) ? (
              <button
                onClick={recoverTokens}
                disabled={
                  !walletAddress ||
                  !amount ||
                  !tokenAddress ||
                  isLoading ||
                  parseFloat(amount) <= 0 ||
                  !ethers.utils.isAddress(contractAddressInput) ||
                  !ethers.utils.isAddress(tokenAddress)
                }
                className="w-full connect-button bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl text-xl flex items-center justify-center shadow-lg transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed mt-4"
              >
                {isLoading ? (
                  <span className="loading-spinner-group">
                    <Loader className="loading-spinner-icon" /> Processing...
                  </span>
                ) : (
                  <>
                    <Shield className="button-icon" />
                    Rescue Token
                  </>
                )}
              </button>
            ) : null)}
        </div>

        {/* Status */}
        {status &&
        chainId !== BSC_CHAIN_ID &&
        status.includes("Connected to") ? (
          <div className="status-message-container warning">
            <AlertCircle className="status-icon" />
            <p className="status-text">{status}</p>
          </div>
        ) : (
          status && (
            <div
              className={`status-message-container ${
                status.includes("successfully")
                  ? "success"
                  : status.includes("Error") ||
                    status.includes("Failed") ||
                    status.includes("cancelled")
                  ? "error"
                  : "info"
              }`}
            >
              {getStatusIcon()}
              <p className="status-text">{status}</p>
            </div>
          )
        )}

        {/* Footer */}
        <div className="footer-container">
          <div className="footer-content">
            <p className="footer-text">
              Ensure MetaMask is connected to BSC Mainnet for optimal
              experience.
            </p>
            <a
              href="https://academy.binance.com/en/articles/how-to-add-binance-smart-chain-to-metamask"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link-group"
            >
              <ExternalLink className="footer-link-icon" />
              <span className="footer-link">Setup BSC Network</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
