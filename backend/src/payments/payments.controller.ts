import { Body, Controller, Get, Param, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/types';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@Query() filterDto: FilterPaymentDto, @CurrentUser() user: JwtUser) {
    return this.paymentsService.findAll(filterDto, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.paymentsService.findOne(id, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreatePaymentDto, @CurrentUser() user: JwtUser) {
    return this.paymentsService.create(createDto, user.id);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.CREATED)
  refund(
    @Param('id') id: string,
    @Body() refundDto: RefundPaymentDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.paymentsService.refund(id, refundDto, user.id);
  }
}
