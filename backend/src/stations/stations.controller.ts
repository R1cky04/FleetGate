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
} from '@nestjs/common';
import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';

@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createStationDto: CreateStationDto) {
    // TODO: Pegar userId do JWT token
    const createdById = 1; // Temporary: replace with JWT user ID
    return this.stationsService.create(createStationDto, createdById);
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
  findOne(@Param('id') id: string) {
    return this.stationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStationDto: UpdateStationDto) {
    // TODO: Pegar userId do JWT token
    const updatedById = 1; // Temporary: replace with JWT user ID
    return this.stationsService.update(id, updateStationDto, updatedById);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    // TODO: Pegar userId do JWT token
    const deletedById = 1; // Temporary: replace with JWT user ID
    return this.stationsService.remove(id, deletedById);
  }
}
