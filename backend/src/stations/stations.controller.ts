import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/types';

@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createStationDto: CreateStationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.stationsService.create(createStationDto, user.id);
  }

  @Get()
  findAll(
    @Query('isActive') isActive?: string,
    @Query('isFictitious') isFictitious?: string,
    @Query('city') city?: string,
  ) {
    return this.stationsService.findAll({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isFictitious: isFictitious === 'true' ? true : isFictitious === 'false' ? false : undefined,
      city,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stationsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStationDto: UpdateStationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.stationsService.update(id, updateStationDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.stationsService.remove(id, user.id);
  }
}
