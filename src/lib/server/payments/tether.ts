// src/lib/server/payments/tether.ts
import { Contract, ethers, JsonRpcProvider, Wallet } from 'ethers';

import { TETHER_CONTRACT_ADDRESS, ETHEREUM_RPC_URL, TETHER_PRIVATE_KEY } from '$app/env/private';

import { isMockEnabled } from '#lib/server/mock/index.js';

// ERC-20 USDT ABI (simplified - only what we need)
const USDT_ABI = [
	'function transfer(address to, uint256 value) returns (bool)',
	'function balanceOf(address account) view returns (uint256)',
	'function decimals() view returns (uint8)',
	'function allowance(address owner, address spender) view returns (uint256)',
	'event Transfer(address indexed from, address indexed to, uint256 value)'
] as const;

/** Blocks a transfer must be buried under before we accept it. */
export const REQUIRED_CONFIRMATIONS = 3;

/**
 * The wallet customers send USDT to. Shown on the payment page and checked during
 * verification, so both always agree.
 */
export function platformWalletAddress(): string {
	const address = process.env.TETHER_PLATFORM_ADDRESS || TETHER_CONTRACT_ADDRESS;
	// Demo mode without configured wallets still needs something to show and scan.
	if (!address && isMockEnabled()) return MOCK_WALLET;
	return address;
}

const MOCK_WALLET = '0x5afe00000000000000000000000000000000d3a0';

/**
 * EIP-681 payment link: wallets that scan or open it prefill the token, the
 * recipient and the exact amount.
 */
export function usdtPaymentUri(amountUsdt: number): string {
	const amount = ethers.parseUnits(amountUsdt.toFixed(6), 6);
	return `ethereum:${TETHER_CONTRACT_ADDRESS || MOCK_WALLET}/transfer?address=${platformWalletAddress()}&uint256=${amount}`;
}

const mockFirstSeen = new Map<string, number>();

export class TetherService {
	private provider: JsonRpcProvider | null = null;
	private contract: Contract | null = null;
	private platformWallet: Wallet | null = null;
	private isMockMode: boolean;

	constructor() {
		this.isMockMode = isMockEnabled();

		// Only initialize provider and contract if not in mock mode
		if (!this.isMockMode) {
			this.provider = new JsonRpcProvider(ETHEREUM_RPC_URL);
			this.contract = new Contract(TETHER_CONTRACT_ADDRESS, USDT_ABI, this.provider);

			// Initialize platform wallet if private key available
			if (TETHER_PRIVATE_KEY && TETHER_PRIVATE_KEY !== 'your_platform_wallet_private_key') {
				this.platformWallet = new Wallet(TETHER_PRIVATE_KEY, this.provider);
			}
		}
	}

	/**
	 * Convert USDT amount to wei (USDT has 6 decimals)
	 */
	private toWei(amount: number): bigint {
		return ethers.parseUnits(amount.toString(), 6);
	}

	/**
	 * Convert wei to USDT amount
	 */
	private fromWei(wei: bigint): number {
		return parseFloat(ethers.formatUnits(wei, 6));
	}

	/**
	 * Generate a payment request
	 * User sends USDT to our platform wallet (not business wallet)
	 */
	async generatePaymentRequest(params: {
		businessWalletAddress: string; // Actually platform wallet in this flow
		amount: number; // Amount in USDT
		orderId: string;
	}): Promise<{
		success: boolean;
		recipientAddress?: string;
		amount?: string;
		amountWei?: string;
		error?: string;
	}> {
		console.log('TetherService.generatePaymentRequest:', params);

		if (this.isMockMode) {
			return {
				success: true,
				recipientAddress: TETHER_CONTRACT_ADDRESS,
				amount: params.amount.toString(),
				amountWei: this.toWei(params.amount).toString()
			};
		}

		try {
			// Validate platform wallet address
			if (!ethers.isAddress(TETHER_CONTRACT_ADDRESS)) {
				return {
					success: false,
					error: 'Invalid platform wallet address'
				};
			}

			const amountWei = this.toWei(params.amount);

			return {
				success: true,
				recipientAddress: TETHER_CONTRACT_ADDRESS, // User pays to platform first
				amount: params.amount.toString(),
				amountWei: amountWei.toString()
			};
		} catch (error) {
			console.error('Tether payment request error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Verify a payment transaction on the blockchain
	 * Confirms user sent USDT to platform wallet
	 */
	async verifyPayment(params: {
		txHash: string;
		expectedAmount: number;
		recipientAddress: string; // Should be platform wallet
	}): Promise<{
		success: boolean;
		/** The transfer looks right but is not mined or confirmed yet; ask again later. */
		pending?: boolean;
		amount?: number;
		from?: string;
		confirmations?: number;
		error?: string;
	}> {
		console.log('TetherService.verifyPayment:', params);

		if (this.isMockMode) {
			// Behave like a real chain: a fresh hash gains a confirmation every few
			// seconds, so demo mode shows the confirming step too.
			const firstSeen = mockFirstSeen.get(params.txHash) ?? Date.now();
			mockFirstSeen.set(params.txHash, firstSeen);
			const confirmations = Math.floor((Date.now() - firstSeen) / 4000);
			if (confirmations < REQUIRED_CONFIRMATIONS) {
				return { success: false, pending: true, confirmations };
			}
			return {
				success: true,
				amount: params.expectedAmount,
				from: '0x' + '1'.repeat(40),
				confirmations: 12
			};
		}

		if (!this.provider) {
			return { success: false, error: 'Provider not initialized' };
		}

		try {
			// Get transaction receipt
			const receipt = await this.provider.getTransactionReceipt(params.txHash);

			if (!receipt) {
				// Either still in the mempool or not broadcast yet. Seen it is not
				// failed: the caller keeps asking until it shows up.
				const pendingTx = await this.provider.getTransaction(params.txHash);
				if (pendingTx) {
					return { success: false, pending: true, confirmations: 0 };
				}
				return {
					success: false,
					error: 'We could not find this transaction. Check that you copied the full hash.'
				};
			}

			// Check if transaction was successful
			if (receipt.status !== 1) {
				return {
					success: false,
					error: 'This transaction failed on the blockchain. Your wallet should have refunded it.'
				};
			}

			// Find the USDT transfer to our wallet. A transaction can carry several
			// Transfer events (other tokens, other recipients), so match on both.
			const iface = new ethers.Interface(USDT_ABI);
			let transferEvent = null;

			for (const log of receipt.logs) {
				if (log.address.toLowerCase() !== TETHER_CONTRACT_ADDRESS.toLowerCase()) continue;
				try {
					const parsed = iface.parseLog({
						topics: [...log.topics],
						data: log.data
					});

					if (
						parsed?.name === 'Transfer' &&
						String(parsed.args[1]).toLowerCase() === params.recipientAddress.toLowerCase()
					) {
						transferEvent = parsed;
						break;
					}
				} catch {
					continue;
				}
			}

			if (!transferEvent) {
				return {
					success: false,
					error: 'This transaction does not send USDT to our wallet address.'
				};
			}

			const from = transferEvent.args[0];
			const to = transferEvent.args[1];
			const value = transferEvent.args[2];
			const amount = this.fromWei(value);

			// Verify recipient is platform wallet
			if (to.toLowerCase() !== params.recipientAddress.toLowerCase()) {
				return {
					success: false,
					error: `Payment sent to wrong address. Expected: ${params.recipientAddress}, Got: ${to}`
				};
			}

			// Allow small rounding differences (0.01 USDT)
			if (Math.abs(amount - params.expectedAmount) > 0.01) {
				return {
					success: false,
					error: `This transfer sent ${amount} USDT, but ${params.expectedAmount} USDT were expected.`
				};
			}

			// Get confirmations
			const currentBlock = await this.provider.getBlockNumber();
			const confirmations = receipt.blockNumber ? currentBlock - receipt.blockNumber : 0;

			// Require minimum confirmations for security. The transfer is valid,
			// it just needs a few more blocks.
			if (confirmations < REQUIRED_CONFIRMATIONS) {
				return { success: false, pending: true, confirmations };
			}

			return {
				success: true,
				amount,
				from,
				confirmations
			};
		} catch (error) {
			console.error('Tether verify error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Transfer business portion from platform wallet to business wallet
	 * This happens after we receive payment and reservation is created
	 */
	async transferFromPlatform(params: {
		toAddress: string; // Business wallet
		amount: number; // Business amount (after fee)
	}): Promise<{
		success: boolean;
		txHash?: string;
		error?: string;
	}> {
		console.log('TetherService.transferFromPlatform:', params);

		if (this.isMockMode) {
			console.log(`[MOCK] Transferring ${params.amount} USDT to ${params.toAddress}`);
			return {
				success: true,
				txHash: '0xMOCK' + crypto.randomUUID().replace(/-/g, '')
			};
		}

		if (!this.contract || !this.provider) {
			return { success: false, error: 'Contract or provider not initialized' };
		}

		try {
			if (!this.platformWallet) {
				return {
					success: false,
					error: 'Platform wallet not configured'
				};
			}

			// Validate business address
			if (!ethers.isAddress(params.toAddress)) {
				return {
					success: false,
					error: 'Invalid business wallet address'
				};
			}

			const contractWithSigner = this.contract.connect(this.platformWallet) as Contract;

			// Check platform wallet balance
			const balance = await this.contract.balanceOf(this.platformWallet.address);
			const amountWei = this.toWei(params.amount);

			if (balance < amountWei) {
				return {
					success: false,
					error: `Insufficient platform balance. Have: ${this.fromWei(balance)}, Need: ${params.amount}`
				};
			}

			// Transfer to business wallet
			const tx = await contractWithSigner.transfer(params.toAddress, amountWei, {
				gasLimit: 100000 // Set reasonable gas limit for USDT transfer
			});

			console.log(`Transfer initiated: ${tx.hash}`);

			// Wait for confirmation
			const receipt = await tx.wait(1); // Wait for 1 confirmation

			if (!receipt || receipt.status !== 1) {
				return {
					success: false,
					error: 'Transaction failed'
				};
			}

			console.log(`Successfully transferred ${params.amount} USDT to ${params.toAddress}`);

			return {
				success: true,
				txHash: tx.hash
			};
		} catch (error) {
			console.error('Tether transfer error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Monitor a transaction until it gets enough confirmations
	 */
	async waitForConfirmations(
		txHash: string,
		requiredConfirmations: number = 12
	): Promise<{ success: boolean; confirmations?: number; error?: string }> {
		if (this.isMockMode) {
			return { success: true, confirmations: requiredConfirmations };
		}

		if (!this.provider) {
			return { success: false, error: 'Provider not initialized' };
		}

		try {
			const receipt = await this.provider.waitForTransaction(txHash, requiredConfirmations);

			if (!receipt) {
				return { success: false, error: 'Transaction not found' };
			}

			if (receipt.status !== 1) {
				return { success: false, error: 'Transaction failed' };
			}

			const currentBlock = await this.provider.getBlockNumber();
			const confirmations = receipt.blockNumber ? currentBlock - receipt.blockNumber : 0;

			return {
				success: true,
				confirmations
			};
		} catch (error) {
			console.error('Wait for confirmations error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Get platform wallet balance
	 */
	async getPlatformBalance(): Promise<{ success: boolean; balance?: number; error?: string }> {
		if (this.isMockMode) {
			return { success: true, balance: 10000 }; // Mock balance
		}

		if (!this.contract) {
			return { success: false, error: 'Contract not initialized' };
		}

		try {
			if (!this.platformWallet) {
				return { success: false, error: 'Platform wallet not configured' };
			}

			const balance = await this.contract.balanceOf(this.platformWallet.address);
			return {
				success: true,
				balance: this.fromWei(balance)
			};
		} catch (error) {
			console.error('Get balance error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}
