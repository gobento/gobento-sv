// src/lib/server/payments/tether.ts

import { ethers } from 'ethers';
import {
	TETHER_CONTRACT_ADDRESS,
	ETHEREUM_RPC_URL,
	FEE_TETHER_ADDRESS,
	TETHER_PRIVATE_KEY,
	MOCK_PAYMENTS
} from '$env/static/private';

// ERC-20 USDT ABI (simplified - only what we need)
const USDT_ABI = [
	'function transfer(address to, uint256 value) returns (bool)',
	'function balanceOf(address account) view returns (uint256)',
	'function decimals() view returns (uint8)',
	'function allowance(address owner, address spender) view returns (uint256)',
	'event Transfer(address indexed from, address indexed to, uint256 value)'
];

export class TetherService {
	private provider: ethers.JsonRpcProvider;
	private contract: ethers.Contract;

	constructor() {
		this.provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);
		this.contract = new ethers.Contract(TETHER_CONTRACT_ADDRESS, USDT_ABI, this.provider);
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
	 * Generate a payment request (user needs to send USDT to business wallet)
	 */
	async generatePaymentRequest(params: {
		businessWalletAddress: string;
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

		if (MOCK_PAYMENTS === 'true') {
			return {
				success: true,
				recipientAddress: params.businessWalletAddress,
				amount: params.amount.toString(),
				amountWei: this.toWei(params.amount).toString()
			};
		}

		try {
			// Validate address
			if (!ethers.isAddress(params.businessWalletAddress)) {
				return {
					success: false,
					error: 'Invalid recipient address'
				};
			}

			const amountWei = this.toWei(params.amount);

			return {
				success: true,
				recipientAddress: params.businessWalletAddress,
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
	 */
	async verifyPayment(params: {
		txHash: string;
		expectedAmount: number;
		recipientAddress: string;
	}): Promise<{
		success: boolean;
		amount?: number;
		from?: string;
		confirmations?: number;
		error?: string;
	}> {
		console.log('TetherService.verifyPayment:', params);

		if (MOCK_PAYMENTS === 'true') {
			if (params.txHash.startsWith('0xMOCK')) {
				return {
					success: true,
					amount: params.expectedAmount,
					from: '0x' + '0'.repeat(40),
					confirmations: 12
				};
			}
		}

		try {
			// Get transaction receipt
			const receipt = await this.provider.getTransactionReceipt(params.txHash);

			if (!receipt) {
				return {
					success: false,
					error: 'Transaction not found'
				};
			}

			// Parse transfer event from logs
			const iface = new ethers.Interface(USDT_ABI);
			let transferEvent = null;

			for (const log of receipt.logs) {
				try {
					const parsed = iface.parseLog({
						topics: [...log.topics],
						data: log.data
					});

					if (parsed?.name === 'Transfer') {
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
					error: 'No transfer event found in transaction'
				};
			}

			const to = transferEvent.args[1];
			const value = transferEvent.args[2];
			const amount = this.fromWei(value);

			// Verify recipient and amount
			if (to.toLowerCase() !== params.recipientAddress.toLowerCase()) {
				return {
					success: false,
					error: 'Payment sent to wrong address'
				};
			}

			// Allow small rounding differences (0.01 USDT)
			if (Math.abs(amount - params.expectedAmount) > 0.01) {
				return {
					success: false,
					error: `Amount mismatch. Expected: ${params.expectedAmount}, Got: ${amount}`
				};
			}

			// Get confirmations
			const currentBlock = await this.provider.getBlockNumber();
			const confirmations = receipt.blockNumber ? currentBlock - receipt.blockNumber : 0;

			return {
				success: true,
				amount,
				from: transferEvent.args[0],
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
	 * Transfer fee to platform wallet
	 * This should be called after payment verification
	 */
	async transferFee(params: {
		fromPrivateKey: string;
		amount: number; // Amount in USDT
	}): Promise<{
		success: boolean;
		txHash?: string;
		error?: string;
	}> {
		console.log('TetherService.transferFee:', params);

		if (MOCK_PAYMENTS === 'true') {
			console.log(`[MOCK] Would transfer fee: ${params.amount} USDT to platform`);
			return {
				success: true,
				txHash: '0xMOCK' + crypto.randomUUID().replace(/-/g, '')
			};
		}

		try {
			// Create wallet from private key
			const wallet = new ethers.Wallet(params.fromPrivateKey, this.provider);
			const contractWithSigner = this.contract.connect(wallet);

			// Check balance
			const balance = await this.contract.balanceOf(wallet.address);
			const amountWei = this.toWei(params.amount);

			if (balance < amountWei) {
				return {
					success: false,
					error: 'Insufficient balance'
				};
			}

			// Transfer fee to platform
			const tx = await contractWithSigner.transfer(FEE_TETHER_ADDRESS, amountWei);

			await tx.wait();

			return {
				success: true,
				txHash: tx.hash
			};
		} catch (error) {
			console.error('Tether fee transfer error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Calculate fee split (90% to business, 10% to platform)
	 */
	static calculateSplit(amount: number): {
		businessAmount: number;
		feeAmount: number;
	} {
		// Round to 2 decimal places for USDT
		const feeAmount = Math.round(amount * 0.1 * 100) / 100;
		const businessAmount = Math.round((amount - feeAmount) * 100) / 100;

		return {
			businessAmount,
			feeAmount
		};
	}

	/**
	 * Monitor a transaction until it gets enough confirmations
	 */
	async waitForConfirmations(
		txHash: string,
		requiredConfirmations: number = 12
	): Promise<{ success: boolean; confirmations?: number; error?: string }> {
		if (MOCK_PAYMENTS === 'true') {
			return { success: true, confirmations: requiredConfirmations };
		}

		try {
			const receipt = await this.provider.waitForTransaction(txHash, requiredConfirmations);

			if (!receipt) {
				return { success: false, error: 'Transaction not found' };
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
}
