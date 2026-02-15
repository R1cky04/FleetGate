import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import {
  CancelContractDto,
  CompleteContractDto,
  ExtendContractDto,
  FilterContractDto,
  PreCloseContractDto,
  ReopenContractDto,
} from './dto/filter-contract.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/types';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createContractDto: CreateContractDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.contractsService.create(createContractDto, user.id);
  }

  @Get()
  findAll(@Query() filterDto: FilterContractDto, @CurrentUser() user: JwtUser) {
    return this.contractsService.findAll(filterDto, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.contractsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContractDto: UpdateContractDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.contractsService.update(id, updateContractDto, user.id);
  }

  @Post(':id/complete')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() completeDto: CompleteContractDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.contractsService.completeContract(id, completeDto, user.id);
  }

  @Post(':id/pre-close')
  preClose(
    @Param('id', ParseIntPipe) id: number,
    @Body() preCloseDto: PreCloseContractDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.contractsService.preCloseContract(id, preCloseDto, user.id);
  }

  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.contractsService.activateContract(id, user.id);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelDto: CancelContractDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.contractsService.cancelContract(id, cancelDto, user.id);
  }

  @Post(':id/extend')
  extend(
    @Param('id', ParseIntPipe) id: number,
    @Body() extendDto: ExtendContractDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.contractsService.extendContract(id, extendDto, user.id);
  }

  @Post(':id/reopen')
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Body() reopenDto: ReopenContractDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.contractsService.reopenContract(id, reopenDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.contractsService.remove(id, user.id);
  }
}
