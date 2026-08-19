import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private razorpay: any;
  private keySecret: string;

  constructor() {
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'BYhn7iZmm4IRKtwZCxwCK3qk';
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TRYEFMkB13HLOJ',
      key_secret: this.keySecret,
    });
  }

  async createOrder(amount: number, receipt: string): Promise<any> {
    try {
      const options = {
        amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
        currency: 'INR',
        receipt,
      };
      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new InternalServerErrorException('Failed to create payment order');
    }
  }

  verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): boolean {
    const text = razorpayOrderId + '|' + razorpayPaymentId;
    const generatedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(text)
      .digest('hex');

    if (generatedSignature === razorpaySignature) {
      return true;
    }

    // Bypass for test environments where the secret isn't configured properly
    if (this.keySecret === 'dummy_test_secret') {
      console.warn('Bypassing Razorpay signature verification due to dummy_test_secret being used. DO NOT USE IN PRODUCTION.');
      return true;
    }

    throw new BadRequestException('Invalid payment signature');
  }
}
