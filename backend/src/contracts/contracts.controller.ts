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
import { CancelContractDto, CompleteContractDto, FilterContractDto } from './dto/filter-contract.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createContractDto: CreateContractDto) {
    // TODO: Get userId from JWT token
    const createdById = 1; // Temporary: replace with JWT user ID
    return this.contractsService.create(createContractDto, createdById);
  }

  @Get()
  findAll(@Query() filterDto: FilterContractDto) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.contractsService.findAll(filterDto, userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.contractsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.contractsService.update(id, updateContractDto, userId);
  }

  @Post(':id/complete')
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() completeDto: CompleteContractDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.contractsService.completeContract(id, completeDto, userId);
  }

  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.contractsService.activateContract(id, userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelDto: CancelContractDto,
  ) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.contractsService.cancelContract(id, cancelDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    // TODO: Get userId from JWT token
    const userId = 1; // Temporary: replace with JWT user ID
    return this.contractsService.remove(id, userId);
  }
}
