import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('v1/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  async createOrder(@Body() body: { amount: number; receipt: string }) {
    if (!body.amount) {
      throw new BadRequestException('Amount is required');
    }
    
    const order = await this.paymentService.createOrder(body.amount, body.receipt || `rcpt_${Date.now()}`);
    
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verifyPayment(@Body() body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      throw new BadRequestException('Missing payment verification details');
    }

    const isValid = this.paymentService.verifyPayment(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature
    );

    return {
      success: isValid,
      message: isValid ? 'Payment verified successfully' : 'Payment verification failed',
    };
  }
}
