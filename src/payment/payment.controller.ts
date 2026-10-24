import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../database/prisma.service';

@Controller(['api/v1/payment', 'v1/payment'])
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create-order')
  async createOrder(@Body() body: { amount: number; receipt: string; serviceTitle?: string; serviceId?: string }) {
    let validatedAmount = Number(body.amount);

    // ponytail: authoritative service fee check from database
    if (body.serviceTitle || body.serviceId) {
      try {
        const svc = await this.prisma.service.findFirst({
          where: {
            OR: [
              ...(body.serviceId ? [{ id: body.serviceId }] : []),
              ...(body.serviceTitle ? [{ title: { equals: body.serviceTitle, mode: 'insensitive' as const } }] : []),
              ...(body.serviceId ? [{ slug: body.serviceId }] : []),
            ],
          },
        });
        if (svc && typeof svc.fee === 'number' && svc.fee >= 0) {
          validatedAmount = svc.fee;
        }
      } catch (svcErr) {
        // Fall back gracefully
      }
    }

    if (!validatedAmount && validatedAmount !== 0) {
      throw new BadRequestException('Amount is required');
    }
    
    const order = await this.paymentService.createOrder(validatedAmount, body.receipt || `rcpt_${Date.now()}`);
    
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() body: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    userId?: string;
  }) {
    if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      throw new BadRequestException('Missing payment verification details');
    }

    const isValid = this.paymentService.verifyPayment(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature
    );

    const result: {
      success: boolean;
      message: string;
      application?: any;
    } = {
      success: isValid,
      message: isValid ? 'Payment verified successfully' : 'Payment verification failed',
    };

    if (isValid && body.razorpayOrderId) {
      try {
        // ponytail: authoritative DB synchronization on payment verification
        await this.prisma.application.updateMany({
          where: { razorpayOrderId: body.razorpayOrderId },
          data: {
            paymentStatus: 'Success',
            razorpayPaymentId: body.razorpayPaymentId,
            updatedAt: new Date(),
          },
        });
        const isMongoId = (id?: string) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
        const where: any = { razorpayOrderId: body.razorpayOrderId };
        if (isMongoId(body.userId)) {
          where.userId = body.userId;
        }
        const application = await this.prisma.application.findFirst({
          where,
          orderBy: { submittedAt: 'desc' },
          select: {
            id: true,
            refNumber: true,
            status: true,
            serviceTitle: true,
            feePaid: true,
            paymentStatus: true,
            userId: true,
            submittedAt: true,
          },
        });
        if (application) {
          result.application = application;
        }
      } catch (_) {
        // Best-effort enrichment
      }
    }

    return result;
  }
}
